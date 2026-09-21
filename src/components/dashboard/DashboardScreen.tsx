'use client';

import Link from 'next/link';
import {
  ArrowRight, Bell, CalendarDays, ChevronDown, ClipboardCheck, Clock3, ExternalLink, Filter, MapPin, PackageCheck, PackageX, Pill, RefreshCw, Stethoscope,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  dashboardRangeLabels,
  type DashboardMetric,
  type DashboardPatientGender,
  type DashboardRange,
  type DashboardView,
  type ClinicDoctorStatus,
  type DepartmentDensityStatus,
} from '@/features/dashboard/types';
import {
  getDashboardView,
  recordPatientMedicationTaken,
  requestPatientAppointmentCancellation,
} from '@/services/dashboardService';
import type { AppointmentStatus } from '@/types/database';
import SegmentedControl from '@/components/common/SegmentedControl';

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

export type AppointmentQueueFilter = 'all' | 'appointments' | 'today' | 'remaining' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'served';
type MedicalWorkFilter = 'all' | 'appointments' | 'remaining' | 'completed' | 'prescriptions' | 'low-stock' | 'expired';
type MedicationAlertFilter = 'all' | 'low-stock' | 'expired';

export function filterAppointmentQueue(
  queue: DashboardView['appointmentQueue'],
  filter: AppointmentQueueFilter,
  date: string,
): DashboardView['appointmentQueue'] {
  if (filter === 'today') return queue.filter((item) => item.date === date);
  if (filter === 'remaining') return queue.filter((item) => item.status === 'confirmed' || item.status === 'in_progress');
  if (filter === 'pending' || filter === 'confirmed' || filter === 'in_progress' || filter === 'completed' || filter === 'cancelled' || filter === 'no_show') return queue.filter((item) => item.status === filter);
  if (filter === 'served') return queue.filter((item) => item.status === 'in_progress' || item.status === 'completed');
  return queue;
}

function Section({ title, description, action, children, className = '', hideHeader = false }: {
  title?: ReactNode; description?: string; action?: ReactNode; children: ReactNode; className?: string; hideHeader?: boolean;
}) {
  return (
    <section className={`overflow-hidden ${className}`}>
      {!hideHeader && <div className="flex items-start justify-between gap-3 border-b border-brand-border-soft pb-3">
        <div className="min-w-0"><h2 className="text-lg font-semibold text-brand-ink">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-brand-muted">{description}</p>}</div>
        {action}
      </div>}
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex min-h-36 flex-col items-center justify-center px-6 py-8 text-center"><PackageCheck className="mb-3 size-8 text-slate-300" aria-hidden="true" /><p className="text-sm font-medium text-slate-600">{message}</p></div>;
}

type DonutSlice = { label: string; count: number; color: string };
type DatabaseStatus = 'checking' | 'connected' | 'disconnected';

const databaseStatusLabels: Record<DatabaseStatus, string> = {
  checking: 'กำลังตรวจสอบ',
  connected: 'เชื่อมต่อแล้ว',
  disconnected: 'เชื่อมต่อไม่ได้',
};

const databaseStatusClasses: Record<DatabaseStatus, string> = {
  checking: 'bg-status-warning-bg text-status-warning',
  connected: 'bg-status-success-bg text-status-success',
  disconnected: 'bg-status-critical-bg text-status-critical',
};

function DatabaseStatusChip({ status }: { status: DatabaseStatus }) {
  return <div role="status" aria-label={`สถานะฐานข้อมูล: ${databaseStatusLabels[status]}`} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold sm:min-h-10 sm:px-3 sm:text-xs ${databaseStatusClasses[status]}`}>
    <span className={`size-1.5 rounded-full ${status === 'connected' ? 'bg-status-success' : status === 'disconnected' ? 'bg-status-critical' : 'bg-status-warning'}`} aria-hidden="true" />
    <span className="hidden sm:inline">ฐานข้อมูล · </span>{databaseStatusLabels[status]}
  </div>;
}

function StatusDonut({ title, centerPercent, slices }: {
  title: string;
  centerPercent: number;
  slices: DonutSlice[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const gradient = total === 0
    ? '#e8efed 0% 100%'
    : slices.reduce<{ parts: string[]; offset: number }>((result, slice) => {
        const nextOffset = result.offset + (slice.count / total) * 100;
        result.parts.push(`${slice.color} ${result.offset}% ${nextOffset}%`);
        result.offset = nextOffset;
        return result;
      }, { parts: [], offset: 0 }).parts.join(', ');
  const donutStyle = { background: `conic-gradient(${gradient})` } as CSSProperties;

  const [firstSlice, secondSlice] = slices;

  return <article className="grid min-w-0 grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] sm:gap-3" aria-label={title}>
    <div className="min-w-0 text-right">
      <p className="truncate text-[10px] font-semibold leading-tight text-brand-muted sm:text-xs">{firstSlice.label}</p>
      <p className="mt-1 text-xs font-semibold tabular-nums text-brand-body sm:text-sm">{firstSlice.count} รายการ</p>
    </div>
    <div className="relative size-32 shrink-0 rounded-full p-3 sm:size-36" style={donutStyle} role="img" aria-label={`${title} ${centerPercent}%`}>
      <div className="flex size-full flex-col items-center justify-center rounded-full bg-brand-surface text-center ring-1 ring-brand-border-soft">
        <span className="text-[10px] font-semibold leading-tight text-brand-muted sm:text-xs">{title}</span>
        <strong className="mt-0.5 text-3xl leading-none text-brand-ink sm:text-4xl">{centerPercent}%</strong>
      </div>
    </div>
    <div className="min-w-0 text-left">
      <p className="truncate text-[10px] font-semibold leading-tight text-brand-muted sm:text-xs">{secondSlice.label}</p>
      <p className="mt-1 text-xs font-semibold tabular-nums text-brand-body sm:text-sm">{secondSlice.count} รายการ</p>
    </div>
  </article>;
}

const genderColors: Record<DashboardPatientGender, string> = {
  male: '#3b82f6',
  female: '#ec4899',
  unspecified: '#94a3b8',
};

type GenderCounts = NonNullable<DashboardView['patientGenderCounts']>;
type DashboardChartMode = 'status' | 'gender';

function GenderPieChart({ audienceLabel, counts }: { audienceLabel: string; counts: GenderCounts }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const gradient = total === 0
    ? '#e8efed 0% 100%'
    : counts.reduce<{ parts: string[]; offset: number }>((result, item) => {
        const nextOffset = result.offset + (item.count / total) * 100;
        result.parts.push(`${genderColors[item.gender]} ${result.offset}% ${nextOffset}%`);
        result.offset = nextOffset;
        return result;
      }, { parts: [], offset: 0 }).parts.join(', ');

  return <article className="px-1 py-1" aria-label={`แผนภูมิเพศ${audienceLabel}`}>
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-5">
      <div className="relative size-28 shrink-0 rounded-full border-2 border-white sm:size-32" style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`${audienceLabel}ทั้งหมด ${total} คน`} />
      <div className="w-full min-w-0 space-y-1.5 sm:w-auto sm:min-w-[170px]">
        {counts.map((item) => <div key={item.gender} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-brand-body"><span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: genderColors[item.gender] }} aria-hidden="true" />{item.label}</span><span className="shrink-0 font-semibold tabular-nums text-brand-ink">{item.count} ({item.percentage}%)</span></div>)}
      </div>
    </div>
  </article>;
}

function GenderSummary({
  patientCounts,
  doctorCounts,
}: {
  patientCounts?: DashboardView['patientGenderCounts'];
  doctorCounts?: DashboardView['doctorGenderCounts'];
}) {
  if (!patientCounts && !doctorCounts) return null;

  return <section aria-label="สรุปเพศผู้ป่วยและแพทย์ในคลินิก" className="space-y-3">
    <div className="grid gap-5 lg:grid-cols-2">
      {patientCounts && <div className="border-y border-brand-border-soft px-1 py-4">
        <GenderPieChart audienceLabel="ผู้ป่วย" counts={patientCounts} />
        <h3 className="mt-3 px-1 text-center text-sm font-semibold text-brand-ink">ผู้ป่วยรวมในคลินิก</h3>
      </div>}
      {doctorCounts && <div className="border-y border-brand-border-soft px-1 py-4">
        <GenderPieChart audienceLabel="แพทย์" counts={doctorCounts} />
        <h3 className="mt-3 px-1 text-center text-sm font-semibold text-brand-ink">แพทย์รวมในคลินิก</h3>
      </div>}
    </div>
  </section>;
}

const metricToneClasses: Record<DashboardMetric['tone'], string> = {
  blue: 'bg-brand-soft text-brand-strong',
  emerald: 'bg-brand-soft text-brand-strong',
  amber: 'bg-status-warning-bg text-status-warning',
  violet: 'bg-brand-soft text-brand-strong',
  rose: 'bg-status-critical-bg text-status-critical',
};

const dashboardControlShape = 'rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';
const dashboardButton = `inline-flex min-h-11 items-center justify-center gap-2 ${dashboardControlShape} px-4 text-sm font-semibold`;
const dashboardSecondaryButton = `${dashboardButton} border-brand-border-strong bg-white text-brand-strong hover:bg-brand-soft`;
const dashboardContentWidthClass = 'mx-auto w-full max-w-[1600px]';

function DashboardActionLink({ href, children = 'ดูทั้งหมด' }: { href: string; children?: ReactNode }) {
  return <Link href={href} className={`${dashboardButton} min-h-9 shrink-0 whitespace-nowrap border-brand-strong bg-brand-strong px-2 text-[11px] text-white hover:bg-brand-hover sm:min-h-10 sm:px-3 sm:text-xs`}>
    {children}
    <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" />
  </Link>;
}

function MetricIcon({ id }: { id: string }) {
  if (id.includes('appointment')) return <CalendarDays className="size-5" aria-hidden="true" />;
  if (id.includes('medication')) return <Pill className="size-5" aria-hidden="true" />;
  if (id.includes('reminder')) return <Clock3 className="size-5" aria-hidden="true" />;
  if (id.includes('notification')) return <Bell className="size-5" aria-hidden="true" />;
  return <ClipboardCheck className="size-5" aria-hidden="true" />;
}

function MedicalMetricItem({ item, selected, onSelect }: {
  item: DashboardMetric;
  selected: boolean;
  onSelect?: () => void;
}) {
  const className = `flex min-h-28 w-full flex-col justify-center border-b-2 border-r border-brand-border-soft px-5 py-4 text-left transition-colors last:border-r-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${selected ? 'border-b-brand-strong text-brand-strong' : 'border-b-transparent text-brand-ink hover:border-b-brand-border'}`;
  const content = <>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">{item.label}</p>
        <p className="mt-1 text-xs leading-5 text-brand-muted">{item.description}</p>
      </div>
      <MetricIcon id={item.id} />
    </div>
    <p className="mt-3 text-3xl font-bold leading-none tabular-nums">{item.value}</p>
  </>;

  if (onSelect) {
    return <button type="button" aria-pressed={selected} onClick={onSelect} className={className}>{content}</button>;
  }

  return <div className={className}>{content}</div>;
}

type MedicalMetricAppointmentFilter = Extract<AppointmentQueueFilter, 'appointments' | 'remaining' | 'completed'>;
type PatientMetricFilter = 'medications' | 'appointment';

function PatientMetricItem({ item, selected, onSelect }: {
  item: DashboardMetric;
  selected: boolean;
  onSelect: () => void;
}) {
  return <button type="button" aria-pressed={selected} aria-expanded={selected} onClick={onSelect} className={`flex min-h-24 w-full items-center gap-3 border-r border-brand-border-soft px-5 py-4 text-left transition-colors last:border-r-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${selected ? 'bg-brand-soft text-brand-strong' : 'text-brand-ink hover:bg-brand-page'}`}>
    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${metricToneClasses[item.tone]}`}><MetricIcon id={item.id} /></span>
    <span className="min-w-0 flex-1"><span className="block text-3xl font-bold leading-none tabular-nums">{item.value}</span><span className="mt-2 block text-xs font-medium leading-5">{item.label}</span></span>
    <ChevronDown className={`size-5 shrink-0 transition-transform ${selected ? 'rotate-180' : ''}`} aria-hidden="true" />
  </button>;
}

