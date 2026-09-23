/**
 * =============================================================================
 * บริการจัดการระบบแจ้งเตือนการทานยาและประวัติการรักษา (Reminder & Medical Record Service)
 * =============================================================================
 * ไฟล์นี้ทำหน้าที่เป็น Data Access Layer (Client-side Service) ในการเรียกใช้งาน
 * REST API สำหรับ:
 * 1. การดึงและจัดการรายการแจ้งเตือนการทานยา (Medication Reminders)
 * 2. การดึงข้อมูลยาจากคลังและประวัติการตรวจรักษาของแพทย์ (Medications & Medical Records)
 * 3. การบันทึกและตรวจสอบประวัติการทานยาของผู้ป่วย (Medication Logs)
 * =============================================================================
 */

import { apiClient } from '@/lib/api-client';
import type {
  Medication,
  MedicationReminder,
  MedicationLog,
  MedicationReminderWithMedication,
  PrescribedMedication,
  MedicalRecord,
} from '@/types/database';

// =============================================================================
// 1. ระบบจัดการรายการแจ้งเตือนการทานยา (Medication Reminders API)
// =============================================================================

/**
 * ดึงรายการแจ้งเตือนการทานยาทั้งหมดของผู้ป่วย (พร้อมข้อมูลรายละเอียดตัวยา)
 * @param userId รหัสประจำตัวของผู้ป่วย (UUID) หากไม่ระบุจะดึงตามสิทธิ์ผู้ใช้ปัจจุบัน
 * @returns รายการแจ้งเตือนยาพร้อมข้อมูลยาที่เชื่อมโยง (MedicationReminderWithMedication[])
 */
export async function getReminders(userId?: string): Promise<MedicationReminderWithMedication[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiClient<MedicationReminderWithMedication[]>(`/api/reminders${query}`);
}

/**
 * ดึงรายการยาที่มีสถานะพร้อมใช้งาน (Active) ทั้งหมดจากคลังยา
 * ใช้สำหรับแสดงใน Dropdown ให้แพทย์/เจ้าหน้าที่เลือกสั่งจ่ายยา
 * @returns รายการยาที่เปิดใช้งานอยู่ในคลัง (Medication[])
 */
export async function getAvailableMedications(): Promise<Medication[]> {
  return apiClient<Medication[]>('/api/medications?activeOnly=true');
}

/**
 * ดึงรายการยาที่แพทย์สั่งจ่ายทั้งหมดจากประวัติการตรวจ (medical_records) ของผู้ป่วย
 * @param patientId รหัสประจำตัวผู้ป่วย (UUID)
 * @returns รายการยาตามใบสั่งแพทย์ของผู้ป่วยรายนั้น (PrescribedMedication[])
 */
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

/**
 * ดึงประวัติการตรวจรักษาและใบสั่งยาของผู้ป่วย (Medical Records)
 * ใช้สำหรับแสดงผลการ์ดใบสั่งยา (Prescription Order Cards) และประวัติการรักษา
 * @param patientId รหัสประจำตัวผู้ป่วย (UUID)
 * @returns รายการประวัติการตรวจรักษาและยาที่แพทย์สั่งจ่าย (MedicalRecord[])
 */
export async function getPatientMedicalRecords(patientId?: string): Promise<MedicalRecord[]> {
  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
  const records = await apiClient<MedicalRecord[]>(`/api/medical-records${query}`);
  return records || [];
}

/**
 * สร้างรายการแจ้งเตือนการทานยาใหม่ในระบบ
 * @param reminder ข้อมูลการแจ้งเตือน (รหัสผู้ป่วย, รหัสยา, รอบเวลาทานยา, วันเริ่มต้น, วันสิ้นสุด)
 * @returns ข้อมูลการแจ้งเตือนที่สร้างสำเร็จพร้อมข้อมูลยา
 */
export async function createReminder(
  reminder: Pick<MedicationReminder, 'user_id' | 'medication_id' | 'reminder_times' | 'start_date' | 'end_date'>
) {
  return apiClient<MedicationReminderWithMedication>('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(reminder),
  });
}

/**
 * อัปเดตข้อมูลรายการแจ้งเตือนการทานยา
 * @param id รหัสประจำรายการแจ้งเตือน (UUID)
 * @param updates ข้อมูลฟิลด์ที่ต้องการแก้ไข เช่น เวลาแจ้งเตือน, วันที่ หรือสถานะ
 * @returns ข้อมูลการแจ้งเตือนหลังอัปเดต
 */
