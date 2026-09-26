// Explicit test dependency only; never imported by the production service.
import type { Medication, MedicationProcurement, UserRole } from '@/types/database';
import type { ProcurementRepository } from './procurementRepository';
import { validateProcurementDraft, validateReceipt } from './procurementRepository';

export function createMockProcurementRepository(options: {
  orders: MedicationProcurement[];
  medications: Medication[];
  actor: { id: string; role: UserRole; active: boolean };
  now: () => string;
  newId: () => string;
}): ProcurementRepository & { inventoryLogs: { medicationId: string; quantity: number; actorId: string }[] } {
  const inventoryLogs: { medicationId: string; quantity: number; actorId: string }[] = [];
  const checkAccess = (write = true) => {
    if (!options.actor.active || (write ? options.actor.role !== 'medical' : options.actor.role === 'patient')) {
      throw new Error('ไม่มีสิทธิ์ทำรายการนี้');
    }
  };
  const pending = (id: string) => {
    checkAccess();
    const order = options.orders.find((item) => item.id === id);
    if (!order || order.status !== 'pending') throw new Error('รายการนี้ถูกนำเข้าหรือลบแล้ว กรุณาโหลดใหม่');
    return order;
  };
  const correct = (id: string, expectedUpdatedAt: string, quantity: number, reason: string, cancel: boolean) => {
    checkAccess();
    const order = options.orders.find((item) => item.id === id);
    if (!order || order.status !== 'imported') throw new Error('รายการนี้ไม่ได้อยู่ในสถานะนำเข้าแล้ว');
    if (order.updated_at !== expectedUpdatedAt) throw new Error('รายการถูกแก้ไขแล้ว กรุณาโหลดใหม่');
    if (!reason.trim() || reason.trim().length > 1000) throw new Error('กรุณาระบุเหตุผลไม่เกิน 1000 ตัวอักษร');
    if (!Number.isInteger(quantity) || (!cancel && quantity <= 0)) throw new Error('จำนวนรับเข้าต้องเป็นจำนวนเต็มบวก');
    const med = options.medications.find((item) => item.id === order.medication_id);
    if (!med) throw new Error('ไม่พบยาในคลัง');
    const delta = (cancel ? 0 : quantity) - (order.received_units ?? order.total_units);
    if (med.stock + delta < 0) throw new Error('สต็อกคงเหลือไม่พอสำหรับย้อนยอดรับเข้า');
    med.stock += delta;
    if (delta) inventoryLogs.push({ medicationId: med.id, quantity: delta, actorId: options.actor.id });
    order.status = cancel ? 'cancelled' : 'imported';
    if (!cancel) order.received_units = quantity;
    order.updated_at = options.now();
    return order;
  };
  return {
    inventoryLogs,
    async correct(id, expectedUpdatedAt, quantity, reason, details) {
      Object.assign(correct(id, expectedUpdatedAt, quantity, reason, false), details);
    },
    async cancelReceipt(id, expectedUpdatedAt, reason) {
      correct(id, expectedUpdatedAt, 0, reason, true);
    },
    async list() {
      checkAccess(false);
      return structuredClone(options.orders).sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
    },
    async create(input) {
      checkAccess();
      validateProcurementDraft(input);
      if (options.orders.some((order) => order.id === input.id)) throw new Error('ใบสั่งซื้อซ้ำ');
      options.orders.push({ ...structuredClone(input), status: 'pending', created_by: options.actor.id,
        created_at: options.now(), updated_at: options.now() });
    },
    async update(id, input) {
      const order = pending(id);
      validateProcurementDraft(input);
      Object.assign(order, structuredClone(input), { updated_at: options.now() });
    },
    async remove(id) {
      const order = pending(id);
      options.orders.splice(options.orders.indexOf(order), 1);
    },
    async receive(input) {
      validateReceipt(input);
      const order = pending(input.procurementId);
      let medication = options.medications.find((med) => med.id === input.medicationId);
      if (input.newMedication) {
        const draft = input.newMedication;
        medication = { ...draft, id: options.newId(), stock: 0, is_active: true,
          description: null, ingredients: null, expiry_date: input.expiryDate, mfg_date: input.mfgDate,
          created_at: options.now(), updated_at: options.now() };
      }
      if (!medication?.is_active) throw new Error('ไม่พบยาที่เปิดใช้งาน');
      if (medication.unit !== order.unit) throw new Error('หน่วยรับเข้าไม่ตรงกับหน่วยยาในคลัง');
      if (medication.stock + input.quantity > 2147483647) throw new Error('จำนวนสต็อกเกินขอบเขต');
      // Commit only after every validation succeeds; no async gap between state writes.
      if (input.newMedication) options.medications.push(medication);
      medication.stock += input.quantity;
      if (input.expiryDate && (!medication.expiry_date || input.expiryDate < medication.expiry_date)) {
        medication.expiry_date = input.expiryDate;
      }
      medication.updated_at = options.now();
      inventoryLogs.push({ medicationId: medication.id, quantity: input.quantity, actorId: options.actor.id });
      Object.assign(order, { status: 'imported', medication_id: medication.id, received_units: input.quantity,
        imported_at: options.now(), imported_by: options.actor.id, updated_at: options.now(),
        lot_number: input.lotNumber, expiry_date: input.expiryDate, mfg_date: input.mfgDate,
        notes: input.notes ?? order.notes });
    },
  };
}
