// 👤 รับผิดชอบโดย: ช้อป
// ระบบจัดการแผนกและตารางเวลาแพทย์

import { apiClient } from '@/lib/api-client';
import type { Department, AppointmentSlot, DoctorWithProfile } from '@/types/database';

// --- Departments ---
export async function getDepartments(): Promise<Department[]> {
  return apiClient<Department[]>('/api/departments');
}

export async function createDepartment(department: Pick<Department, 'name' | 'description'>) {
  return apiClient<Department>('/api/departments', { method: 'POST', body: JSON.stringify(department) });
}

export async function updateDepartment(id: string, updates: Partial<Department>) {
  return apiClient<Department>(`/api/departments/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function deleteDepartment(id: string) {
  await apiClient(`/api/departments/${id}`, { method: 'DELETE' });
}

// --- Doctors ---
export async function getDoctors(): Promise<DoctorWithProfile[]> {
  return apiClient<DoctorWithProfile[]>('/api/doctors');
}

// --- Appointment Slots ---
export async function getSlotsByDoctor(doctorId: string, date?: string): Promise<AppointmentSlot[]> {
  const params = new URLSearchParams({ doctorId });
  if (date) params.set('date', date);
  return apiClient<AppointmentSlot[]>(`/api/schedules/slots?${params.toString()}`);
}

export async function createSlot(slot: Pick<AppointmentSlot, 'doctor_id' | 'slot_date' | 'start_time' | 'end_time' | 'max_capacity'>) {
  return apiClient<AppointmentSlot>('/api/schedules/slots', { method: 'POST', body: JSON.stringify(slot) });
}

export async function updateSlot(id: string, updates: Partial<AppointmentSlot>) {
  return apiClient<AppointmentSlot>(`/api/schedules/slots/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
}
