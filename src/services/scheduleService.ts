// 👤 รับผิดชอบโดย: ช้อป
// ระบบจัดการแผนกและตารางเวลาแพทย์

import { supabase } from '@/lib/supabase';
import type { Department, Doctor, AppointmentSlot, DoctorWithProfile } from '@/types/database';

// --- Departments ---
export async function getDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createDepartment(department: Pick<Department, 'name' | 'description'>) {
  const { data, error } = await supabase.from('departments').insert(department).select().single();
  if (error) throw error;
  return data;
}

export async function updateDepartment(id: string, updates: Partial<Department>) {
  const { data, error } = await supabase
    .from('departments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw error;
}

// --- Doctors ---
export async function getDoctors(): Promise<DoctorWithProfile[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*, profile:profiles(*), department:departments(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// --- Appointment Slots ---
export async function getSlotsByDoctor(doctorId: string, date?: string): Promise<AppointmentSlot[]> {
  let query = supabase
    .from('appointment_slots')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('slot_date')
    .order('start_time');

  if (date) {
    query = query.eq('slot_date', date);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createSlot(slot: Pick<AppointmentSlot, 'doctor_id' | 'slot_date' | 'start_time' | 'end_time' | 'max_capacity'>) {
  const { data, error } = await supabase.from('appointment_slots').insert(slot).select().single();
  if (error) throw error;
  return data;
}

export async function updateSlot(id: string, updates: Partial<AppointmentSlot>) {
  const { data, error } = await supabase
    .from('appointment_slots')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
