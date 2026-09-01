// 👤 รับผิดชอบโดย: กลอง
// ระบบแจ้งเตือนการกินยาส่วนบุคคล

import { supabase } from '@/lib/supabase';
import type { MedicationReminder, MedicationLog, MedicationReminderWithMedication } from '@/types/database';

// --- Medication Reminders ---
export async function getReminders(userId: string): Promise<MedicationReminderWithMedication[]> {
  const { data, error } = await supabase
    .from('medication_reminders')
    .select('*, medication:medications(name, type, description)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createReminder(reminder: Pick<MedicationReminder, 'user_id' | 'medication_id' | 'reminder_times' | 'start_date' | 'end_date'>) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .insert({ ...reminder, status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReminder(id: string, updates: Partial<MedicationReminder>) {
  const { data, error } = await supabase
    .from('medication_reminders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function pauseReminder(id: string) {
  return updateReminder(id, { status: 'paused' });
}

export async function resumeReminder(id: string) {
  return updateReminder(id, { status: 'active' });
}

export async function completeReminder(id: string) {
  return updateReminder(id, { status: 'completed' });
}

// --- Medication Logs ---
export async function getMedicationLogs(reminderId: string): Promise<MedicationLog[]> {
  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('scheduled_datetime', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function logMedicationTaken(reminderId: string, scheduledDatetime: string) {
  const { data, error } = await supabase
    .from('medication_logs')
    .upsert({
      reminder_id: reminderId,
      scheduled_datetime: scheduledDatetime,
      actual_datetime: new Date().toISOString(),
      status: 'taken',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function logMedicationMissed(reminderId: string, scheduledDatetime: string) {
  const { data, error } = await supabase
    .from('medication_logs')
    .upsert({
      reminder_id: reminderId,
      scheduled_datetime: scheduledDatetime,
      status: 'missed',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
