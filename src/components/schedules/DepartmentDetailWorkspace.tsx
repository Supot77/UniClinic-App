'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock3, Stethoscope, Users } from 'lucide-react';
import { useShop } from '@/features/shop/context/ShopProvider';
import { THAI_MONTHS_SHORT, WEEKDAY_NAMES } from '@/constants/dateTime';
import type { ScheduleSlotStatus } from '@/types/schedule';

const slotStatusLabels: Record<ScheduleSlotStatus, string> = {
  available: 'เปิดรับ',
  full: 'เต็ม',
  closed: 'ปิดรอบ',
};

const slotStatusClasses: Record<ScheduleSlotStatus, string> = {
  available: 'bg-status-success/10 text-status-success',
  full: 'bg-status-warning/10 text-status-warning',
  closed: 'bg-status-neutral/10 text-status-neutral',
};

function formatSlotDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${day} ${THAI_MONTHS_SHORT[month - 1]} ${year + 543}`;
}

function formatDateRange(startDate: string, endDate: string) {
  return startDate === endDate ? formatSlotDate(startDate) : `${formatSlotDate(startDate)}–${formatSlotDate(endDate)}`;
}

export default function DepartmentDetailWorkspace({ departmentId }: { departmentId: string }) {
  const {
    departments,
    doctors,
    services,
    dailyServiceOfferings,
    slots,
    doctorLeaves = [],
    isLoading,
  } = useShop();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
        <p role="status" className="rounded-xl border border-brand-border-soft bg-brand-surface px-4 py-6 text-sm text-brand-body">
          กำลังโหลดข้อมูลแผนก...
        </p>
      </main>
    );
  }

  const department = departments.find((item) => item.id === departmentId);
  if (!department) {
    return (
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/departments" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />กลับรายการแผนก
        </Link>
        <section className="border-y border-brand-border-soft py-12" role="alert">
          <h1 className="text-2xl font-bold text-brand-ink">ไม่พบแผนก</h1>
          <p className="mt-2 text-sm text-brand-body">ลิงก์แผนกนี้อาจถูกลบหรือไม่มีอยู่ในระบบแล้ว</p>
        </section>
      </main>
    );
  }

  const departmentDoctors = doctors.filter((doctor) => doctor.departmentId === department.id);
  const doctorIds = new Set(departmentDoctors.map((doctor) => doctor.id));
  const departmentSlots = slots
    .filter((slot) => doctorIds.has(slot.doctorId))
    .sort((a, b) => `${a.slotDate}${a.startTime}`.localeCompare(`${b.slotDate}${b.startTime}`));
  const departmentOfferings = dailyServiceOfferings.filter(
    (offering) => offering.isActive && doctorIds.has(offering.doctorId),
  );
  const serviceIds = new Set([
    ...departmentOfferings.map((offering) => offering.serviceId),
    ...departmentSlots.map((slot) => slot.serviceId),
  ]);
  const departmentServices = services.filter((service) => service.isActive && serviceIds.has(service.id));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-5 border-b border-brand-border-soft pb-7">
        <Link href="/departments" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />กลับรายการแผนก
        </Link>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">Department detail</p>
            <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">{department.name}</h1>
            {department.description && <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-body">{department.description}</p>}
            <p className={`mt-4 text-sm font-semibold ${department.isActive ? 'text-status-success' : 'text-status-neutral'}`}>
              {department.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} · แสดงข้อมูลแพทย์ บริการ และรอบตรวจที่เกี่ยวข้อง
            </p>
          </div>
          <Link href="/schedules" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />ดูตารางทั้งหมด
          </Link>
        </div>
      </header>

      <section aria-label="สรุปแผนก" className="grid gap-3 sm:grid-cols-3">
        <div className="border-y border-brand-border-soft px-1 py-4">
          <p className="text-sm text-brand-body">แพทย์ประจำแผนก</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-ink">{departmentDoctors.length}</p>
        </div>
        <div className="border-y border-brand-border-soft px-1 py-4">
          <p className="text-sm text-brand-body">บริการที่เปิดอยู่</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-ink">{departmentServices.length}</p>
        </div>
        <div className="border-y border-brand-border-soft px-1 py-4">
          <p className="text-sm text-brand-body">รอบตรวจในข้อมูล</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-ink">{departmentSlots.length}</p>
        </div>
      </section>

      <section aria-labelledby="department-doctors-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="department-doctors-title" className="flex items-center gap-2 text-xl font-bold text-brand-ink">
            <Users className="h-5 w-5 text-brand-strong" aria-hidden="true" />แพทย์ประจำแผนก
          </h2>
          <span className="text-sm tabular-nums text-brand-body">{departmentDoctors.length} คน</span>
        </div>
        {departmentDoctors.length === 0 ? (
          <p className="border-y border-brand-border-soft py-6 text-sm text-brand-body">ยังไม่มีแพทย์ในแผนกนี้</p>
        ) : (
          <div className="divide-y divide-brand-border-soft border-y border-brand-border-soft">
            {departmentDoctors.map((doctor) => {
              const leave = doctorLeaves
                .filter((item) => item.doctorId === doctor.id)
                .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
              return (
                <article key={doctor.id} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-brand-ink">{doctor.fullName}</h3>
                    {doctor.specialty && <p className="mt-1 text-sm text-brand-body">{doctor.specialty}</p>}
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${doctor.availability === 'inactive' ? 'text-status-neutral' : doctor.availability === 'on_leave' ? 'text-status-warning' : 'text-status-success'}`}>
                    {doctor.availability === 'inactive' ? 'ปิดใช้งาน' : doctor.availability === 'on_leave' ? `ลาตรวจ${leave ? ` (${formatDateRange(leave.startDate, leave.endDate)})` : ''}` : 'พร้อมออกตรวจ'}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="department-services-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="department-services-title" className="flex items-center gap-2 text-xl font-bold text-brand-ink">
            <Stethoscope className="h-5 w-5 text-brand-strong" aria-hidden="true" />บริการของแผนก
          </h2>
          <span className="text-sm tabular-nums text-brand-body">{departmentServices.length} รายการ</span>
        </div>
        {departmentServices.length === 0 ? (
          <p className="border-y border-brand-border-soft py-6 text-sm text-brand-body">ยังไม่มีบริการที่เปิดให้แพทย์ในแผนกนี้</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {departmentServices.map((service) => {
              const offeringCount = departmentOfferings.filter((offering) => offering.serviceId === service.id).length;
              const slotCount = departmentSlots.filter((slot) => slot.serviceId === service.id).length;
              return (
                <article key={service.id} className="border border-brand-border-soft bg-brand-surface px-5 py-4">
                  <h3 className="font-semibold text-brand-ink">{service.name}</h3>
                  {service.description && <p className="mt-2 text-sm leading-6 text-brand-body">{service.description}</p>}
                  <p className="mt-3 text-xs text-brand-muted">เปิดบริการ {offeringCount} วัน · มีรอบตรวจ {slotCount} รอบ</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="department-slots-title" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="department-slots-title" className="flex items-center gap-2 text-xl font-bold text-brand-ink">
            <Clock3 className="h-5 w-5 text-brand-strong" aria-hidden="true" />ตารางรอบตรวจ
          </h2>
          <span className="text-sm tabular-nums text-brand-body">{departmentSlots.length} รอบ</span>
        </div>
        {departmentSlots.length === 0 ? (
          <p className="border-y border-brand-border-soft py-6 text-sm text-brand-body">ยังไม่มีรอบตรวจของแผนกนี้</p>
        ) : (
          <div className="divide-y divide-brand-border-soft border-y border-brand-border-soft">
            {departmentSlots.map((slot) => {
              const doctor = departmentDoctors.find((item) => item.id === slot.doctorId);
              const service = services.find((item) => item.id === slot.serviceId);
              return (
                <article key={slot.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-ink">{formatSlotDate(slot.slotDate)} · {slot.startTime}–{slot.endTime}</p>
                    <p className="mt-1 break-words text-sm text-brand-body">{doctor?.fullName ?? 'ไม่ระบุแพทย์'} · {service?.name ?? 'ไม่ระบุบริการ'}</p>
                  </div>
                  <span className={`inline-flex min-h-8 items-center self-start rounded-full px-3 text-xs font-semibold sm:self-auto ${slotStatusClasses[slot.status]}`}>
                    {slotStatusLabels[slot.status]} · {slot.bookedCount}/{slot.maxCapacity} คน
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
