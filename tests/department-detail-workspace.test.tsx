import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DepartmentDetailWorkspace from '@/components/schedules/DepartmentDetailWorkspace';
import type {
  DailyServiceOffering,
  DoctorLeave,
  ScheduleDepartment,
  ScheduleDoctor,
  ScheduleService,
  ScheduleSlot,
} from '@/types/schedule';

const scheduling = vi.hoisted(() => ({
  departments: [] as ScheduleDepartment[],
  doctors: [] as ScheduleDoctor[],
  services: [] as ScheduleService[],
  dailyServiceOfferings: [] as DailyServiceOffering[],
  slots: [] as ScheduleSlot[],
  doctorLeaves: [] as DoctorLeave[],
  isLoading: false,
}));

vi.mock('@/features/scheduling/context/SchedulingProvider', () => ({ useScheduling: () => scheduling }));

describe('DepartmentDetailWorkspace', () => {
  beforeEach(() => {
    scheduling.isLoading = false;
    scheduling.departments = [
      { id: 'general', name: 'เวชปฏิบัติทั่วไป', description: 'ตรวจอาการทั่วไป', isActive: true },
      { id: 'dental', name: 'ทันตกรรม', description: '', isActive: true },
    ];
    scheduling.doctors = [
      { id: 'doctor-1', profileId: 'profile-1', fullName: 'นพ. สมชาย ใจดี', email: '', initials: 'SJ', specialty: 'เวชศาสตร์ครอบครัว', departmentId: 'general', availability: 'active' },
      { id: 'doctor-2', profileId: 'profile-2', fullName: 'ทพ. สมใจ ใจดี', email: '', initials: 'SI', specialty: 'ทันตกรรม', departmentId: 'dental', availability: 'active' },
    ];
    scheduling.services = [
      { id: 'service-general', code: 'GEN', name: 'ตรวจโรคทั่วไป', description: 'ตรวจอาการเบื้องต้น', isActive: true },
      { id: 'service-dental', code: 'DEN', name: 'ตรวจฟัน', description: '', isActive: true },
    ];
    scheduling.dailyServiceOfferings = [
      { id: 'offering-1', serviceId: 'service-general', doctorId: 'doctor-1', offeringDate: '2099-09-21', isActive: true },
    ];
    scheduling.slots = [
      { id: 'slot-1', doctorId: 'doctor-1', serviceOfferingId: 'offering-1', serviceId: 'service-general', slotDate: '2099-09-21', startTime: '08:30', endTime: '09:00', maxCapacity: 2, bookedCount: 1, status: 'available' },
      { id: 'slot-2', doctorId: 'doctor-2', serviceOfferingId: 'offering-2', serviceId: 'service-dental', slotDate: '2099-09-21', startTime: '09:00', endTime: '09:30', maxCapacity: 1, bookedCount: 0, status: 'available' },
    ];
    scheduling.doctorLeaves = [];
  });

  it('filters doctors, services and slots to selected department', () => {
    render(<DepartmentDetailWorkspace departmentId="general" />);

    expect(screen.getByRole('heading', { name: 'เวชปฏิบัติทั่วไป' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'นพ. สมชาย ใจดี' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ทพ. สมใจ ใจดี' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ตรวจโรคทั่วไป' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'ตรวจฟัน' })).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.includes('08:30') === true)).toBeInTheDocument();
    expect(screen.queryByText('ทพ. สมใจ ใจดี')).not.toBeInTheDocument();
  });

  it('shows a recoverable not-found state for an unknown department', () => {
    render(<DepartmentDetailWorkspace departmentId="missing" />);

    expect(screen.getByRole('heading', { name: 'ไม่พบแผนก' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /กลับรายการแผนก/ })).toHaveAttribute('href', '/departments');
  });
});
