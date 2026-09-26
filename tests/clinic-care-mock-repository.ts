import {
  allowedActions,
  bangkokDate,
  bangkokTime,
  isSlotArrived,
  recordInputSchema,
  recordUpdateInputSchema,
  type ClinicRepository,
  type ClinicRole,
  type ClinicSnapshot,
} from '@/features/clinic-care';

export function createClinicMockRepository(seed: ClinicSnapshot, now = new Date('2026-09-08T08:00:00+07:00')): ClinicRepository {
  const state = structuredClone(seed);
  let sequence = 100;
  const id = () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`;
  const ownAppointment = (appointment: ClinicSnapshot['appointments'][number]) => state.actor.role === 'staff_admin' ||
    (state.actor.role === 'patient' ? appointment.user_id === state.actor.id : state.slots.some((slot) => slot.id === appointment.slot_id && slot.doctor_id === state.actor.id));
  function requireRole(role: ClinicRole) { if (state.actor.role !== role) throw new Error('ไม่มีสิทธิ์ทำรายการนี้'); }
  return {
    async load() {
      const result = structuredClone(state);
      result.appointments = result.appointments.filter(ownAppointment);
      result.records = result.records.filter((record) => state.actor.role === 'patient' ? record.patient_id === state.actor.id && record.completed :
        state.actor.role === 'medical' && (record.doctor_id === state.actor.id || (record.completed && result.appointments.some((appointment) => appointment.user_id === record.patient_id && ['confirmed', 'in_progress', 'completed'].includes(appointment.status)))));
      if (state.actor.role !== 'medical') result.medications = [];
      return result;
    },
    async book(slotId, reason) {
      requireRole('patient');
      if (!reason.trim() || reason.trim().length > 2000) throw new Error('กรุณากรอกอาการหรือเหตุผลไม่เกิน 2000 ตัวอักษร');
      const slot = state.slots.find((item) => item.id === slotId);
      if (!slot || !slot.bookable || slot.status !== 'available' || new Date(`${slot.slot_date}T${slot.start_time}+07:00`) <= now) throw new Error('รอบตรวจนี้ไม่เปิดรับจอง');
      const active = state.appointments.filter((appointment) => appointment.slot_id === slotId && !['cancelled', 'rejected', 'no_show'].includes(appointment.status));
      if (active.some((appointment) => appointment.user_id === state.actor.id)) throw new Error('มีนัดในรอบนี้แล้ว');
      const occupied = Math.max(slot.booked_count, active.length);
      if (occupied >= slot.max_capacity) throw new Error('รอบตรวจเต็มแล้ว');
      const queue = Math.max(0, ...state.appointments.filter((appointment) => appointment.slot_id === slotId).map((appointment) => appointment.queue_number ?? 0)) + 1;
      state.appointments.push({ id: id(), user_id: state.actor.id, patient: 'ผู้ป่วยทดสอบ', slot_id: slotId, queue_number: queue, reason: reason.trim(), status: 'pending', cancel_requested_at: null, rejection_reason: null, has_record: false });
      slot.booked_count = occupied + 1;
    },
    async transition(appointmentId, action, reason) {
      const appointment = state.appointments.find((item) => item.id === appointmentId);
      const slot = appointment ? state.slots.find((item) => item.id === appointment.slot_id) : undefined;
      if (action === 'in_progress' && slot && !isSlotArrived(slot.slot_date, slot.start_time, bangkokDate(now), bangkokTime(now))) throw new Error('ยังไม่ถึงเวลารอบตรวจ');
      if (!appointment || !ownAppointment(appointment) || !allowedActions(state.actor.role, appointment, slot, bangkokDate(now), bangkokTime(now)).includes(action)) throw new Error('ไม่มีสิทธิ์หรือสถานะไม่อนุญาต');
      if (action === 'rejected' && !reason?.trim()) throw new Error('กรุณาระบุเหตุผลการปฏิเสธ');
      if (action === 'request_cancel') appointment.cancel_requested_at = now.toISOString();
      else {
        appointment.status = action;
        if (action === 'rejected') appointment.rejection_reason = reason!.trim();
        if (action === 'cancelled' || action === 'rejected') {
          const appointmentSlot = state.slots.find((item) => item.id === appointment.slot_id)!;
          appointmentSlot.booked_count = Math.max(0, appointmentSlot.booked_count - 1);
        }
        if (action === 'completed') state.records.filter((record) => record.appointment_id === appointment.id).forEach((record) => { record.completed = true; });
      }
    },
    async saveRecord(input) {
      requireRole('medical');
      const parsed = recordInputSchema.parse(input);
      const appointment = state.appointments.find((item) => item.id === parsed.appointmentId);
      if (!appointment || !ownAppointment(appointment) || appointment.status !== 'in_progress' || appointment.has_record) throw new Error('ต้องเป็นนัดของตนที่กำลังตรวจและยังไม่มีผลตรวจ');
      const items = parsed.prescriptions.map((prescription) => {
        const medication = state.medications.find((item) => item.id === prescription.medication_id);
        if (!medication) throw new Error('ไม่พบยาหรือยาถูกปิดใช้งาน');
        return { ...prescription, name: medication.name };
      });
      state.records.push({ id: id(), appointment_id: appointment.id, patient_id: appointment.user_id, doctor_id: state.actor.id,
        patient: appointment.patient, doctor: 'แพทย์ทดสอบ', diagnosis: parsed.diagnosis, treatment_notes: parsed.advice,
        prescribed_medications: items, created_at: now.toISOString(), completed: parsed.complete,
        height_cm: parsed.height_cm, weight_kg: parsed.weight_kg, blood_pressure: parsed.blood_pressure, pulse_bpm: parsed.pulse_bpm });
      appointment.has_record = true;
      if (parsed.complete) appointment.status = 'completed';
    },
    async updateRecord(input) {
      requireRole('medical');
      const parsed = recordUpdateInputSchema.parse(input);
      const record = state.records.find((item) => item.id === parsed.recordId);
      if (!record || record.doctor_id !== state.actor.id) throw new Error('เฉพาะแพทย์เจ้าของเคสเท่านั้นที่แก้ไขผลตรวจได้');
      if (now.getTime() >= new Date(record.created_at).getTime() + 15 * 60 * 1000) throw new Error('หมดเวลาแก้ไขผลตรวจแล้ว');
      const items = parsed.prescriptions.map((prescription) => {
        const medication = state.medications.find((item) => item.id === prescription.medication_id);
        if (!medication) throw new Error('ไม่พบยาหรือยาถูกปิดใช้งาน');
        return { ...prescription, name: medication.name };
      });
      Object.assign(record, {
        diagnosis: parsed.diagnosis,
        treatment_notes: parsed.advice,
        prescribed_medications: items,
        height_cm: parsed.height_cm,
        weight_kg: parsed.weight_kg,
        blood_pressure: parsed.blood_pressure,
        pulse_bpm: parsed.pulse_bpm,
      });
    },
  };
}
