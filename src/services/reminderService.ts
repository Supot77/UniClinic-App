import { apiClient } from '@/lib/api-client';
import type { Medication, MedicationReminder, MedicationLog, MedicationReminderWithMedication, PrescribedMedication, MedicalRecord } from '@/types/database';

// --- Medication Reminders ---
export async function getReminders(userId?: string): Promise<MedicationReminderWithMedication[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiClient<MedicationReminderWithMedication[]>(`/api/reminders${query}`);
}

export async function getAvailableMedications(): Promise<Medication[]> {
  return apiClient<Medication[]>('/api/medications?activeOnly=true');
}

export async function getPatientPrescribedMedications(patientId: string): Promise<PrescribedMedication[]> {
  const records = await apiClient<MedicalRecord[]>(`/api/medical-records?patientId=${encodeURIComponent(patientId)}`);
  const meds: PrescribedMedication[] = [];
  for (const r of records || []) {
    if (Array.isArray(r.prescribed_medications)) {
      meds.push(...r.prescribed_medications);
    }
  }
  return meds;
}

export async function getPatientMedicalRecords(patientId?: string): Promise<MedicalRecord[]> {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  const records = await apiClient<MedicalRecord[]>(`/api/medical-records${query}`);
  return records || [];
}

export async function createReminder(reminder: Pick<MedicationReminder, 'user_id' | 'medication_id' | 'reminder_times' | 'start_date' | 'end_date'>) {
  return apiClient<MedicationReminderWithMedication>('/api/reminders', { method: 'POST', body: JSON.stringify(reminder) });
}

export async function updateReminder(id: string, updates: Partial<MedicationReminder>) {
  return apiClient<MedicationReminderWithMedication>(`/api/reminders/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function deleteReminder(id: string) {
  await apiClient(`/api/reminders/${id}`, { method: 'DELETE' });
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
  return apiClient<MedicationLog[]>(`/api/reminders/${reminderId}/logs`);
}

export async function logMedicationTaken(reminderId: string, scheduledDatetime: string) {
  return apiClient<MedicationLog>(`/api/reminders/${reminderId}/logs`, { method: 'POST', body: JSON.stringify({ scheduledDatetime, status: 'taken' }) });
}

export async function logMedicationMissed(reminderId: string, scheduledDatetime: string) {
  return apiClient<MedicationLog>(`/api/reminders/${reminderId}/logs`, { method: 'POST', body: JSON.stringify({ scheduledDatetime, status: 'missed' }) });
}

export async function getMedicationLogsByReminderIds(reminderIds: string[]): Promise<MedicationLog[]> {
  if (reminderIds.length === 0) return [];
  const rows = await Promise.all(reminderIds.map((id) => getMedicationLogs(id).catch(() => [])));
  return rows.flat();
}
