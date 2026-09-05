'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useClinicMockDatabase } from '@/features/mock-database/ClinicMockProvider';
import {
  Bell,
  CalendarDays,
  PackageX,
  Pill,
  Users,
  type LucideIcon,
} from 'lucide-react';

const summaryCards: Array<{
  key: 'todayAppointments' | 'patients' | 'lowStockMedications' | 'unreadNotifications' | 'expiredMedications';
  label: string;
  icon: LucideIcon;
  href: string;
}> = [
  { key: 'todayAppointments', label: 'นัดหมายวันนี้', icon: CalendarDays, href: '/appointments' },
  { key: 'patients', label: 'ผู้ป่วยทั้งหมด', icon: Users, href: '/records' },
  { key: 'lowStockMedications', label: 'ยาใกล้หมด', icon: Pill, href: '/pharmacy' },
  { key: 'unreadNotifications', label: 'ยังไม่ได้อ่าน', icon: Bell, href: '/notifications' },
  { key: 'expiredMedications', label: 'ยาหมดอายุ', icon: PackageX, href: '/pharmacy' },
];

const appointmentStatuses = ['รอยืนยัน', 'ยืนยันแล้ว', 'กำลังตรวจ', 'เสร็จสิ้น'];

function SectionHeader({
  title,
  description,
  href,
  linkLabel
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {href && linkLabel && (
        <Link href={href} className="shrink-0 text-sm font-medium text-blue-700 hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function WaitingForData({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center px-5 py-8 text-center">
      <div>
        <p className="text-sm font-medium text-slate-600">รอเชื่อมต่อ database

        </p>
        <p className="mt-1 text-xs text-slate-400">{text}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { repositories } = useClinicMockDatabase();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof repositories.dashboard.getSummary>>['data']>(null);
  useEffect(() => {
    let active = true;
    void repositories.dashboard.getSummary().then((result) => { if (active) setSummary(result.data); });
    return () => { active = false; };
  }, [repositories]);

  return (
    <main className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">ภาพรวมคลินิก</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            แดชบอร์ดและศูนย์แจ้งเตือน
          </h1>
          <p className="mt-1 text-sm text-slate-500">ข้อมูลนัดหมาย ผู้ป่วย คลังยา และการแจ้งเตือน</p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="dashboard-period" className="text-sm text-slate-500">ช่วงข้อมูล</label>
          <select
            id="dashboard-period"
            defaultValue="today"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="today">วันนี้</option>
            <option value="7days">7 วันที่แล้ว</option>
            <option value="30days">30 วันที่แล้ว</option>
          </select>
        </div>
      </header>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">สรุปภาพรวม</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(({ key, label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">{label}</p>
                <Icon className="size-4 text-slate-400" aria-hidden="true" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900 tabular-nums" aria-label={`${label} ${summary?.[key] ?? 'กำลังโหลด'}`}>
                {summary?.[key] ?? '…'}
              </p>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-right text-xs text-slate-400">เวลา Asia/Bangkok —</p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white xl:col-span-2">
          <SectionHeader
            title="สถานะนัดหมายวันนี้"
            description="ไม่รวมรายการยกเลิกและปฏิเสธ"
            href="/appointments"
            linkLabel="ดูนัดหมาย"
          />
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            {appointmentStatuses.map((status, index) => (
              <div key={status} className="px-5 py-5">
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">{summary ? Object.values(summary.appointmentStatuses)[index] : '…'}</p>
                <p className="mt-1 text-xs text-slate-500">{status}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 border-t border-slate-100 bg-slate-50/70">
            <div className="border-r border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-500">แพทย์ตรวจแล้ววันนี้</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500">คิวแพทย์คงเหลือ</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeader
            title="การแจ้งเตือนล่าสุด"
            href="/notifications"
            linkLabel="ดูทั้งหมด"
          />
          <WaitingForData text="รายการล่าสุดจะแสดงที่นี่" />
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeader
            title="ผู้ป่วยแยกตามแผนก"
            description="ตามช่วงวันที่บริการที่เลือก"
          />
          <WaitingForData text="รอข้อสรุปวิธีนับผู้ป่วยจากทีม" />
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <SectionHeader
            title="ยาที่ต้องตรวจสอบ"
            description="ยาใกล้หมดและยาหมดอายุ"
            href="/pharmacy"
            linkLabel="ดูคลังยา"
          />
          <WaitingForData text="ส่วนนี้แสดงตามสิทธิ์ของผู้ใช้งาน" />
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">สำหรับ Staff</p>
          <h2 className="mt-1 font-semibold text-slate-900">ส่ง Broadcast</h2>
          <p className="mt-1 text-sm text-slate-500">
            ส่งประกาศไปยังกลุ่มผู้รับที่เลือก
          </p>
        </div>
        <Link
          href="/notifications"
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:mt-0 sm:w-auto"
        >
          สร้าง Broadcast
        </Link>
      </section>
    </main>
  );
}
