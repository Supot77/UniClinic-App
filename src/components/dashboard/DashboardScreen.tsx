'use client';

import Link from 'next/link';
import {
  Filter, PackageCheck, PackageX, RefreshCw, UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  dashboardRangeLabels,
  type DashboardRange,
  type DashboardView,
} from '@/features/dashboard/types';
import { getDashboardView } from '@/services/dashboardService';
import type { AppointmentStatus } from '@/types/database';

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', in_progress: 'กำลังตรวจ', completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก', no_show: 'ไม่มาตามนัด', rejected: 'ปฏิเสธ',
};

const appointmentStatusClasses: Record<AppointmentStatus, string> = {
  pending: 'bg-status-warning-bg text-status-warning', confirmed: 'bg-status-info-bg text-status-info',
  in_progress: 'bg-status-info-bg text-status-info', completed: 'bg-status-success-bg text-status-success',
  cancelled: 'bg-status-neutral-bg text-status-neutral', no_show: 'bg-status-critical-bg text-status-critical', rejected: 'bg-status-critical-bg text-status-critical',
};

function bangkokDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Bangkok',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function formatThaiDateTime(dateTime: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok',
  }).format(new Date(dateTime));
}

function formatThaiDate(date: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok',
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function formatThaiRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatThaiDate(endDate);
  const formatter = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok',
  });
  return `${formatter.format(new Date(`${startDate}T12:00:00+07:00`))} – ${formatter.format(new Date(`${endDate}T12:00:00+07:00`))}`;
}

function rangeHeading(prefix: string, range: DashboardRange): string {
  return `${prefix}${range === 'today' ? dashboardRangeLabels[range] : ` ${dashboardRangeLabels[range]}`}`;
}

function Section({ title, description, action, children, className = '' }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-brand-border-soft pb-3">
        <div><h2 className="text-lg font-semibold text-brand-ink">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-brand-muted">{description}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center"><PackageCheck className="mb-3 size-8 text-slate-300" aria-hidden="true" /><p className="text-sm font-medium text-slate-600">{message}</p></div>;
}

