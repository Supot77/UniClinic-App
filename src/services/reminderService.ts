import { apiClient } from '@/lib/api-client';
import type { Medication, MedicationReminder, MedicationLog, MedicationReminderWithMedication } from '@/types/database';

// --- Medication Reminders ---
export async function getReminders(userId: string): Promise<MedicationReminderWithMedication[]> {
  void userId;
  return apiClient<MedicationReminderWithMedication[]>('/api/reminders');
}

export async function getAvailableMedications(): Promise<Medication[]> {
  return apiClient<Medication[]>('/api/medications?activeOnly=true');
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

export async function seedSampleReminders(userId: string): Promise<MedicationReminderWithMedication[]> {
  const meds = await getAvailableMedications();
  if (!meds || meds.length === 0) return [];

  const sampleItems = [
    { medName: 'Paracetamol', times: ['08:00', '12:00', '18:00'] },
    { medName: 'Amoxicillin', times: ['08:00', '13:00', '20:00'] },
    { medName: 'Omeprazole', times: ['07:30'] },
    { medName: 'Cetirizine', times: ['21:00'] },
  ];

  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const toInsert = sampleItems
    .map((sample) => {
      const match = meds.find((m) => m.name.toLowerCase().includes(sample.medName.toLowerCase()));
      if (!match) return null;
      return {
        user_id: userId,
        medication_id: match.id,
        reminder_times: sample.times,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (toInsert.length === 0) return [];

  const created: MedicationReminderWithMedication[] = [];
  for (const item of toInsert) created.push(await createReminder(item));
  return created;
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
