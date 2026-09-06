import type { AppointmentStatus, InventoryAction, Medication, MedicationReminderStatus } from '@/types/database';
import { ClinicMockDatabase, mockResult } from './engine';

export function createClinicRepositories(database: ClinicMockDatabase) {
  return {
    profiles: {
      list: () => database.select('profiles'),
      getById: (id: string) => database.findById('profiles', id),
      update: (id: string, changes: Parameters<typeof database.updateById<'profiles'>>[2]) => database.updateById('profiles', id, changes),
    },
    schedules: {
      listDepartments: () => database.select('departments'),
      listDoctors: () => database.select('doctors'),
      listSlots: () => database.select('appointment_slots'),
    },
    appointments: {
      list: () => database.select('appointments'),
      listWithDetails: async (patientId?: string) => {
        const tables = database.snapshot();
        const data = tables.appointments
          .filter((item) => !patientId || item.user_id === patientId)
          .map((appointment) => {
            const slot = tables.appointment_slots.find((item) => item.id === appointment.slot_id);
            const doctor = slot && tables.doctors.find((item) => item.id === slot.doctor_id);
            return {
              ...appointment,
              patient: tables.profiles.find((item) => item.id === appointment.user_id),
              slot: slot && {
                ...slot,
                doctor: doctor && {
                  ...doctor,
                  profile: tables.profiles.find((item) => item.id === doctor.id),
                  department: tables.departments.find((item) => item.id === doctor.department_id),
                },
              },
            };
          })
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        return mockResult.ok(data);
      },
      updateStatus: (id: string, status: AppointmentStatus) => database.updateById('appointments', id, { status, updated_at: new Date().toISOString() }),
    },
    records: {
      list: () => database.select('medical_records'),
      listWithDetails: async (patientId?: string) => {
        const tables = database.snapshot();
        return mockResult.ok(tables.medical_records
          .filter((item) => !patientId || item.patient_id === patientId)
          .map((record) => ({
            ...record,
            patient: tables.profiles.find((item) => item.id === record.patient_id),
            appointment: tables.appointments.find((item) => item.id === record.appointment_id),
            doctor: {
              ...tables.doctors.find((item) => item.id === record.doctor_id)!,
              profile: tables.profiles.find((item) => item.id === record.doctor_id),
            },
          })));
      },
    },
    pharmacy: {
      listMedications: async () => {
        const result = await database.select('medications');
        return result.error ? result : mockResult.ok(result.data.filter((item) => item.is_active));
      },
      listInventoryLogs: () => database.select('inventory_logs'),
      saveMedication: async (input: Pick<Medication, 'name' | 'type' | 'category' | 'stock' | 'min_stock' | 'expiry_date'>, id?: string) => {
        if (!input.name.trim() || !input.category.trim() || input.stock < 0 || input.min_stock < 0) {
          return mockResult.fail<Medication>('ข้อมูลยาไม่ถูกต้อง', '23514');
        }
        if (id) return database.updateById('medications', id, { ...input, updated_at: new Date().toISOString() });
        const revision = database.getRevision();
        return database.transaction(revision, (draft) => {
          if (draft.medications.some((item) => item.name.toLowerCase() === input.name.toLowerCase())) {
            return mockResult.fail<Medication>('ชื่อยานี้มีอยู่แล้ว', '23505');
          }
          const medication: Medication = {
            ...input,
            id: crypto.randomUUID(),
            description: null,
            ingredients: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          draft.medications.push(medication);
          return mockResult.ok(medication);
        });
      },
      deleteMedication: async (id: string) => {
        const revision = database.getRevision();
        return database.transaction(revision, (draft) => {
          const medication = draft.medications.find((item) => item.id === id);
          if (!medication) return mockResult.fail<'deleted' | 'disabled'>('ไม่พบยา', 'PGRST116');
          const referenced = draft.inventory_logs.some((item) => item.medication_id === id)
            || draft.medication_reminders.some((item) => item.medication_id === id)
            || draft.medical_records.some((record) => record.prescribed_medications?.some((item) => item.medication_id === id));
          if (referenced) {
            medication.is_active = false;
            medication.updated_at = new Date().toISOString();
            return mockResult.ok<'deleted' | 'disabled'>('disabled');
          }
          draft.medications = draft.medications.filter((item) => item.id !== id);
          return mockResult.ok<'deleted' | 'disabled'>('deleted');
        });
      },
      adjustStock: async (medicationId: string, pharmacistId: string, action: InventoryAction, quantity: number, reason: string | null = null) => {
        const revision = database.getRevision();
        return database.transaction(revision, (draft) => {
          const medication = draft.medications.find((item) => item.id === medicationId);
          if (!medication) return mockResult.fail('ไม่พบยา', '23503');
          const delta = action === 'add' ? quantity : -quantity;
          if (!Number.isInteger(quantity) || quantity <= 0 || medication.stock + delta < 0) return mockResult.fail('จำนวนสต๊อกไม่ถูกต้อง', '23514');
          medication.stock += delta;
          medication.updated_at = new Date().toISOString();
          draft.inventory_logs.push({ id: crypto.randomUUID(), medication_id: medicationId, pharmacist_id: pharmacistId, action, quantity, reason, created_at: new Date().toISOString() });
          return mockResult.ok(medication);
        });
      },
    },
    reminders: {
      list: () => database.select('medication_reminders'),
      listWithMedication: async (userId?: string) => {
        const tables = database.snapshot();
        return mockResult.ok(tables.medication_reminders
          .filter((item) => !userId || item.user_id === userId)
          .map((reminder) => ({
            ...reminder,
            medication: tables.medications.find((item) => item.id === reminder.medication_id),
            logs: tables.medication_logs.filter((item) => item.reminder_id === reminder.id),
          })));
      },
      listLogs: () => database.select('medication_logs'),
      updateStatus: (id: string, status: MedicationReminderStatus) => database.updateById('medication_reminders', id, { status, updated_at: new Date().toISOString() }),
    },
    notifications: {
      list: () => database.select('notifications'),
      listInbox: async (userId: string) => {
        const tables = database.snapshot();
        return mockResult.ok(tables.notifications
          .filter((item) => item.user_id === userId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at)));
      },
      markRead: (id: string) => database.updateById('notifications', id, { is_read: true }),
    },
    dashboard: {
      getSummary: async () => {
        const tables = database.snapshot();
        const today = '2026-09-05';
        const todaySlotIds = new Set(tables.appointment_slots.filter((item) => item.slot_date === today).map((item) => item.id));
        const todayAppointments = tables.appointments.filter((item) => todaySlotIds.has(item.slot_id));
        return mockResult.ok({
          todayAppointments: todayAppointments.length,
          patients: tables.profiles.filter((item) => item.role === 'patient').length,
          unreadNotifications: tables.notifications.filter((item) => !item.is_read).length,
          lowStockMedications: tables.medications.filter((item) => item.is_active && item.stock <= item.min_stock).length,
          expiredMedications: tables.medications.filter((item) => item.expiry_date && item.expiry_date < today).length,
          appointmentStatuses: {
            pending: todayAppointments.filter((item) => item.status === 'pending').length,
            confirmed: todayAppointments.filter((item) => item.status === 'confirmed').length,
            in_progress: todayAppointments.filter((item) => item.status === 'in_progress').length,
            completed: todayAppointments.filter((item) => item.status === 'completed').length,
          },
        });
      },
    },
  };
}

export type ClinicRepositories = ReturnType<typeof createClinicRepositories>;
