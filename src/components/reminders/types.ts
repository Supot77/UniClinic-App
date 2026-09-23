import type { PrescribedMedication } from '@/types/database';

/**
 * ข้อมูลตัวเลือกผู้ป่วยสำหรับคลินิก
 */
export interface PatientOption {
  id: string;
  name: string;
  studentId: string;
  allergies?: string | null;
  phone?: string;
}

/**
 * ข้อมูลใบสั่งยาตามประวัติการตรวจ (Prescription Order) สำหรับแสดงผลบนการ์ดแจ้งเตือน
 */
export interface PatientPrescriptionOrder {
  id: string;
  appointment_id?: string;
  patient_id: string;
  patient_name: string;
  patient_student_id?: string | null;
  patient_phone?: string | null;
  doctor_name: string;
  created_at: string;
  prescribed_medications: PrescribedMedication[];
}