export async function updateReminder(id: string, updates: Partial<MedicationReminder>) {
  return apiClient<MedicationReminderWithMedication>(`/api/reminders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * ลบรายการแจ้งเตือนการทานยาออกจากระบบ
 * @param id รหัสประจำรายการแจ้งเตือน (UUID)
 */
export async function deleteReminder(id: string) {
  await apiClient(`/api/reminders/${id}`, { method: 'DELETE' });
}

// =============================================================================
// 2. ฟังก์ชันช่วยปรับสถานะการแจ้งเตือนและข้อมูลตัวอย่าง (Status & Seed Helpers)
// =============================================================================

/**
 * ฟังก์ชันสร้างข้อมูลตัวอย่างการแจ้งเตือนยา (Seed Sample Reminders) สำหรับผู้ใช้
 * ใช้สำหรับการทดสอบระบบ (Dev / Test Environment)
 * @param userId รหัสประจำตัวผู้ใช้ (UUID)
 * @returns รายการแจ้งเตือนยาตัวอย่างที่ถูกสร้างขึ้น
 */
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
        status: 'active' as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (toInsert.length === 0) return [];

  const created: MedicationReminderWithMedication[] = [];
  for (const item of toInsert) created.push(await createReminder(item));
  return created;
}

/**
 * พักการแจ้งเตือนการทานยาชั่วคราว (สถานะ 'paused')
 * @param id รหัสประจำรายการแจ้งเตือน (UUID)
 */
export async function pauseReminder(id: string) {
  return updateReminder(id, { status: 'paused' });
}

/**
 * เปิดใช้งานการแจ้งเตือนการทานยาอีกครั้ง (สถานะ 'active')
 * @param id รหัสประจำรายการแจ้งเตือน (UUID)
 */
export async function resumeReminder(id: string) {
  return updateReminder(id, { status: 'active' });
}

/**
 * ทำเครื่องหมายว่าทานยาครบตามคอร์สที่กำหนดแล้ว (สถานะ 'completed')
 * @param id รหัสประจำรายการแจ้งเตือน (UUID)
 */
export async function completeReminder(id: string) {
  return updateReminder(id, { status: 'completed' });
}

// =============================================================================
// 3. ระบบบันทึกประวัติการทานยา (Medication Logs API)
// =============================================================================

/**
 * ดึงประวัติการกดยืนยันการทานยาของรายการเตือนยาที่ระบุ
 * @param reminderId รหัสประจำรายการแจ้งเตือน (UUID)
 * @returns รายการบันทึกประวัติการทานยา (MedicationLog[])
 */
export async function getMedicationLogs(reminderId: string): Promise<MedicationLog[]> {
  return apiClient<MedicationLog[]>(`/api/reminders/${reminderId}/logs`);
}

/**
 * บันทึกว่าผู้ป่วย "ทานยาแล้ว" (taken) ในรอบเวลาที่กำหนด
 * @param reminderId รหัสประจำรายการแจ้งเตือน (UUID)
 * @param scheduledDatetime วันและเวลาตามรอบทานยา (ISO String เช่น "2026-09-23T08:00:00Z")
 * @returns ข้อมูลประวัติการทานยาที่บันทึกสำเร็จ
 */
export async function logMedicationTaken(reminderId: string, scheduledDatetime: string) {
  return apiClient<MedicationLog>(`/api/reminders/${reminderId}/logs`, {
    method: 'POST',
    body: JSON.stringify({ scheduledDatetime, status: 'taken' }),
  });
}

/**
 * บันทึกว่าผู้ป่วย "ไม่ได้ทานยา/ลืมทานยา" (missed) ในรอบเวลาที่กำหนด
 * @param reminderId รหัสประจำรายการแจ้งเตือน (UUID)
 * @param scheduledDatetime วันและเวลาตามรอบทานยา (ISO String เช่น "2026-09-23T08:00:00Z")
 * @returns ข้อมูลประวัติการทานยาที่บันทึกสำเร็จ
 */
export async function logMedicationMissed(reminderId: string, scheduledDatetime: string) {
  return apiClient<MedicationLog>(`/api/reminders/${reminderId}/logs`, {
    method: 'POST',
    body: JSON.stringify({ scheduledDatetime, status: 'missed' }),
  });
}

/**
 * ดึงประวัติการทานยาของหลายรายการแจ้งเตือนพร้อมกัน (Batch Fetch)
 * @param reminderIds รายการรหัสแจ้งเตือนยา (UUID Array)
 * @returns ข้อมูลประวัติการทานยาทั้งหมดรวมกันเป็น Array เดียว
 */
export async function getMedicationLogsByReminderIds(reminderIds: string[]): Promise<MedicationLog[]> {
  if (reminderIds.length === 0) return [];
  const rows = await Promise.all(reminderIds.map((id) => getMedicationLogs(id).catch(() => [])));
  return rows.flat();
}
