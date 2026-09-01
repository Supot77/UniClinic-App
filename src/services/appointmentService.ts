// 👤 รับผิดชอบโดย: ปาย
// ระบบนัดหมายและประวัติการรักษา

import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentWithDetails, MedicalRecord, AppointmentStatus } from '@/types/database';

export async function getAppointments(userId: string): Promise<AppointmentWithDetails[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      slot:appointment_slots(
        *,
        doctor:doctors(
          *,
          profile:profiles(full_name, avatar_url),
          department:departments(name)
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTodaysQueue(doctorId?: string): Promise<AppointmentWithDetails[]> {
  const today = new Date().toISOString().split('T')[0];
  let query = supabase
    .from('appointments')
    .select(`
      *,
      slot:appointment_slots!inner(*),
      patient:profiles!appointments_user_id_fkey(full_name, phone, student_id)
    `)
    .eq('slot.slot_date', today)
    .order('queue_number');

  if (doctorId) {
    query = query.eq('slot.doctor_id', doctorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AppointmentWithDetails[];
}

export async function createAppointment(userId: string, slotId: string, reason?: string) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      slot_id: slotId,
      reason: reason || null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelAppointment(id: string) {
  return updateAppointmentStatus(id, 'cancelled');
}

// --- Medical Records ---
export async function createMedicalRecord(record: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('medical_records')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMedicalRecords(patientId: string) {
  const { data, error } = await supabase
    .from('medical_records')
    .select(`
      *,
      doctor:doctors(*, profile:profiles(full_name)),
      appointment:appointments(*, slot:appointment_slots(slot_date, start_time))
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
