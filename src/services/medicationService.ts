// 👤 รับผิดชอบโดย: กัญจน์
// ระบบจัดการคลังยาและประวัติเวชภัณฑ์

import { apiClient } from '@/lib/api-client';
import type { Medication, InventoryLog, InventoryAction } from '@/types/database';

// --- Medications (Stock) ---
export async function getMedications(activeOnly = true): Promise<Medication[]> {
  return apiClient<Medication[]>(`/api/medications?activeOnly=${activeOnly}`);
}

export async function getMedicationById(id: string): Promise<Medication | null> {
  return apiClient<Medication>(`/api/medications/${id}`);
}

export async function createMedication(med: Omit<Medication, 'id' | 'created_at' | 'updated_at'>) {
  return apiClient<Medication>('/api/medications', { method: 'POST', body: JSON.stringify(med) });
}

export async function updateMedication(id: string, updates: Partial<Medication>) {
  return apiClient<Medication>(`/api/medications/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function getLowStockMedications(threshold?: number): Promise<Medication[]> {
  const medications = await getMedications(true);
  return medications.filter((medication) => medication.stock <= (threshold ?? medication.min_stock));
}

// --- Inventory Logs ---
export async function getInventoryLogs(medicationId?: string): Promise<InventoryLog[]> {
  const params = medicationId ? `?medicationId=${encodeURIComponent(medicationId)}` : '';
  return apiClient<InventoryLog[]>(`/api/medications/inventory${params}`);
}

export async function createInventoryLog(
  medicationId: string,
  pharmacistId: string,
  action: InventoryAction,
  quantity: number,
  reason?: string
) {
  return apiClient<InventoryLog>('/api/medications/inventory', { method: 'POST', body: JSON.stringify({ medicationId, pharmacistId, action, quantity, reason }) });
}

// --- Dispense (จ่ายยา + ตัดสต๊อก) ---
export async function dispenseMedication(
  medicationId: string,
  pharmacistId: string,
  quantity: number,
  reason?: string
) {
  // 1. Get current stock
  const med = await getMedicationById(medicationId);
  if (!med) throw new Error('Medication not found');
  if (med.stock < quantity) throw new Error('Insufficient stock');

  // 2. Update stock
  await updateMedication(medicationId, { stock: med.stock - quantity });

  // 3. Log the dispense
  return createInventoryLog(medicationId, pharmacistId, 'dispense', quantity, reason);
}