export default function DashboardScreen({
  role,
  actorId,
}: {
  role: 'staff_admin' | 'medical' | 'patient';
  actorId: string;
}) {
  const [range, setRange] = useState<DashboardRange>('today');
  const [view, setView] = useState<DashboardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshDashboard = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setLoading(true);
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getDashboardView(role, actorId, bangkokDate(), range)
        .then((viewResult) => {
          if (!cancelled) {
            setView(viewResult);
            setError(null);
          }
        })
        .catch((loadError) => {
          if (!cancelled) {
            setView(null);
            setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูล Dashboard ไม่สำเร็จ');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
            setIsRefreshing(false);
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [actorId, range, refreshToken, role]);

  if (loading) {
    return <div className="mx-auto max-w-7xl animate-pulse space-y-10" aria-busy="true" aria-label="กำลังโหลดแดชบอร์ด"><div className="space-y-3 border-b border-brand-border-soft pb-6"><div className="h-8 w-2/5 rounded bg-brand-border-soft" /><div className="h-4 w-3/5 rounded bg-brand-border-soft" /></div><div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 border-y border-brand-border-soft bg-brand-page/50" />)}</div><div className="h-64 border-y border-brand-border-soft bg-brand-page/50" /></div>;
  }

  if (error || !view) {
    return <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center border-y border-rose-200 py-12 text-center" role="alert"><PackageX className="size-10 text-rose-500" /><h1 className="mt-4 text-xl font-bold text-brand-ink">โหลดข้อมูล Dashboard ไม่สำเร็จ</h1><p className="mt-2 text-sm text-status-critical">{error ?? 'ไม่พบข้อมูลสำหรับบทบาทนี้'}</p><button onClick={() => { setLoading(true); setRefreshToken((value) => value + 1); }} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white"><RefreshCw className="size-4" /> ลองอีกครั้ง</button></div>;
  }

  return (
    <main className="dashboard-shell mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-brand-border-soft pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-1 h-10 w-1 shrink-0 rounded-full bg-brand-strong" />
          <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">{view.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-body">{view.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-start">
          <button type="button" onClick={() => void refreshDashboard()} disabled={isRefreshing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-strong px-4 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />{isRefreshing ? 'กำลังโหลด…' : 'รีเฟรช'}</button>
        </div>
      </header>

      <div className="min-w-0 space-y-8">
        <section className="border-b border-brand-border-soft" aria-label="ตัวกรองแดชบอร์ด">
          <div className="flex flex-col gap-3 py-1.5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-2 px-1 text-sm font-semibold text-brand-ink"><Filter className="size-4 text-brand-strong" aria-hidden="true" />ช่วงข้อมูล</div>
            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto sm:flex-initial" role="group" aria-label="เลือกช่วงข้อมูลย้อนหลัง">
              {(Object.entries(dashboardRangeLabels) as Array<[DashboardRange, string]>).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={range === value} onClick={() => { if (value !== range) { setLoading(true); setRange(value); } }} className={`min-h-12 min-w-[108px] shrink-0 border-b-2 px-4 text-sm font-semibold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${range === value ? 'border-brand-strong text-brand-strong' : 'border-transparent text-brand-body hover:border-brand-border hover:text-brand-ink'}`}>{label}</button>
              ))}
            </div>
            <div className="text-center text-sm font-semibold tabular-nums text-brand-body lg:ml-2">{formatThaiRange(view.startDate, view.date)}</div>
          </div>
        </section>

        <section aria-label="ข้อมูลสรุป" className="overflow-x-auto border-b border-brand-border-soft">
          <div className="flex min-w-max items-stretch sm:min-w-0">
            {view.metrics.map((item) => <div key={item.id} className="flex min-w-[170px] flex-1 items-center justify-center gap-2 border-l border-brand-border-soft px-4 py-3 first:border-l-0 sm:min-w-0"><p className="text-sm font-semibold whitespace-nowrap text-brand-ink">{item.label}</p><p className="rounded-full bg-brand-page px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-strong">{item.value}</p><span className="sr-only">{item.description}</span></div>)}
          </div>
        </section>

          <div className={`grid gap-10 ${role === 'staff_admin' ? 'lg:grid-cols-1' : 'lg:grid-cols-[1.4fr_1fr]'}`}><Section title={rangeHeading('สถานะนัดหมาย', view.range)} description={role === 'medical' ? 'แสดงเฉพาะนัดในตารางของแพทย์คนนี้' : role === 'patient' ? 'แสดงเฉพาะนัดหมายของบัญชีนี้' : 'ไม่รวมรายการยกเลิกและปฏิเสธ'}><div className="grid grid-cols-2 divide-x divide-y divide-brand-border-soft sm:grid-cols-4 sm:divide-y-0">{view.appointmentStatuses.map((item) => <div key={item.status} className="p-5"><p className="text-2xl font-bold text-brand-ink">{item.count}</p><p className="mt-1 text-xs text-brand-muted">{item.label}</p></div>)}</div></Section>{role !== 'staff_admin' && <Section title={rangeHeading('การแจ้งเตือน', view.range)} action={<Link href="/notifications" className="text-sm font-medium text-brand-strong">ดูทั้งหมด</Link>}>{view.recentNotifications.length === 0 ? <EmptyState message="ยังไม่มีการแจ้งเตือนในช่วงนี้" /> : <div className="divide-y divide-brand-border-soft">{view.recentNotifications.map((notification) => <div key={notification.id} className="flex gap-3 px-1 py-4"><span className={`mt-1 size-2 shrink-0 rounded-full ${notification.is_read ? 'bg-brand-border' : 'bg-brand-strong'}`} /><div className="min-w-0"><p className="text-sm font-medium text-brand-ink">{notification.title}</p><p className="mt-1 line-clamp-2 text-xs text-brand-body">{notification.message}</p><time dateTime={notification.created_at} className="mt-2 block text-[11px] text-brand-muted">ส่งเมื่อ {formatThaiDateTime(notification.created_at)} น.</time></div></div>)}</div>}</Section>}</div>

      <Section title={role === 'patient' ? 'นัดหมายของฉัน' : role === 'medical' ? 'คิวและนัดหมายของฉัน' : 'คิวและนัดหมายล่าสุด'} description={`แสดงข้อมูลจำเป็นต่อการทำงานในช่วง ${dashboardRangeLabels[view.range]} โดยไม่เปิดเผยผลตรวจ`} action={<Link href="/appointments" className="text-sm font-semibold text-brand-strong">จัดการนัดหมาย</Link>}>{view.appointmentQueue.length === 0 ? <EmptyState message="ไม่มีนัดหมายในช่วงที่เลือก" /> : <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[80px_120px_1.2fr_1fr_130px] gap-4 border-b border-brand-border-soft px-5 py-3 text-xs font-semibold text-brand-muted"><span>คิว</span><span>วันเวลา</span><span>ผู้ป่วย</span><span>{role === 'medical' ? 'แผนก' : 'แพทย์ / แผนก'}</span><span>สถานะ</span></div><div className="divide-y divide-brand-border-soft">{view.appointmentQueue.map((item) => <div key={item.id} className="grid grid-cols-[80px_120px_1.2fr_1fr_130px] items-center gap-4 px-5 py-4 text-sm"><span className="font-bold tabular-nums text-brand-ink">{item.queueNumber ? `#${item.queueNumber}` : '—'}</span><span className="text-brand-body"><span className="block">{new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00+07:00`))}</span><span className="text-xs text-brand-muted">{item.startTime} น.</span></span><span className="font-semibold text-brand-ink">{item.patientName}</span><span className="text-brand-body">{role === 'medical' ? item.departmentName : <>{item.doctorName}<span className="block text-xs text-brand-muted">{item.departmentName}</span></>}</span><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses[item.status]}`}>{appointmentStatusLabels[item.status]}</span></div>)}</div></div></div>}</Section>

      {role === 'staff_admin' && <Section title="ภาระงานแยกตามแผนก" description={`จำนวนผู้รับบริการเทียบกับความจุในช่วง ${dashboardRangeLabels[view.range]}`} action={<Link href="/departments" className="text-sm font-medium text-brand-strong">จัดการแผนก</Link>}><div className="grid gap-x-8 sm:grid-cols-2">{view.departmentLoads.map((department) => { const ratio = department.capacity === 0 ? 0 : Math.min(100, Math.round((department.appointmentCount / department.capacity) * 100)); return <div key={department.departmentId} className="border-b border-brand-border-soft py-4"><div className="flex justify-between gap-4"><p className="text-sm font-medium text-brand-ink">{department.departmentName}</p><span className="text-xs text-brand-muted">{department.appointmentCount}/{department.capacity}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-page"><div className="h-full rounded-full bg-brand-strong" style={{ width: `${ratio}%` }} /></div></div>; })}</div></Section>}

      {role === 'staff_admin' && <Section title="รายการยาที่ต้องตรวจสอบ" description="ยาหมดอายุถูกแยกออกจากยาใกล้หมดตามกฎระบบ" action={<Link href="/pharmacy" className="text-sm font-medium text-brand-strong">ดูคลังยา</Link>}>{view.medicationAlerts.length === 0 ? <EmptyState message="ไม่มีรายการยาที่ต้องตรวจสอบ" /> : <div className="divide-y divide-brand-border-soft">{view.medicationAlerts.map((medication) => <div key={medication.id} className="flex flex-col justify-between gap-3 px-1 py-4 sm:flex-row sm:items-center"><div><p className="font-medium text-brand-ink">{medication.name}</p><p className="mt-1 text-xs text-brand-muted">คงเหลือ {medication.stock} · จุดสั่งซื้อ {medication.minimumStock}</p></div><div className="flex flex-wrap gap-2">{medication.lowStock && <span className="rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning">ใกล้หมด</span>}{medication.expired && <span className="rounded-full bg-status-critical-bg px-2.5 py-1 text-xs font-medium text-status-critical">หมดอายุ</span>}</div></div>)}</div>}<div className="border-t border-amber-100 bg-status-warning-bg px-1 py-3 text-xs leading-5 text-status-warning">หมายเหตุ: สูตร Available/Reserved และงานแบ่งจ่ายยังรอข้อสรุปจากทีม จึงแสดงเฉพาะข้อมูลที่ยืนยันแล้วใน mock ปัจจุบัน</div></Section>}

      </div>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-400"><UserRound className="size-3.5" /> ข้อมูล Dashboard จาก Supabase · {view.actor?.fullName ?? 'ไม่พบบัญชีสำหรับบทบาทนี้'}</p>
    </main>
  );
}