function PatientMetricDropdown({ view, filter }: { view: DashboardView; filter: PatientMetricFilter }) {
  const medications = view.patientMedications ?? [];
  const appointment = view.nextAppointment;

  if (filter === 'medications') {
    return <div className="border-x border-b border-brand-border-soft bg-brand-page/45 px-4 py-4 sm:px-5" aria-label="รายละเอียดรายการยาที่กำลังใช้">
      {medications.length === 0 ? <p className="py-3 text-center text-sm text-brand-muted">ยังไม่มีรายการยาที่กำลังใช้</p> : <div className="divide-y divide-brand-border-soft">{medications.map((medication) => <div key={medication.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-brand-ink">{medication.name}</p><p className="mt-1 text-xs text-brand-body">{medication.dosage} · ครั้งถัดไป {medication.nextDoseTime ? `${medication.nextDoseTime} น.` : 'ยังไม่ตั้งเวลา'}</p></div><span className="text-xs text-brand-muted">{medication.endDate ? `ถึง ${formatThaiDate(medication.endDate)}` : 'กำลังใช้งาน'}</span></div>)}</div>}
      <Link href="/reminders" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline">จัดการรายการยา <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
    </div>;
  }

  return <div className="border-x border-b border-brand-border-soft bg-brand-page/45 px-4 py-4 sm:px-5" aria-label="รายละเอียดนัดหมายถัดไป">
    {!appointment ? <p className="py-3 text-center text-sm text-brand-muted">ยังไม่มีนัดหมายที่กำลังจะถึง</p> : <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-brand-ink">{formatThaiDate(appointment.date)}</p><p className="mt-1 text-sm text-brand-body">{appointment.startTime.slice(0, 5)} น. · {appointment.doctorName}</p><p className="mt-1 text-xs text-brand-muted">{appointment.departmentName} · คิว #{appointment.queueNumber ?? '—'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses[appointment.status]}`}>{appointmentStatusLabels[appointment.status]}</span></div>}
    <Link href="/appointments" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong hover:underline">ดูนัดหมายทั้งหมด <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
  </div>;
}

function MedicalMetricDropdown({
  appointments,
  date,
  filter,
}: {
  appointments: DashboardView['appointmentQueue'];
  date: string;
  filter: MedicalMetricAppointmentFilter;
}) {
  const filteredAppointments = filterAppointmentQueue(appointments, filter, date);
  const heading = filter === 'appointments'
    ? 'นัดของฉันวันนี้'
    : filter === 'remaining'
      ? 'คิวของฉันที่เหลือ'
      : 'ตรวจเสร็จวันนี้';

  return <div className="border-x border-b border-brand-border-soft bg-brand-page/45 px-4 py-4 sm:px-5" aria-label={`รายชื่อผู้ป่วย${heading}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-brand-ink">{heading}</p>
        <p className="mt-1 text-xs text-brand-muted">{filteredAppointments.length} รายการที่แสดง</p>
      </div>
      <Link href="/appointments" className="text-xs font-semibold text-brand-strong hover:underline">ดูนัดหมายทั้งหมด</Link>
    </div>
    {filteredAppointments.length === 0 ? <p className="py-5 text-center text-sm text-brand-muted">ไม่มีรายชื่อผู้ป่วยในตัวกรองนี้</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {filteredAppointments.map((appointment) => <Link key={appointment.id} href={`/records?appointment=${encodeURIComponent(appointment.id)}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-brand-border-soft bg-white px-3 py-3 transition hover:border-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-brand-ink">{appointment.patientName}</span><span className="mt-1 block truncate text-xs text-brand-body">คิว #{appointment.queueNumber ?? '—'} · {appointment.departmentName}</span></span>
        <span className="shrink-0 text-right text-xs text-brand-muted"><span className="block font-semibold text-brand-ink">{appointment.startTime} น.</span><span className={`mt-1 block rounded-full px-2 py-0.5 font-medium ${appointmentStatusClasses[appointment.status]}`}>{appointmentStatusLabels[appointment.status]}</span></span>
      </Link>)}
    </div>}
  </div>;
}

function MedicationProgressList({
  medications,
  emptyMessage,
}: {
  medications: DashboardView['medicationAlerts'];
  emptyMessage: string;
}) {
  if (medications.length === 0) return <EmptyState message={emptyMessage} />;

  return <div className="divide-y divide-brand-border-soft">{medications.map((medication) => {
    const threshold = Math.max(medication.minimumStock, 1);
    const progress = Math.min(100, Math.round((medication.stock / threshold) * 100));
    const barClass = medication.expired ? 'bg-status-critical' : medication.lowStock ? 'bg-status-warning' : 'bg-brand-strong';
    return <div key={medication.id} className="px-1 py-4 first:pt-5 last:pb-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-brand-ink">{medication.name}</p>
        <div className="flex flex-wrap gap-2">{medication.lowStock && <span className="rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-medium text-status-warning">ใกล้หมด</span>}{medication.expired && <span className="rounded-full bg-status-critical-bg px-2.5 py-1 text-xs font-medium text-status-critical">หมดอายุ</span>}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-page" role="progressbar" aria-label={`สต๊อกยา ${medication.name}`} aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(medication.stock, threshold)}>
        <div className={`h-full rounded-full transition-[width] ${barClass}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-brand-muted"><span>คงเหลือ {medication.stock} จากจุดสั่งซื้อ {medication.minimumStock}</span>{medication.expiryDate && <span>หมดอายุ {medication.expiryDate}</span>}</div>
    </div>;
  })}</div>;
}

function PatientAppointmentList({ appointments, onRefresh }: {
  appointments: DashboardView['appointmentQueue'];
  onRefresh: () => void;
}) {
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function requestCancellation(appointmentId: string) {
    if (!window.confirm('ยืนยันส่งคำขอยกเลิกนัดนี้หรือไม่')) return;
    setBusyAppointmentId(appointmentId);
    setActionError(null);
    try {
      await requestPatientAppointmentCancellation(appointmentId);
      onRefresh();
    } catch (errorValue) {
      setActionError(errorValue instanceof Error ? errorValue.message : 'ส่งคำขอยกเลิกนัดไม่สำเร็จ');
    } finally {
      setBusyAppointmentId(null);
    }
  }

  return <Section title="รายการนัดหมายทั้งหมด" description="ตรวจสอบสถานะนัดและส่งคำขอยกเลิกนัด" action={<DashboardActionLink href="/schedules">จองนัดใหม่</DashboardActionLink>}>
    {actionError && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-status-critical">{actionError}</p>}
    {appointments.length === 0 ? <div className="border-y border-brand-border-soft"><EmptyState message="ยังไม่มีรายการนัดหมาย" /></div> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{appointments.map((appointment) => {
      const canRequestCancellation = (appointment.status === 'pending' || appointment.status === 'confirmed') && !appointment.cancelRequestedAt;
      return <article key={appointment.id} className="rounded-brand-card border border-brand-border-soft bg-white/65 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-brand-ink">{formatThaiDate(appointment.date)}</p><p className="mt-1 text-sm text-brand-body">{appointment.startTime} น. · {appointment.doctorName}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses[appointment.status]}`}>{appointmentStatusLabels[appointment.status]}</span></div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted"><span>{appointment.serviceName ?? appointment.departmentName}</span>{appointment.serviceName && appointment.serviceName !== appointment.departmentName && <span>{appointment.departmentName}</span>}<span>คิว #{appointment.queueNumber ?? '—'}</span></div>
        {appointment.cancelRequestedAt && <p className="mt-3 text-sm font-medium text-status-warning">ส่งคำขอยกเลิกแล้ว · รอเจ้าหน้าที่ดำเนินการ</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {canRequestCancellation && <button type="button" disabled={busyAppointmentId === appointment.id} onClick={() => void requestCancellation(appointment.id)} className={dashboardSecondaryButton}>{busyAppointmentId === appointment.id ? 'กำลังส่ง…' : 'ขอยกเลิกนัด'}</button>}
          {appointment.status === 'completed' && <Link href={`/records?appointment=${appointment.id}`} className={dashboardSecondaryButton}>ดูผลตรวจและยา</Link>}
          <Link href="/appointments" className={`${dashboardSecondaryButton} ml-auto`}>รายละเอียด</Link>
        </div>
      </article>;
    })}</div>}
  </Section>;
}

function PatientMedicationLog({ medication, onRefresh }: {
  medication: NonNullable<DashboardView['patientMedications']>[number];
  onRefresh: () => void;
}) {
  const [busyDose, setBusyDose] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const doses = medication.todayDoses ?? [];

  async function recordTaken(scheduledAt: string) {
    setBusyDose(scheduledAt);
    setActionError(null);
    try {
      await recordPatientMedicationTaken(medication.id, scheduledAt);
      onRefresh();
    } catch (errorValue) {
      setActionError(errorValue instanceof Error ? errorValue.message : 'บันทึกผลการกินยาไม่สำเร็จ');
    } finally {
      setBusyDose(null);
    }
  }

  if (doses.length === 0) return null;

  return <div className="mt-4 border-t border-brand-border-soft pt-3"><p className="text-xs font-semibold text-brand-muted">บันทึกการกินยาวันนี้</p><div className="mt-2 flex flex-wrap gap-2">{doses.map((dose) => dose.status === 'taken' ? <span key={dose.scheduledAt} className="inline-flex min-h-9 items-center rounded-lg bg-status-success-bg px-3 text-xs font-semibold text-status-success">{dose.time} น. · กินแล้ว</span> : <div key={dose.scheduledAt} className="inline-flex items-center gap-2 rounded-lg border border-brand-border-soft bg-brand-surface px-2 py-1"><span className="text-xs text-brand-body">{dose.time} น. · ยังไม่ได้บันทึก</span><button type="button" disabled={busyDose === dose.scheduledAt} onClick={() => void recordTaken(dose.scheduledAt)} className="inline-flex min-h-8 items-center rounded-md bg-brand-strong px-2.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{busyDose === dose.scheduledAt ? 'กำลังบันทึก…' : 'กินแล้ว'}</button></div>)}</div>{actionError && <p role="alert" className="mt-2 text-xs text-status-critical">{actionError}</p>}</div>;
}

function PatientDashboardContent({ view, onRefresh }: { view: DashboardView; onRefresh: () => void }) {
  const nextAppointment = view.nextAppointment ?? null;
  const medications = view.patientMedications ?? [];
  const history = view.patientTreatmentHistory ?? [];

  return <div className={`${dashboardContentWidthClass} space-y-10`}>
    <div className="grid gap-10 lg:grid-cols-2">
      <Section title="ยาที่กำลังใช้" description="รายการยาที่แพทย์สั่งและกำลังใช้งาน" action={<DashboardActionLink href="/reminders" />}>
        {medications.length === 0 ? <EmptyState message="ยังไม่มีรายการยาที่กำลังใช้" /> : <div className="mt-4 space-y-3">{medications.map((medication) => {
          const takenDoses = medication.takenDoses ?? 0;
          const totalDoses = medication.totalDoses ?? 0;
          const remainingDoses = Math.max(0, totalDoses - takenDoses);
          const progress = totalDoses > 0 ? Math.min(100, Math.round((takenDoses / totalDoses) * 100)) : 0;
          return <article key={medication.id} className="rounded-brand-card border border-brand-border-soft bg-white/65 px-4 py-4 sm:px-5">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong"><Pill className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold text-brand-ink">{medication.name}</p>{medication.endDate && <span className="text-xs text-brand-muted">ถึง {formatThaiDate(medication.endDate)}</span>}</div>
                <p className="mt-1 text-sm leading-6 text-brand-body"><span className="font-medium text-brand-ink">ขนาด:</span> {medication.dosage}<span className="mx-2 text-brand-border">·</span><span className="font-medium text-brand-ink">วิธีใช้:</span> {medication.instruction}</p>
                {totalDoses > 0 ? <div className="mt-4" aria-label={`ทานยาแล้ว ${takenDoses} จาก ${totalDoses} ครั้ง`}><div className="flex items-center justify-between gap-3 text-xs font-semibold text-brand-body"><span>ทานแล้ว {takenDoses} ครั้ง</span><span>เหลือ {remainingDoses} ครั้ง</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-page" role="progressbar" aria-valuemin={0} aria-valuemax={totalDoses} aria-valuenow={takenDoses}><div className="h-full rounded-full bg-brand-strong transition-[width]" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-brand-muted">จากทั้งหมด {totalDoses} ครั้ง</p></div> : <p className="mt-3 text-xs text-brand-muted">เวลา {medication.reminderTimes.length > 0 ? medication.reminderTimes.map((time) => `${time} น.`).join(' · ') : 'ยังไม่ตั้งเวลา'}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong"><Clock3 className="size-3.5" aria-hidden="true" />ครั้งถัดไป {medication.nextDoseTime ? `${medication.nextDoseTime} น.` : 'ยังไม่ตั้งเวลา'}</p>
                <PatientMedicationLog medication={medication} onRefresh={onRefresh} />
              </div>
            </div>
          </article>;
        })}</div>}
      </Section>

      <div className="space-y-10">
        <Section title="นัดหมายของฉัน" description="นัดหมายครั้งถัดไปของคุณ" action={<DashboardActionLink href="/appointments" />}>
          {nextAppointment ? <div className="mt-4 rounded-brand-card border border-brand-border-soft bg-brand-surface px-4 py-4">
            <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong"><CalendarDays className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="font-semibold text-brand-ink">{formatThaiDate(nextAppointment.date)}</p><p className="mt-1 text-sm text-brand-body">{nextAppointment.startTime.slice(0, 5)} น.</p></div></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses[nextAppointment.status]}`}>{appointmentStatusLabels[nextAppointment.status]}</span></div>
            <div className="mt-4 space-y-2 text-sm text-brand-body"><p className="inline-flex items-center gap-2"><Stethoscope className="size-4 text-brand-strong" aria-hidden="true" />{nextAppointment.doctorName}</p><p className="inline-flex items-center gap-2"><MapPin className="size-4 text-brand-strong" aria-hidden="true" />{nextAppointment.departmentName}</p>{nextAppointment.queueNumber && <p className="inline-flex items-center gap-2"><Clock3 className="size-4 text-brand-strong" aria-hidden="true" />คิว #{nextAppointment.queueNumber}</p>}</div>
            <Link href="/appointments" className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-brand-button border border-brand-strong bg-white px-3.5 text-sm font-semibold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">ดูรายละเอียด <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div> : <div className="mt-4 border-y border-brand-border-soft"><EmptyState message="ยังไม่มีนัดหมายที่กำลังจะถึง" /></div>}
        </Section>

      </div>
    </div>

    <PatientAppointmentList appointments={view.appointmentQueue} onRefresh={onRefresh} />

    <Section title="ประวัติการรักษาล่าสุด" description="ผลตรวจและคำแนะนำที่เปิดดูได้จากบัญชีของคุณ" action={<DashboardActionLink href="/records">ดูประวัติทั้งหมด</DashboardActionLink>}>
      {history.length === 0 ? <div className="border-y border-brand-border-soft"><EmptyState message="ยังไม่มีประวัติการรักษาที่เปิดดูได้" /></div> : <div className="mt-4 overflow-x-auto border-y border-brand-border-soft"><table className="w-full min-w-[680px] table-fixed text-left text-sm"><thead className="bg-brand-page/55 text-xs font-semibold text-brand-muted"><tr><th scope="col" className="w-1/5 px-4 py-3">วันที่</th><th scope="col" className="w-1/5 px-4 py-3">แผนก</th><th scope="col" className="w-1/5 px-4 py-3">แพทย์</th><th scope="col" className="w-1/5 px-4 py-3">ผลตรวจและคำแนะนำ</th><th scope="col" className="w-1/5 px-4 py-3 text-right">ยา</th></tr></thead><tbody className="divide-y divide-brand-border-soft">{history.map((record) => <tr key={record.id} className="align-top"><td className="break-words px-4 py-4 text-brand-body">{formatThaiDateTime(record.date)}</td><td className="break-words px-4 py-4 text-brand-body">{record.departmentName}</td><td className="break-words px-4 py-4 font-medium text-brand-ink">{record.doctorName}</td><td className="break-words px-4 py-4 text-brand-ink"><p className="font-medium">{record.summary}</p>{record.advice && <p className="mt-1 text-xs leading-5 text-brand-body">คำแนะนำ: {record.advice}</p>}{record.medicationNames?.length ? <p className="mt-1 text-xs leading-5 text-brand-body">ยา: {record.medicationNames.join(' · ')}</p> : null}</td><td className="break-words px-4 py-4 text-right text-xs text-brand-muted">{record.medicationCount > 0 ? `${record.medicationCount} รายการ` : 'ไม่มีการสั่งยา'}</td></tr>)}</tbody></table></div>}
    </Section>
  </div>;
}

function MedicalPharmacySections({ view, filter, includePrescriptions = true }: { view: DashboardView; filter: MedicalWorkFilter; includePrescriptions?: boolean }) {
  const pendingPrescriptions = view.pendingPrescriptions ?? [];
  const medicationAlerts = view.medicationAlerts.filter((medication) => {
    if (filter === 'low-stock') return medication.lowStock;
    if (filter === 'expired') return medication.expired;
    return true;
  });
  const showPrescriptions = includePrescriptions && (filter === 'all' || filter === 'prescriptions');
  const showAlerts = filter === 'all' || filter === 'low-stock' || filter === 'expired';

  return <div className={`${dashboardContentWidthClass} space-y-8 sm:space-y-10`}>
    {showPrescriptions && <Section title="ใบสั่งยารอจ่าย" description="รายการที่ยังมีรายการยาไม่ได้จ่ายครบ" action={<DashboardActionLink href="/pharmacy">ดูทั้งหมด</DashboardActionLink>}>
      {pendingPrescriptions.length === 0 ? <EmptyState message="ไม่มีใบสั่งยาที่รอจ่าย" /> : <div className="divide-y divide-brand-border-soft">
        {pendingPrescriptions.map((prescription) => <div key={prescription.id} className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="font-semibold text-brand-ink">{prescription.patientName}</p><p className="mt-1 text-sm text-brand-body">{prescription.diagnosis}</p><p className="mt-1 text-xs text-brand-muted">{prescription.doctorName} · {prescription.departmentName} · {formatThaiDateTime(prescription.date)} น.</p></div>
          <span className="shrink-0 self-start rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning">เหลือจ่าย {Math.max(0, prescription.medicationCount - prescription.dispensedCount)}/{prescription.medicationCount} รายการ</span>
        </div>)}
      </div>}
    </Section>}

    {showAlerts && <Section title="สถานะคลังยา" description="ยาใกล้หมดและยาหมดอายุจากคลังที่ใช้งานอยู่" action={<DashboardActionLink href="/pharmacy">ดูคลังยาทั้งหมด</DashboardActionLink>}>
      <MedicationProgressList medications={medicationAlerts} emptyMessage={filter === 'low-stock' ? 'ไม่มียาที่ใกล้หมด' : filter === 'expired' ? 'ไม่มียาที่หมดอายุ' : 'ไม่มีรายการยาที่ต้องตรวจสอบ'} />
    </Section>}
  </div>;
}

const doctorStatusLabels: Record<ClinicDoctorStatus, string> = {
  in_progress: 'กำลังตรวจ',
  available: 'ว่าง',
  away: 'ไม่อยู่',
  completed: 'ตรวจเสร็จแล้ว',
};

const doctorStatusClasses: Record<ClinicDoctorStatus, string> = {
  in_progress: 'bg-status-info-bg text-status-info',
  available: 'bg-status-success-bg text-status-success',
  away: 'bg-status-neutral-bg text-status-neutral',
  completed: 'bg-brand-soft text-brand-strong',
};

const densityLabels: Record<DepartmentDensityStatus, string> = {
  normal: 'ปกติ',
  near_full: 'ใกล้เต็ม',
  full: 'เต็ม',
};

const densityClasses: Record<DepartmentDensityStatus, string> = {
  normal: 'bg-status-success-bg text-status-success',
  near_full: 'bg-status-warning-bg text-status-warning',
  full: 'bg-status-critical-bg text-status-critical',
};

function StaffMedicationAlerts({ view }: { view: DashboardView }) {
  const [medicationFilter, setMedicationFilter] = useState<MedicationAlertFilter>('all');
  const medicationFilterOptions: Array<{ value: MedicationAlertFilter; label: string; count: number }> = [
    { value: 'all', label: 'ทั้งหมด', count: view.medicationAlerts.length },
    { value: 'low-stock', label: 'ใกล้หมด', count: view.medicationAlerts.filter((medication) => medication.lowStock).length },
    { value: 'expired', label: 'หมดอายุ', count: view.medicationAlerts.filter((medication) => medication.expired).length },
  ];
  const visibleMedications = medicationFilter === 'low-stock'
    ? view.medicationAlerts.filter((medication) => medication.lowStock)
    : medicationFilter === 'expired'
      ? view.medicationAlerts.filter((medication) => medication.expired)
      : view.medicationAlerts;
  const emptyMessage = medicationFilter === 'low-stock'
    ? 'ไม่มียาที่ใกล้หมด'
    : medicationFilter === 'expired'
      ? 'ไม่มียาที่หมดอายุ'
      : 'ไม่มีรายการยาที่ต้องตรวจสอบ';

  return <Section title="รายการยาที่ต้องตรวจสอบ" description="ยาหมดอายุถูกแยกออกจากยาใกล้หมดตามกฎระบบ" action={<DashboardActionLink href="/pharmacy">ดูคลังยา</DashboardActionLink>}>
    <div className="overflow-x-auto pb-1">
      <div role="group" aria-label="กรองสถานะยา" className="mx-auto flex w-full min-w-max items-end gap-0 border-b border-brand-border-soft">
        {medicationFilterOptions.map((option) => {
          const selected = medicationFilter === option.value;
          return <button key={option.value} type="button" aria-pressed={selected} onClick={() => setMedicationFilter(option.value)} className={`relative flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 border-x border-t px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm ${selected ? 'z-10 -mb-px rounded-t-2xl border-brand-border-soft border-t-4 border-t-brand-strong bg-brand-surface text-brand-strong' : 'border-transparent text-brand-body hover:text-brand-ink'}`}>
            <span>{option.label}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums sm:px-2.5 sm:text-sm ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-brand-page text-brand-muted'}`}>{option.count}</span>
          </button>;
        })}
      </div>
    </div>
    <MedicationProgressList medications={visibleMedications} emptyMessage={emptyMessage} />
  </Section>;
}

function ClinicOverviewSections({ view }: { view: DashboardView }) {
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<'available' | 'away'>('away');
  const doctorStatuses = view.doctorStatuses ?? [];
  const departmentDoctors = doctorStatuses;
  const statusCounts = departmentDoctors.reduce<Record<ClinicDoctorStatus, number>>((counts, doctor) => {
    counts[doctor.status] += 1;
    return counts;
  }, { in_progress: 0, available: 0, away: 0, completed: 0 });
  const statusOptions: Array<{ value: 'available' | 'away'; label: string }> = [
    { value: 'available', label: 'ว่าง' },
    { value: 'away', label: 'ไม่อยู่' },
  ];

  return <div className="space-y-10">
    <Section title="ภาพรวมแยกตามแผนก" description={`จำนวนผู้ป่วย แพทย์ที่ปฏิบัติงาน และความหนาแน่นในช่วง ${dashboardRangeLabels[view.range]}`} action={<DashboardActionLink href="/departments">จัดการแผนก</DashboardActionLink>}>
      {view.departmentLoads.length === 0 ? <EmptyState message="ยังไม่มีข้อมูลแผนกในช่วงนี้" /> : <>
        <div className="mt-3 overflow-hidden rounded-lg border border-brand-border-soft bg-brand-page/35">
          <div className="grid sm:grid-cols-2">
          {view.departmentLoads.map((department, index) => {
            const patientCount = department.patientCount ?? department.appointmentCount;
            const doctorCount = department.doctorCount ?? 0;
            const activeDoctorCount = department.activeDoctorCount ?? 0;
            const densityPercent = department.densityPercent ?? (department.capacity > 0 ? Math.round((patientCount / department.capacity) * 100) : 0);
            const densityStatus = department.densityStatus ?? (densityPercent >= 100 ? 'full' : densityPercent >= 70 ? 'near_full' : 'normal');
            return <div key={department.departmentId} className={`border-b border-brand-border-soft p-3 text-left last:border-b-0 sm:border-b-0 ${index % 2 === 0 ? 'sm:border-r sm:border-brand-border-soft' : ''} ${index < 2 ? 'sm:border-b sm:border-brand-border-soft' : ''}`}>
              <div className="flex items-start justify-between gap-3"><p className="font-semibold text-brand-ink">{department.departmentName}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${densityClasses[densityStatus]}`}>{densityLabels[densityStatus]}</span></div>
              <div className="mt-3 grid grid-cols-3 gap-1 text-sm"><span><strong className="block text-lg tabular-nums text-brand-ink">{patientCount}</strong><span className="text-[11px] text-brand-muted">ผู้ป่วย</span></span><span><strong className="block text-lg tabular-nums text-brand-ink">{activeDoctorCount}/{doctorCount}</strong><span className="text-[11px] text-brand-muted">แพทย์ปฏิบัติงาน</span></span><span><strong className="block text-lg tabular-nums text-brand-ink">{densityPercent}%</strong><span className="text-[11px] text-brand-muted">ความหนาแน่น</span></span></div>
            </div>;
          })}
          </div>
        </div>
      </>}
    </Section>

    <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
      <Section title="สถานะแพทย์ในคลินิก" description="เลือกสถานะเพื่อดูรายชื่อแพทย์ตามสถานะ" action={<DashboardActionLink href="/schedules">ดูตารางแพทย์</DashboardActionLink>}>
        <div className="overflow-x-auto pb-1">
          <div role="group" aria-label="กรองสถานะแพทย์" className="mx-auto flex w-full min-w-max items-end gap-0 border-b border-brand-border-soft">
          {statusOptions.map((option) => {
            const count = statusCounts[option.value];
            const selected = doctorStatusFilter === option.value;
            return <button key={option.value} type="button" aria-pressed={selected} onClick={() => setDoctorStatusFilter(option.value)} className={`relative flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 border-x border-t px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm ${selected ? 'z-10 -mb-px rounded-t-2xl border-brand-border-soft border-t-4 border-t-brand-strong bg-brand-surface text-brand-strong' : 'border-transparent text-brand-body hover:text-brand-ink'}`}>
              <span>{option.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums sm:px-2.5 sm:text-sm ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-brand-page text-brand-muted'}`}>{count}</span>
            </button>;
          })}
          </div>
        </div>
        <div className="mt-3 border-y border-brand-border-soft">
          {(() => {
            const doctorList = departmentDoctors.filter((doctor) => doctor.status === doctorStatusFilter);
            return doctorList.length === 0 ? <p className="px-1 py-4 text-xs text-brand-muted">ยังไม่มีรายชื่อแพทย์ในสถานะนี้</p> : <div className="divide-y divide-brand-border-soft">{doctorList.map((doctor) => <div key={doctor.doctorId} className="flex flex-col gap-2 px-1 py-4 sm:px-2"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-brand-ink">{doctor.doctorName}</p><p className="mt-1 text-xs text-brand-body">{doctor.departmentName}</p>{doctor.status === 'away' && <p className="mt-1 text-[11px] text-brand-muted">ลา / นอกเวลาทำการ</p>}{doctor.status === 'available' && doctor.nextAppointmentTime && <p className="mt-1 text-[11px] text-brand-muted">นัดถัดไป {doctor.nextAppointmentTime} น.</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${doctorStatusClasses[doctor.status]}`}>{doctorStatusLabels[doctor.status]}</span></div><Link href="/schedules" className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg border border-brand-strong bg-white px-3 text-xs font-semibold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">ดูตาราง <ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>)}</div>;
          })()}
        </div>
      </Section>
      <StaffMedicationAlerts view={view} />
    </div>
  </div>;
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
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentQueueFilter>('all');
  const [medicalWorkFilter, setMedicalWorkFilter] = useState<MedicalWorkFilter>('all');
  const [patientSummaryFilter, setPatientSummaryFilter] = useState<PatientMetricFilter | null>(null);
  const [chartMode, setChartMode] = useState<DashboardChartMode>('status');
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>('checking');
  const dashboardWidthClass = 'relative left-1/2 w-screen -translate-x-1/2 px-3 sm:px-6 lg:px-8';
  const refreshDashboard = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setLoading(true);
    setRefreshToken((value) => value + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (role === 'staff_admin') setDatabaseStatus('checking');
      void getDashboardView(role, actorId, bangkokDate(), range)
        .then((viewResult) => {
          if (!cancelled) {
            setView(viewResult);
            setError(null);
            if (role === 'staff_admin') setDatabaseStatus('connected');
          }
        })
        .catch((loadError) => {
          if (!cancelled) {
            setView(null);
            setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูล Dashboard ไม่สำเร็จ');
            if (role === 'staff_admin') setDatabaseStatus('disconnected');
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
    return <div className={`dashboard-shell ${dashboardWidthClass} max-w-none space-y-8 sm:space-y-10`} aria-busy="true" aria-label="กำลังโหลดแดชบอร์ด">{role === 'staff_admin' && <div className="flex justify-end"><DatabaseStatusChip status={databaseStatus} /></div>}<div className="space-y-3 border-b border-brand-border-soft pb-6"><div className="h-8 w-2/5 rounded bg-brand-border-soft" /><div className="h-4 w-3/5 rounded bg-brand-border-soft" /></div>{role !== 'staff_admin' && <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 border-y border-brand-border-soft bg-brand-page/50" />)}</div>}<div className="h-64 border-y border-brand-border-soft bg-brand-page/50" /></div>;
  }

  if (error || !view) {
    return <div className={`dashboard-shell ${dashboardWidthClass} flex min-h-[55vh] max-w-none flex-col items-center justify-center border-y border-rose-200 py-12 text-center`} role="alert">{role === 'staff_admin' && <div className="absolute right-3 top-3 sm:right-6"><DatabaseStatusChip status={databaseStatus} /></div>}<PackageX className="size-10 text-rose-500" /><h1 className="mt-4 text-xl font-bold text-brand-ink">โหลดข้อมูล Dashboard ไม่สำเร็จ</h1><p className="mt-2 text-sm text-status-critical">{error ?? 'ไม่พบข้อมูลสำหรับบทบาทนี้'}</p><button type="button" onClick={() => { setLoading(true); setRefreshToken((value) => value + 1); }} className={`${dashboardButton} mt-5 border-rose-700 bg-rose-700 text-white hover:bg-rose-800`}><RefreshCw className="size-4" /> ลองอีกครั้ง</button></div>;
  }

  const isMedicalDoctorDashboard = role === 'medical' && view.metrics.some((item) => item.id === 'own-appointments');
  const isMedicalPharmacyDashboard = role === 'medical' && !isMedicalDoctorDashboard;
  const selectedAppointmentFilter = isMedicalPharmacyDashboard
    ? medicalWorkFilter === 'appointments' ? 'appointments' : 'all'
    : appointmentFilter;
  const filteredAppointmentQueue = filterAppointmentQueue(view.appointmentQueue, selectedAppointmentFilter, view.date);
  const appointmentStatusValues: AppointmentQueueFilter[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
  const appointmentStatusFilter = appointmentStatusValues.includes(appointmentFilter) ? appointmentFilter : 'all';
  const countByStatus = (status: AppointmentStatus) => view.appointmentStatuses.find((item) => item.status === status)?.count ?? 0;
  const pendingAppointments = countByStatus('pending');
  const confirmedAppointments = countByStatus('confirmed') + countByStatus('in_progress') + countByStatus('completed');
  const confirmationTotal = pendingAppointments + confirmedAppointments;
  const confirmationPercent = confirmationTotal > 0 ? Math.round((confirmedAppointments / confirmationTotal) * 100) : 0;
  const inProgressAppointments = countByStatus('in_progress');
  const completedAppointments = countByStatus('completed');
  const examinationTotal = inProgressAppointments + completedAppointments;
  const examinationPercent = examinationTotal > 0 ? Math.round((completedAppointments / examinationTotal) * 100) : 0;
  const medicalMetricDropdownFilter: MedicalMetricAppointmentFilter | null = isMedicalDoctorDashboard
    && (appointmentFilter === 'appointments' || appointmentFilter === 'remaining' || appointmentFilter === 'completed')
    ? appointmentFilter
    : null;
  const unreadRecentNotifications = view.recentNotifications.filter((notification) => !notification.is_read);
  return (
    <main className={`dashboard-shell ${dashboardWidthClass} flex flex-col gap-5 pb-8 sm:gap-6 sm:pb-10`}>
      <header className="relative flex flex-col gap-4 border-b border-brand-border-soft pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className={`flex items-start gap-3 sm:min-w-0 sm:flex-1 ${role === 'staff_admin' ? 'pr-12 sm:pr-0' : ''}`}>
          <span aria-hidden="true" className="mt-1 h-10 w-1 shrink-0 rounded-full bg-brand-strong" />
          <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-ink sm:text-4xl">{role === 'staff_admin' ? <><span className="block sm:inline">ภาพรวมงานคลินิก</span><span className="block sm:ml-2 sm:inline">ของผู้ดูแลระบบ</span></> : view.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-body">{view.description}</p>
          </div>
        </div>
        <div className={`${role === 'staff_admin' ? 'absolute right-0 top-0 sm:static' : 'self-start'} flex flex-wrap items-center justify-end gap-2 sm:self-start`}>
          {role === 'staff_admin' && <DatabaseStatusChip status={databaseStatus} />}
          <button type="button" aria-label={isRefreshing ? 'กำลังโหลด' : 'รีเฟรช'} onClick={() => void refreshDashboard()} disabled={isRefreshing} className={`${dashboardButton} shrink-0 border-brand-strong bg-brand-strong px-3 text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:px-4`}><RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" /><span className="hidden sm:inline">{isRefreshing ? 'กำลังโหลด…' : 'รีเฟรช'}</span></button>
        </div>
      </header>

      <div className="min-w-0 space-y-8">
        <section className="border-b border-brand-border-soft" aria-label="ตัวกรองแดชบอร์ด">
          <div className="flex flex-col gap-3 py-1.5 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-2 px-1 text-sm font-semibold text-brand-ink"><Filter className="size-4 text-brand-strong" aria-hidden="true" />ช่วงข้อมูล</div>
            <div className="min-w-0 flex-1 overflow-x-auto sm:flex-initial">
              <SegmentedControl
                ariaLabel="เลือกช่วงข้อมูลย้อนหลัง"
                value={range}
                options={(Object.entries(dashboardRangeLabels) as Array<[DashboardRange, string]>).map(([value, label]) => ({ value, label }))}
                onChange={(value) => { if (value !== range) { setLoading(true); setRange(value); } }}
              />
            </div>
            <div className="text-center text-sm font-semibold tabular-nums text-brand-body lg:ml-2">{formatThaiRange(view.startDate, view.date)}</div>
            {role === 'staff_admin' && <div className="min-w-0 sm:ml-auto sm:shrink-0">
              <div className="scrollbar-none min-w-0 overflow-x-auto">
                <SegmentedControl
                  className="w-max max-w-none"
                  ariaLabel="เลือกข้อมูลภาพรวม"
                  value={chartMode}
                  options={[{ value: 'status' as const, label: 'แผนภาพสถานะ' }, { value: 'gender' as const, label: 'แผนภาพเพศ' }]}
                  onChange={setChartMode}
                />
              </div>
            </div>}
          </div>
        </section>

        {role === 'staff_admin' && chartMode === 'status' && <div className="mx-auto grid w-full max-w-[920px] grid-cols-1 items-center gap-4 border-b border-brand-border-soft py-4 sm:grid-cols-2 sm:gap-8" role="group" aria-label="ความคืบหน้านัดหมาย">
          <StatusDonut title="ยืนยันแล้ว" centerPercent={confirmationPercent} slices={[{ label: 'รอยืนยัน', count: pendingAppointments, color: '#e8efed' }, { label: 'ยืนยันแล้ว', count: confirmedAppointments, color: '#087f78' }]} />
          <StatusDonut title="ตรวจเสร็จสิ้น" centerPercent={examinationPercent} slices={[{ label: 'กำลังตรวจ', count: inProgressAppointments, color: '#e8efed' }, { label: 'เสร็จสิ้น', count: completedAppointments, color: '#15803d' }]} />
        </div>}

        {role === 'staff_admin' && chartMode === 'gender' && <div id="staff-gender-summary" className={`${dashboardContentWidthClass} animate-in fade-in slide-in-from-top-2 duration-200`}>
          <GenderSummary patientCounts={view.patientGenderCounts} doctorCounts={view.doctorGenderCounts} />
        </div>}

        {role !== 'staff_admin' && <section aria-label="ข้อมูลสรุป" className="border-b border-brand-border-soft">
          {role === 'medical' ? <div>
            <div className={`grid grid-cols-2 items-stretch ${view.metrics.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
              {view.metrics.map((item) => {
                const metricFilter: MedicalWorkFilter | undefined = item.id === 'own-appointments' || item.id === 'appointments-in-range'
                  ? 'appointments'
                  : item.id === 'own-queue'
                    ? 'remaining'
                    : item.id === 'completed-in-range'
                      ? 'completed'
                      : item.id === 'pending-dispensing'
                        ? 'prescriptions'
                        : item.id === 'low-stock'
                          ? 'low-stock'
                          : item.id === 'expired'
                            ? 'expired'
                            : undefined;
                const selectedFilter = isMedicalPharmacyDashboard ? medicalWorkFilter : appointmentFilter;
                return <MedicalMetricItem
                  key={item.id}
                  item={item}
                  selected={Boolean(metricFilter && selectedFilter === metricFilter)}
                  onSelect={metricFilter ? () => {
                    if (isMedicalPharmacyDashboard) {
                      setMedicalWorkFilter((current) => current === metricFilter ? 'all' : metricFilter);
                    } else {
                      setAppointmentFilter((current) => current === metricFilter ? 'all' : metricFilter as AppointmentQueueFilter);
                    }
                  } : undefined}
                />;
              })}
            </div>
            {medicalMetricDropdownFilter && <MedicalMetricDropdown appointments={view.appointmentQueue} date={view.date} filter={medicalMetricDropdownFilter} />}
          </div> : <div>
            <div className={`grid grid-cols-2 items-stretch gap-2 ${view.metrics.filter((item) => role !== 'patient' || item.id !== 'unread-notifications').length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            {view.metrics.filter((item) => role !== 'patient' || item.id !== 'unread-notifications').map((item) => {
              if (role === 'patient') {
                const patientFilter: PatientMetricFilter | null = item.id === 'my-medications' ? 'medications' : item.id === 'next-appointment' ? 'appointment' : null;
                if (patientFilter) return <PatientMetricItem key={item.id} item={item} selected={patientSummaryFilter === patientFilter} onSelect={() => setPatientSummaryFilter((current) => current === patientFilter ? null : patientFilter)} />;
              }
              const metricFilter = item.id === 'own-appointments'
                ? 'appointments'
                : item.id === 'own-queue'
                  ? 'remaining'
                  : item.id === 'completed-in-range'
                    ? 'completed'
                    : null;
              const content = (selected = false) => <><span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-white/15 text-white' : metricToneClasses[item.tone]}`}><MetricIcon id={item.id} /></span><span className="min-w-0"><p className="text-3xl font-bold leading-none tabular-nums">{item.value}</p><p className="mt-2 text-xs font-medium leading-5">{item.label}</p></span><span className="sr-only">{item.description}</span></>;

              if (!isMedicalDoctorDashboard || !metricFilter) {
                return <div key={item.id} className="flex min-h-24 items-center gap-3 px-5 py-4 text-brand-ink">{content()}</div>;
              }

              return <button key={item.id} type="button" aria-pressed={appointmentFilter === metricFilter} onClick={() => setAppointmentFilter((current) => current === metricFilter ? 'all' : metricFilter)} className={`${dashboardControlShape} flex min-h-24 w-full items-center gap-3 px-5 py-4 text-left ${appointmentFilter === metricFilter ? 'border-brand-strong bg-brand-strong text-white shadow-sm' : 'border-brand-border-strong bg-white text-brand-ink hover:bg-brand-soft'}`}>{content(appointmentFilter === metricFilter)}</button>;
            })}
            </div>
            {role === 'patient' && patientSummaryFilter && <PatientMetricDropdown view={view} filter={patientSummaryFilter} />}
          </div>}
        </section>}

          {role === 'patient' ? <PatientDashboardContent view={view} onRefresh={refreshDashboard} /> : <>
          {role === 'medical' ? <Section title={<span className="flex items-center gap-2">{rangeHeading('การแจ้งเตือน', view.range)}<span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">{view.unreadNotificationCount ?? 0} ยังไม่อ่าน</span></span>} action={<DashboardActionLink href="/notifications">ดูทั้งหมด</DashboardActionLink>}>
            {unreadRecentNotifications.length === 0 ? <EmptyState message="ไม่มีการแจ้งเตือนที่ยังไม่ได้อ่าน" /> : <div className="max-h-56 divide-y divide-brand-border-soft overflow-y-auto">{unreadRecentNotifications.map((notification) => <div key={notification.id} className="flex gap-3 px-1 py-2.5"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-strong" /><div className="min-w-0"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><p className="text-sm font-medium text-brand-ink">{notification.title}</p><time dateTime={notification.created_at} className="text-[11px] text-brand-muted">{formatThaiDateTime(notification.created_at)} น.</time></div><p className="mt-0.5 line-clamp-1 text-xs text-brand-body">{notification.message}</p></div></div>)}</div>}
          </Section> : <Section className={dashboardContentWidthClass} title={rangeHeading('สถานะนัดหมาย', view.range)} description="เลือกสถานะเพื่อดูรายชื่อผู้ป่วย แพทย์ และรายละเอียดนัดหมาย" action={<DashboardActionLink href="/appointments">จัดการนัดหมาย</DashboardActionLink>}>
            <div className="overflow-x-auto">
              <div role="group" aria-label="เลือกสถานะนัดหมาย" className="mx-auto flex w-full min-w-max items-end gap-0 border-b border-brand-border-soft">
                <button type="button" aria-pressed={appointmentStatusFilter === 'all'} onClick={() => setAppointmentFilter('all')} className={`relative flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 border-x border-t px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm ${appointmentStatusFilter === 'all' ? 'z-10 -mb-px rounded-t-2xl border-brand-border-soft border-t-4 border-t-brand-strong bg-brand-surface text-brand-strong' : 'border-transparent text-brand-body hover:text-brand-ink'}`}>
                  <span>ทั้งหมด</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums sm:px-2.5 sm:text-sm ${appointmentStatusFilter === 'all' ? 'bg-brand-soft text-brand-strong' : 'bg-brand-page text-brand-muted'}`}>{view.appointmentStatuses.reduce((total, item) => total + item.count, 0)}</span>
                </button>
                {view.appointmentStatuses.map((item) => {
                  const statusFilter = item.status as AppointmentQueueFilter;
                  if (!appointmentStatusValues.includes(statusFilter)) return null;
                  const selected = appointmentStatusFilter === statusFilter;
                  return <button key={item.status} type="button" aria-pressed={selected} onClick={() => setAppointmentFilter(statusFilter)} className={`relative flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 border-x border-t px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm ${selected ? 'z-10 -mb-px rounded-t-2xl border-brand-border-soft border-t-4 border-t-brand-strong bg-brand-surface text-brand-strong' : 'border-transparent text-brand-body hover:text-brand-ink'}`}>
                    <span>{item.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums sm:px-2.5 sm:text-sm ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-brand-page text-brand-muted'}`}>{item.count}</span>
                  </button>;
                })}
              </div>
            </div>
          </Section>}

      {role === 'medical' && isMedicalDoctorDashboard && <Section title="ผู้ป่วยถัดไป" description="นัดหมายถัดไปที่ยังไม่ถึงเวลา เพื่อเปิดงานต่อได้ทันที" action={<DashboardActionLink href="/appointments">ดูตารางทั้งหมด</DashboardActionLink>}>
        {view.nextAppointment ? <div className="flex flex-col gap-4 px-1 py-5 sm:flex-row sm:items-center sm:justify-between"><div className="grid flex-1 gap-4 sm:grid-cols-4"><div><p className="text-xs text-brand-muted">เวลา</p><p className="mt-1 text-lg font-semibold text-brand-ink">{view.nextAppointment.startTime} น.</p><p className="text-xs text-brand-muted">{formatThaiDate(view.nextAppointment.date)}</p></div><div><p className="text-xs text-brand-muted">คิว</p><p className="mt-1 text-lg font-semibold tabular-nums text-brand-ink">{view.nextAppointment.queueNumber ? `#${view.nextAppointment.queueNumber}` : '—'}</p></div><div><p className="text-xs text-brand-muted">ผู้ป่วย</p><p className="mt-1 font-semibold text-brand-ink">{view.nextAppointment.patientName}</p></div><div><p className="text-xs text-brand-muted">แผนก</p><p className="mt-1 font-medium text-brand-body">{view.nextAppointment.departmentName}</p></div></div><Link href={`/records?appointment=${encodeURIComponent(view.nextAppointment.id)}`} className={`${dashboardSecondaryButton} shrink-0 border-brand-strong bg-brand-strong text-white hover:bg-brand-hover`}>เปิดรายละเอียด <ExternalLink className="size-4" aria-hidden="true" /></Link></div> : <EmptyState message="ไม่มีผู้ป่วยที่กำลังจะมาถึง" />}
      </Section>}

      {((role === 'medical' && ((isMedicalDoctorDashboard && !medicalMetricDropdownFilter) || medicalWorkFilter === 'appointments')) || role === 'staff_admin') && <Section className={dashboardContentWidthClass} hideHeader={role === 'staff_admin'} title={role === 'medical' ? 'คิวและนัดหมายของฉัน' : 'คิวและนัดหมายล่าสุด'} description={`แสดงข้อมูลจำเป็นต่อการทำงานในช่วง ${dashboardRangeLabels[view.range]} โดยไม่เปิดเผยผลตรวจ`} action={<DashboardActionLink href="/appointments">{role === 'medical' ? 'ดูนัดหมายทั้งหมด' : 'จัดการนัดหมาย'}</DashboardActionLink>}>{filteredAppointmentQueue.length === 0 ? <EmptyState message={appointmentFilter === 'today' ? 'ไม่มีนัดหมายวันนี้' : appointmentFilter === 'remaining' ? 'ไม่มีคิวที่เหลือ' : appointmentFilter === 'pending' ? 'ไม่มีผู้ป่วยที่รอยืนยัน' : appointmentFilter === 'confirmed' ? 'ไม่มีผู้ป่วยที่ยืนยันแล้ว' : appointmentFilter === 'in_progress' ? 'ไม่มีรายการที่กำลังตรวจ' : appointmentFilter === 'completed' ? 'ยังไม่มีนัดที่ตรวจเสร็จ' : appointmentFilter === 'cancelled' ? 'ไม่มีนัดที่ยกเลิก' : appointmentFilter === 'no_show' ? 'ไม่มีผู้ป่วยที่ไม่มาตามนัด' : appointmentFilter === 'served' ? 'ยังไม่มีผู้ป่วยที่เข้ารับบริการจริง' : 'ไม่มีนัดหมายในช่วงที่เลือก'} /> : <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[80px_120px_1.2fr_1fr_130px] gap-4 border-b border-brand-border-soft px-5 py-3 text-xs font-semibold text-brand-muted"><span>คิว</span><span>วันเวลา</span><span>ผู้ป่วย</span><span>{role === 'medical' ? 'แผนก' : 'แพทย์ / แผนก'}</span><span>สถานะ</span></div><div className="divide-y divide-brand-border-soft">{filteredAppointmentQueue.map((item) => <div key={item.id} className="grid grid-cols-[80px_120px_1.2fr_1fr_130px] items-center gap-4 px-5 py-4 text-sm"><span className="font-bold tabular-nums text-brand-ink">{item.queueNumber ? `#${item.queueNumber}` : '—'}</span><span className="text-brand-body"><span className="block">{new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00+07:00`))}</span><span className="text-xs text-brand-muted">{item.startTime} น.</span></span><span className="font-semibold text-brand-ink">{item.patientName}{role === 'medical' && isMedicalDoctorDashboard && <Link href={`/records?appointment=${encodeURIComponent(item.id)}`} className="mt-1 block text-xs font-semibold text-brand-strong hover:underline">เปิดรายละเอียด</Link>}</span><span className="text-brand-body">{role === 'medical' ? item.departmentName : <>{item.doctorName}<span className="block text-xs text-brand-muted">{item.departmentName}</span></>}</span><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses[item.status]}`}>{appointmentStatusLabels[item.status]}</span></div>)}</div></div></div>}</Section>}

      {role === 'staff_admin' && <ClinicOverviewSections view={view} />}

      {role === 'medical' && <MedicalPharmacySections view={view} filter={isMedicalPharmacyDashboard ? medicalWorkFilter : 'all'} includePrescriptions={isMedicalPharmacyDashboard} />}

          </>}

      </div>

    </main>
  );
}
