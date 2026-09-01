// 👤 รับผิดชอบโดย: กัญจน์
// ระบบจัดการคลังยาและประวัติเวชภัณฑ์

import { supabase } from '@/lib/supabase';
import type { Medication, InventoryLog, InventoryAction } from '@/types/database';

// --- Medications (Stock) ---
export async function getMedications(activeOnly = true): Promise<Medication[]> {
  let query = supabase.from('medications').select('*').order('name');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getMedicationById(id: string): Promise<Medication | null> {
  const { data, error } = await supabase.from('medications').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createMedication(med: Omit<Medication, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('medications').insert(med).select().single();
  if (error) throw error;
  return data;
}

export async function updateMedication(id: string, updates: Partial<Medication>) {
  const { data, error } = await supabase
    .from('medications')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getLowStockMedications(threshold?: number): Promise<Medication[]> {
  // Get medications where stock <= min_stock
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('is_active', true)
    .filter('stock', 'lte', threshold ?? 'min_stock');
  if (error) throw error;
  return data ?? [];
}

// --- Inventory Logs ---
export async function getInventoryLogs(medicationId?: string): Promise<InventoryLog[]> {
  let query = supabase
    .from('inventory_logs')
    .select('*, medication:medications(name), pharmacist:profiles(full_name)')
    .order('created_at', { ascending: false });

  if (medicationId) {
    query = query.eq('medication_id', medicationId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createInventoryLog(
  medicationId: string,
  pharmacistId: string,
  action: InventoryAction,
  quantity: number,
  reason?: string
) {
  const { data, error } = await supabase
    .from('inventory_logs')
    .insert({
      medication_id: medicationId,
      pharmacist_id: pharmacistId,
      action,
      quantity,
      reason: reason || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
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
