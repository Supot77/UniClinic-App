import type { Medication, MedicationProcurement } from '@/types/database';

export type ProcurementDraft = Pick<MedicationProcurement,
  'medication_id' | 'medication_name' | 'order_number' | 'supplier' | 'package_breakdown' |
  'total_units' | 'unit' | 'ordered_at' | 'notes'>;

export interface ReceiveProcurement {
  procurementId: string;
  medicationId: string | null;
  quantity: number;
  lotNumber: string | null;
  expiryDate: string | null;
  mfgDate: string | null;
  notes: string | null;
  newMedication: Pick<Medication, 'name' | 'type' | 'category' | 'unit' | 'dosage' |
    'brand_name' | 'coverage_type' | 'manufacturer' | 'min_stock'> | null;
}

export interface ProcurementRepository {
  list(): Promise<MedicationProcurement[]>;
  create(order: ProcurementDraft & { id: string }): Promise<void>;
  update(id: string, order: ProcurementDraft): Promise<void>;
  remove(id: string): Promise<void>;
  receive(input: ReceiveProcurement): Promise<void>;
  correct(id: string, expectedUpdatedAt: string, quantity: number, reason: string, details: Pick<ProcurementDraft, 'order_number' | 'supplier' | 'ordered_at' | 'notes'>): Promise<void>;
  cancelReceipt(id: string, expectedUpdatedAt: string, reason: string): Promise<void>;
}

export function validateProcurementDraft(input: ProcurementDraft): void {
  if (!input.medication_name.trim() || !input.unit.trim() || !Number.isInteger(input.total_units)
    || input.total_units <= 0 || input.total_units > 2147483647) throw new Error('ข้อมูลใบสั่งซื้อไม่ถูกต้อง');
  for (const [key, value] of Object.entries(input.package_breakdown ?? {})) {
    if (key !== 'package_type_note' && value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 0)) {
      throw new Error('จำนวนบรรจุต้องเป็นจำนวนเต็มไม่ติดลบ');
    }
  }
}

export function validateReceipt(input: ReceiveProcurement): void {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0 || input.quantity > 2147483647) {
    throw new Error('จำนวนรับเข้าต้องเป็นจำนวนเต็มบวก');
  }
  if (Boolean(input.medicationId) === Boolean(input.newMedication)) {
    throw new Error('เลือกรวมยาเดิมหรือสร้างยาใหม่อย่างใดอย่างหนึ่ง');
  }
  if (input.mfgDate && input.expiryDate && input.mfgDate > input.expiryDate) {
    throw new Error('วันผลิตต้องไม่เกินวันหมดอายุ');
  }
  const draft = input.newMedication;
  if (draft && (!draft.name.trim() || !draft.type.trim() || !draft.category.trim() || !draft.unit?.trim()
    || !Number.isInteger(draft.min_stock) || draft.min_stock < 0 || !['covered', 'non_covered'].includes(draft.coverage_type ?? ''))) {
    throw new Error('ข้อมูลยาใหม่ไม่ถูกต้อง');
  }
}
