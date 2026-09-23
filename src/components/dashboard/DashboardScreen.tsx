'use client';

import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Filter, MapPin, PackageCheck, PackageX, Pill, RefreshCw, Stethoscope,
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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
} from '@/services/dashboardService';
import type { AppointmentStatus } from '@/types/database';
import SegmentedControl from '@/components/common/SegmentedControl';
import Toast from '@/components/common/Toast';

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: 'รอการยืนยัน', confirmed: 'ยืนยันแล้ว', in_progress: 'กำลังตรวจ', completed: 'ตรวจเสร็จแล้ว',
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

function bangkokDateAndTime(dateTime: Date): { date: string; startTime: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Bangkok',
  }).formatToParts(dateTime);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, startTime: `${value.hour}:${value.minute}` };
}

function toBangkokDateString(dateTime: string): string {
  try {
    const d = new Date(dateTime);
    if (Number.isNaN(d.getTime())) return dateTime.slice(0, 10);
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Bangkok',
    }).formatToParts(d);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return dateTime.slice(0, 10);
  }
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
type MedicalWorkFilter = 'all' | 'appointments' | 'remaining' | 'in_progress' | 'completed' | 'prescriptions' | 'low-stock' | 'expired';
type MedicationAlertFilter = 'all' | 'low-stock' | 'expired';
type DashboardAppointment = DashboardView['appointmentQueue'][number];
type PatientTreatmentHistoryRecord = NonNullable<DashboardView['patientTreatmentHistory']>[number];
const appointmentPageSize = 3;

const upcomingAppointmentStatuses: ReadonlySet<AppointmentStatus> = new Set(['pending', 'confirmed', 'in_progress']);

function appointmentStartTimestamp(appointment: DashboardAppointment): number | null {
  const timestamp = new Date(`${appointment.date}T${appointment.startTime.slice(0, 5)}:00+07:00`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatAppointmentCountdownValue(appointment: DashboardAppointment, nowTimestamp: number): string {
  const startTimestamp = appointmentStartTimestamp(appointment);
  if (startTimestamp === null) return '—';
  const remainingMinutes = Math.ceil((startTimestamp - nowTimestamp) / 60_000);
  if (remainingMinutes <= 0) return 'ถึงเวลานัดแล้ว';

  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const parts = [
    days > 0 ? `${days} วัน` : null,
    hours > 0 ? `${hours} ชม.` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(' ') : 'น้อยกว่า 1 ชม.';
}

export function getUpcomingAppointmentsWithinWindow(
  queue: DashboardView['appointmentQueue'],
  now = new Date(),
  windowMinutes = 30,
): DashboardView['appointmentQueue'] {
  const nowTimestamp = now.getTime();
  const windowEnd = nowTimestamp + windowMinutes * 60 * 1000;
  if (Number.isNaN(nowTimestamp) || windowMinutes <= 0) return [];

  return queue
    .filter((appointment) => upcomingAppointmentStatuses.has(appointment.status))
    .map((appointment) => ({ appointment, timestamp: appointmentStartTimestamp(appointment) }))
    .filter((entry): entry is { appointment: DashboardAppointment; timestamp: number } => entry.timestamp !== null && entry.timestamp > nowTimestamp && entry.timestamp <= windowEnd)
    .sort((left, right) => left.timestamp - right.timestamp)
    .map(({ appointment }) => appointment);
}

export function sortAppointmentsByStartTime(
  queue: DashboardView['appointmentQueue'],
): DashboardView['appointmentQueue'] {
  return [...queue].sort((left, right) => {
    const leftTimestamp = appointmentStartTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTimestamp = appointmentStartTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftTimestamp !== rightTimestamp) return leftTimestamp - rightTimestamp;
    const leftQueueNumber = left.queueNumber ?? Number.MAX_SAFE_INTEGER;
    const rightQueueNumber = right.queueNumber ?? Number.MAX_SAFE_INTEGER;
    return leftQueueNumber - rightQueueNumber || left.id.localeCompare(right.id);
  });
}

export function createUpcomingToastPreviewAppointments(now = new Date()): DashboardView['appointmentQueue'] {
  return [15, 25].map((minutes, index) => {
    const slot = bangkokDateAndTime(new Date(now.getTime() + minutes * 60 * 1000));
    return {
      id: `preview-upcoming-toast-${index + 1}`,
      queueNumber: 901 + index,
      date: slot.date,
      startTime: slot.startTime,
      status: 'confirmed' as const,
      patientName: `ผู้ป่วยทดสอบ Toast ${index + 1}`,
      doctorName: 'แพทย์ที่เข้าสู่ระบบ',
      departmentName: 'เวชทั่วไป',
    };
  });
}

export function filterAppointmentQueue(
  queue: DashboardView['appointmentQueue'],
  filter: AppointmentQueueFilter,
  date: string,
): DashboardView['appointmentQueue'] {
  if (filter === 'appointments') return queue.filter((item) => item.date === date);
  if (filter === 'today') return queue.filter((item) => item.date === date);
  if (filter === 'remaining') return queue.filter((item) => item.status === 'confirmed' || item.status === 'in_progress');
  if (filter === 'pending' || filter === 'confirmed' || filter === 'in_progress' || filter === 'completed' || filter === 'cancelled' || filter === 'no_show') return queue.filter((item) => item.status === filter);
  if (filter === 'served') return queue.filter((item) => item.status === 'in_progress' || item.status === 'completed');
  return queue;
}

function filterAppointmentsWithinDateRange(
  queue: DashboardView['appointmentQueue'],
  startDate: string,
  endDate: string,
): DashboardView['appointmentQueue'] {
  return queue.filter((appointment) => appointment.date >= startDate && appointment.date <= endDate);
}

const patientSectionTitleClass = 'text-base font-semibold text-brand-ink sm:text-lg';
const patientSectionDescriptionClass = 'mt-1 text-xs leading-5 text-brand-muted sm:text-sm';

function Section({ title, description, action, children, className = '', headerClassName = '', hideHeader = false, titleClassName = 'text-lg font-semibold text-brand-ink', descriptionClassName = 'mt-1 text-xs leading-5 text-brand-muted' }: {
  title?: ReactNode; description?: string; action?: ReactNode; children: ReactNode; className?: string; headerClassName?: string; hideHeader?: boolean; titleClassName?: string; descriptionClassName?: string;
}) {
  return (
    <section className={`overflow-hidden ${className}`}>
      {!hideHeader && <div className={`flex items-start justify-between gap-3 border-b border-brand-border-soft pb-3 ${headerClassName}`}>
        <div className="min-w-0"><h2 className={titleClassName}>{title}</h2>{description && <p className={descriptionClassName}>{description}</p>}</div>
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

const dashboardControlShape = 'rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';
const dashboardButton = `inline-flex min-h-11 items-center justify-center gap-2 ${dashboardControlShape} px-4 text-sm font-semibold`;
const dashboardSecondaryButton = `${dashboardButton} border-brand-border-strong bg-white text-brand-strong hover:bg-brand-soft`;
const dashboardContentWidthClass = 'mx-auto w-full max-w-[1600px]';

function DashboardActionLink({
  href,
  children = 'ดูทั้งหมด',
  compactOnMobile = false,
}: {
  href: string;
  children?: ReactNode;
  compactOnMobile?: boolean;
}) {
  return <Link href={href} className={`inline-flex shrink-0 whitespace-nowrap items-center justify-center rounded-lg border border-brand-strong bg-brand-strong font-semibold text-white transition hover:bg-brand-hover ${compactOnMobile ? 'min-h-8 gap-1 px-2.5 text-[11px]' : 'min-h-9 gap-1.5 px-3 text-xs'} sm:min-h-10 sm:gap-2 sm:px-3.5 sm:text-sm`}>
    {children}
    <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" />
  </Link>;
}

function MetricIcon({ id }: { id: string }) {
  if (id.includes('appointment')) return <CalendarDays className="size-5 shrink-0" aria-hidden="true" />;
  if (id.includes('medication')) return <Pill className="size-5 shrink-0" aria-hidden="true" />;
  if (id.includes('reminder')) return <Clock3 className="size-5 shrink-0" aria-hidden="true" />;
  if (id.includes('notification')) return <Bell className="size-5 shrink-0" aria-hidden="true" />;
  return <ClipboardCheck className="size-5 shrink-0" aria-hidden="true" />;
}

function MedicalMetricItem({ item, selected, onSelect }: {
  item: DashboardMetric;
  selected: boolean;
  onSelect?: () => void;
}) {
  const className = `relative flex h-36 min-h-36 w-full flex-col justify-center rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:h-32 ${selected ? 'border-brand-strong bg-brand-soft text-brand-strong shadow-sm' : 'border-transparent text-brand-ink hover:border-brand-border-soft hover:bg-brand-page'}`;
  const content = <>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="break-words line-clamp-2 text-sm font-medium leading-5">{item.label}</p>
        <p className="mt-1 break-words line-clamp-2 text-xs leading-4 text-brand-muted">{item.description}</p>
      </div>
      <MetricIcon id={item.id} />
    </div>
    <p className="mt-2 text-3xl font-bold leading-none tabular-nums sm:mt-3">{item.value}</p>
    {onSelect && <ChevronDown className={`absolute bottom-2 right-3 size-4 ${selected ? 'text-brand-strong' : 'text-brand-muted'}`} aria-hidden="true" />}
  </>;

  if (onSelect) {
    return <button type="button" aria-pressed={selected} onClick={onSelect} className={className}>{content}</button>;
  }

  return <div className={className}>{content}</div>;
}

type MedicalMetricAppointmentFilter = Extract<AppointmentQueueFilter, 'appointments' | 'remaining' | 'in_progress' | 'completed'>;
function PatientNextAppointmentSummary({
  appointments,
  fallbackAppointment,
}: {
  appointments?: DashboardView['upcomingAppointments'];
  fallbackAppointment?: DashboardView['nextAppointment'];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const appointmentList = appointments && appointments.length > 0
    ? appointments
    : fallbackAppointment
      ? [fallbackAppointment]
      : [];
  const activeIndex = Math.min(selectedIndex, Math.max(0, appointmentList.length - 1));
  const appointment = appointmentList[activeIndex] ?? null;
  const hasMultipleAppointments = appointmentList.length > 1;
  const countdownValue = appointment ? formatAppointmentCountdownValue(appointment, nowTimestamp) : null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [appointments, fallbackAppointment]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTimestamp(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="rounded-2xl sm:rounded-3xl border border-brand-border-soft bg-brand-surface p-3 sm:p-4 shadow-xs transition-all" role="region" aria-label="นัดหมายถัดไป">
    {!appointment ? <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="pr-36 sm:pr-0">
        <p className="text-xs sm:text-sm font-semibold text-brand-muted">นัดหมายถัดไป</p>
        <p className="mt-0.5 text-sm sm:text-base font-semibold text-brand-ink">ยังไม่มีนัดหมายที่กำลังจะถึง</p>
      </div>
      <Link href="/appointments" className="absolute right-0 top-0 inline-flex min-h-8 w-fit items-center justify-center gap-1 px-2.5 rounded-lg border border-brand-strong bg-white text-[11px] font-semibold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:static sm:min-h-10 sm:gap-2 sm:rounded-brand-button sm:px-3.5 sm:text-sm">ดูนัดหมายทั้งหมด <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" /></Link>
    </div> : <div className="relative flex flex-col gap-2.5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong"><CalendarDays className="size-4 sm:size-5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-muted">นัดหมายถัดไป{hasMultipleAppointments && ` · ${activeIndex + 1}/${appointmentList.length}`}</p>
          <p className="text-lg font-bold leading-tight text-brand-ink sm:text-xl">คิว #{appointment.queueNumber ?? '—'}</p>
        </div>
        </div>
        <Link href="/appointments" className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-brand-strong bg-brand-strong px-2.5 text-[11px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:min-h-9 sm:gap-2 sm:px-3 sm:text-xs">ดูนัดหมาย <ArrowRight className="size-3.5 sm:size-4" aria-hidden="true" /></Link>
      </div>
      <dl className="grid grid-cols-2 items-center gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)]" aria-label="รายละเอียดวันเวลาและข้อมูลนัดหมาย">
        <div className="col-span-2 min-w-0 rounded-xl border border-brand-border-soft bg-brand-page/45 px-3 py-2.5 sm:col-span-1 sm:px-4 sm:py-3">
          <dt className="text-xs font-medium text-brand-muted">วันนัด</dt>
          <dd className="mt-1 break-words text-base font-bold leading-6 text-brand-ink sm:text-lg">{formatThaiDate(appointment.date)}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-brand-border-soft bg-brand-page/45 px-3 py-2.5 sm:px-4 sm:py-3">
          <dt className="text-xs font-medium text-brand-muted">เวลา</dt>
          <dd className="mt-1 text-lg font-bold leading-6 text-brand-ink sm:text-xl">{appointment.startTime.slice(0, 5)} น.</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-brand-strong/35 bg-brand-soft/55 px-3 py-2.5 sm:px-4 sm:py-3">
          <dt className="flex items-center gap-1 text-xs font-semibold text-brand-strong"><Clock3 className="size-3.5 shrink-0" aria-hidden="true" />เหลือเวลา</dt>
          <dd className="mt-1 text-lg font-bold leading-6 text-brand-strong sm:text-xl">{countdownValue}</dd>
        </div>
        <div className="min-w-0 px-1 py-1.5 lg:px-2"><dt className="text-[11px] text-brand-muted sm:text-xs">แพทย์</dt><dd className="mt-0.5 break-words text-sm font-semibold leading-5 text-brand-ink">{appointment.doctorName}</dd></div>
        <div className="min-w-0 px-1 py-1.5 lg:px-2"><dt className="text-[11px] text-brand-muted sm:text-xs">แผนก</dt><dd className="mt-0.5 truncate text-sm font-semibold text-brand-ink">{appointment.departmentName}</dd></div>
        <div className="col-span-2 min-w-0 px-1 py-1.5 sm:col-span-1 lg:px-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0"><dt className="text-[11px] text-brand-muted sm:text-xs">สถานะ</dt><dd className="mt-0.5"><span className={`inline-flex rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs sm:text-sm font-semibold ${appointmentStatusClasses[appointment.status]}`}>{appointmentStatusLabels[appointment.status]}</span></dd></div>
            <div className="flex shrink-0 items-center gap-1 lg:absolute lg:right-[7.5rem] lg:top-0" aria-label="เลื่อนดูนัดหมาย">
              <button type="button" aria-label="นัดหมายก่อนหน้า" title="นัดหมายก่อนหน้า" disabled={activeIndex === 0} onClick={() => setSelectedIndex((current) => Math.max(0, current - 1))} className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-strong bg-brand-strong text-white shadow-sm transition-colors hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-brand-border-soft disabled:bg-brand-page disabled:text-brand-muted disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong focus-visible:ring-2 focus-visible:ring-brand-strong/50 sm:size-10"><ChevronLeft className="size-4 sm:size-5" aria-hidden="true" /></button>
              <button type="button" aria-label="นัดหมายถัดไป" title="นัดหมายถัดไป" disabled={activeIndex === appointmentList.length - 1} onClick={() => setSelectedIndex((current) => Math.min(appointmentList.length - 1, current + 1))} className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-strong bg-brand-strong text-white shadow-sm transition-colors hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-brand-border-soft disabled:bg-brand-page disabled:text-brand-muted disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong focus-visible:ring-2 focus-visible:ring-brand-strong/50 sm:size-10"><ChevronRight className="size-4 sm:size-5" aria-hidden="true" /></button>
            </div>
          </div>
        </div>
      </dl>
    </div>}
  </div>;
}

function MedicalNextAppointmentSummary({
  appointments,
  fallbackAppointment,
}: {
  appointments?: DashboardView['upcomingAppointments'];
  fallbackAppointment?: DashboardView['nextAppointment'];
}) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const appointmentList = appointments && appointments.length > 0
    ? appointments
    : fallbackAppointment
      ? [fallbackAppointment]
      : [];
  const selectedIndex = appointmentList.findIndex((candidate) => candidate.id === selectedAppointmentId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const appointment = appointmentList[activeIndex] ?? null;
  const hasMultipleAppointments = appointmentList.length > 1;

  return <div className="rounded-2xl border border-brand-border-soft bg-brand-surface p-3 shadow-xs transition-all sm:rounded-3xl sm:p-4" role="region" aria-label="คิวถัดไปที่ต้องตรวจ">
    {!appointment ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-brand-muted sm:text-sm">คิวถัดไปที่ต้องตรวจ</p>
        <p className="mt-0.5 text-sm font-semibold text-brand-ink sm:text-base">วันนี้ไม่มีคิวที่ต้องตรวจ</p>
      </div>
    </div> : <div className="relative flex flex-col gap-2.5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong sm:size-11"><Stethoscope className="size-4 sm:size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand-muted">คิวถัดไปที่ต้องตรวจ{hasMultipleAppointments && ` · ${activeIndex + 1}/${appointmentList.length}`}</p>
            <p className="text-lg font-bold leading-tight text-brand-ink sm:text-xl">คิว #{appointment.queueNumber ?? '—'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" aria-label="เลื่อนดูคิว">
          <button type="button" aria-label="คิวก่อนหน้า" title="คิวก่อนหน้า" disabled={activeIndex === 0} onClick={() => setSelectedAppointmentId(appointmentList[activeIndex - 1]?.id ?? null)} className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-strong bg-brand-strong text-white shadow-sm transition-colors hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-brand-border-soft disabled:bg-brand-page disabled:text-brand-muted disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong focus-visible:ring-2 focus-visible:ring-brand-strong/50 sm:size-10"><ChevronLeft className="size-4 sm:size-5" aria-hidden="true" /></button>
          <button type="button" aria-label="คิวถัดไป" title="คิวถัดไป" disabled={activeIndex === appointmentList.length - 1} onClick={() => setSelectedAppointmentId(appointmentList[activeIndex + 1]?.id ?? null)} className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-strong bg-brand-strong text-white shadow-sm transition-colors hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:border-brand-border-soft disabled:bg-brand-page disabled:text-brand-muted disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong focus-visible:ring-2 focus-visible:ring-brand-strong/50 sm:size-10"><ChevronRight className="size-4 sm:size-5" aria-hidden="true" /></button>
        </div>
      </div>
      <dl className="grid grid-cols-2 items-center gap-2 sm:grid-cols-3" aria-label="รายละเอียดคิวถัดไป">
        <div className="col-span-2 min-w-0 rounded-xl border border-brand-border-soft bg-brand-page/45 px-3 py-2.5 sm:col-span-1 sm:px-4 sm:py-3">
          <dt className="text-xs font-medium text-brand-muted">วันที่</dt>
          <dd className="mt-1 break-words text-base font-bold leading-6 text-brand-ink sm:text-lg">{formatThaiDate(appointment.date)}</dd>
        </div>
        <div className="min-w-0 rounded-xl border border-brand-border-soft bg-brand-page/45 px-3 py-2.5 sm:px-4 sm:py-3">
          <dt className="text-xs font-medium text-brand-muted">เวลา</dt>
          <dd className="mt-1 text-lg font-bold leading-6 text-brand-ink sm:text-xl">{appointment.startTime.slice(0, 5)} น.</dd>
        </div>
        <div className="col-span-2 min-w-0 rounded-xl border border-brand-strong/35 bg-brand-soft/55 px-3 py-2.5 sm:col-span-1 sm:px-4 sm:py-3">
          <dt className="text-xs font-semibold text-brand-strong">ผู้ป่วย</dt>
          <dd className="mt-1 break-words text-base font-bold leading-6 text-brand-ink sm:text-lg">{appointment.patientName}</dd>
        </div>
      </dl>
    </div>}
  </div>;
}

function MedicalMetricDropdown({
  appointments,
  startDate,
  date,
  range,
  filter,
}: {
  appointments: DashboardView['appointmentQueue'];
  startDate: string;
  date: string;
  range: DashboardRange;
  filter: MedicalMetricAppointmentFilter;
}) {
  const [pagesByGroup, setPagesByGroup] = useState<Record<string, number>>({});
  const rangeAppointments = filterAppointmentsWithinDateRange(appointments, startDate, date);
  const filteredAppointments = sortAppointmentsByStartTime(filter === 'appointments' ? rangeAppointments : filterAppointmentQueue(rangeAppointments, filter, date));
  const heading = filter === 'appointments'
    ? rangeHeading('นัดของฉัน', range)
    : filter === 'remaining'
      ? range === 'today' ? 'คิวของฉันที่เหลือ' : 'คิวของฉันในช่วงที่เลือก'
      : filter === 'in_progress'
        ? rangeHeading('กำลังตรวจ', range)
        : rangeHeading('ตรวจเสร็จ', range);
  const appointmentGroups = filter === 'appointments'
    ? [
      { status: 'pending' as const, label: 'รอการยืนยัน', appointments: filteredAppointments.filter((appointment) => appointment.status === 'pending') },
      { status: 'confirmed' as const, label: 'ยืนยันแล้ว', appointments: filteredAppointments.filter((appointment) => appointment.status === 'confirmed') },
      ...(() => {
        const otherAppointments = filteredAppointments.filter((appointment) => appointment.status !== 'pending' && appointment.status !== 'confirmed');
        return otherAppointments.length > 0 ? [{ status: 'other' as const, label: 'สถานะอื่น ๆ', appointments: otherAppointments }] : [];
      })(),
    ]
    : [];
  const renderAppointmentCard = (appointment: DashboardView['appointmentQueue'][number]) => <Link key={appointment.id} href={`/records?appointment=${encodeURIComponent(appointment.id)}`} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-brand-border-soft bg-white px-4 py-4 transition hover:border-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-brand-ink">{appointment.patientName}</span><span className="mt-1 block truncate text-xs text-brand-body">คิว #{appointment.queueNumber ?? '—'} · {appointment.departmentName}</span></span>
    <span className="shrink-0 text-right text-xs text-brand-muted"><span className="block font-semibold text-brand-ink">{appointment.startTime} น.</span><span className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium ${appointmentStatusClasses[appointment.status]}`}>{appointmentStatusLabels[appointment.status]}<ChevronRight className="size-3" aria-hidden="true" /></span></span>
  </Link>;

  return <div className="border-x border-b border-brand-border-soft bg-brand-page/45 px-4 py-4 sm:px-5" role="region" aria-label={`รายชื่อผู้ป่วย${heading}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm text-brand-muted">พบ {filteredAppointments.length} รายการ</p>
      </div>
      <DashboardActionLink href="/appointments">ดูนัดหมายทั้งหมด</DashboardActionLink>
    </div>
    {filteredAppointments.length === 0 ? <p className="py-5 text-center text-sm text-brand-muted">ไม่พบผู้ป่วยในสถานะนี้</p> : filter === 'appointments' ? <div className="mt-3 space-y-4">
      {appointmentGroups.map((group) => {
        const pageCount = Math.max(1, Math.ceil(group.appointments.length / appointmentPageSize));
        const currentPage = Math.min(pagesByGroup[group.status] ?? 0, pageCount - 1);
        const visibleAppointments = group.appointments.slice(currentPage * appointmentPageSize, (currentPage + 1) * appointmentPageSize);
        const canGoPrevious = currentPage > 0;
        const canGoNext = currentPage < pageCount - 1;

        return <div key={group.status} role="group" aria-label={`รายการ${group.label}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-brand-ink">{group.label}</p>
            <span className="rounded-full bg-brand-page px-2 py-0.5 text-[11px] font-semibold tabular-nums text-brand-muted">{group.appointments.length}</span>
          </div>
          <div className="flex items-center gap-1">
            {pageCount > 1 && <span className="mr-1 text-[11px] tabular-nums text-brand-muted">{currentPage + 1}/{pageCount}</span>}
            <button type="button" aria-label={`รายการ${group.label}ก่อนหน้า`} title="ก่อนหน้า" disabled={!canGoPrevious} onClick={() => setPagesByGroup((current) => ({ ...current, [group.status]: currentPage - 1 }))} className="flex size-8 items-center justify-center rounded-lg border border-brand-border-soft bg-white text-brand-strong transition hover:border-brand-strong hover:bg-brand-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-35">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" aria-label={`รายการ${group.label}ถัดไป`} title="ถัดไป" disabled={!canGoNext} onClick={() => setPagesByGroup((current) => ({ ...current, [group.status]: currentPage + 1 }))} className="flex size-8 items-center justify-center rounded-lg border border-brand-border-soft bg-white text-brand-strong transition hover:border-brand-strong hover:bg-brand-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-35">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {group.appointments.length === 0 ? <p className="rounded-lg border border-dashed border-brand-border-soft px-3 py-3 text-xs text-brand-muted">ไม่พบรายการ</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleAppointments.map(renderAppointmentCard)}
        </div>}
      </div>;
      })}
    </div> : <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {filteredAppointments.map(renderAppointmentCard)}
    </div>}
  </div>;
}

function UpcomingAppointmentToast({ appointments, isPreview = false }: { appointments: DashboardView['appointmentQueue']; isPreview?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const upcomingAppointments = getUpcomingAppointmentsWithinWindow(appointments, now);
  const selectedIndex = Math.max(0, upcomingAppointments.findIndex((appointment) => appointment.id === selectedAppointmentId));
  const appointment = upcomingAppointments[selectedIndex];

  if (!appointment) return null;

  const startTimestamp = appointmentStartTimestamp(appointment) ?? now.getTime();
  const minutesUntil = Math.max(1, Math.ceil((startTimestamp - now.getTime()) / 60_000));
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex < upcomingAppointments.length - 1;

  return <aside className="w-full min-w-0 sm:ml-auto sm:w-auto sm:flex-1 sm:max-w-[28rem] lg:max-w-[34rem]" aria-label="แจ้งเตือนนัดหมายถัดไป" role="status" aria-live="polite">
    <div key={appointment.id} className="animate-in fade-in slide-in-from-right-4 duration-300 motion-reduce:animate-none">
      <div className="flex items-center gap-2 rounded-xl border border-brand-strong/25 bg-brand-soft/60 px-2.5 py-2 shadow-sm sm:px-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-strong"><Clock3 className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold leading-4 text-brand-strong">{isPreview && <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] tracking-wide">PREVIEW</span>}นัดหมายในอีก {minutesUntil} นาที</p>
          <Link href={`/records?appointment=${encodeURIComponent(appointment.id)}`} className="mt-0.5 block truncate text-sm font-bold text-brand-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">{appointment.patientName}</Link>
          <p className="mt-0.5 truncate text-xs text-brand-body">{appointment.startTime} น. · คิว #{appointment.queueNumber ?? '—'} · {appointment.departmentName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="ผู้ป่วยก่อนหน้า" title="ผู้ป่วยก่อนหน้า" disabled={!hasPrevious} onClick={() => setSelectedAppointmentId(upcomingAppointments[selectedIndex - 1]?.id ?? null)} className="flex size-8 items-center justify-center rounded-lg border border-brand-border-soft bg-white text-brand-strong transition hover:border-brand-strong hover:bg-brand-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-35">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="ผู้ป่วยถัดไป" title="ผู้ป่วยถัดไป" disabled={!hasNext} onClick={() => setSelectedAppointmentId(upcomingAppointments[selectedIndex + 1]?.id ?? null)} className="flex size-8 items-center justify-center rounded-lg border border-brand-border-soft bg-white text-brand-strong transition hover:border-brand-strong hover:bg-brand-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-not-allowed disabled:opacity-35">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </aside>;
}

function MedicationProgressList({
  medications,
  emptyMessage,
}: {
  medications: DashboardView['medicationAlerts'];
  emptyMessage: string;
}) {
  if (medications.length === 0) return <EmptyState message={emptyMessage} />;

  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="รายการยา">{medications.map((medication) => {
    const threshold = Math.max(medication.minimumStock, 1);
    const progress = Math.min(100, Math.round((medication.stock / threshold) * 100));
    const barClass = medication.expired ? 'bg-status-critical' : medication.lowStock ? 'bg-status-warning' : 'bg-brand-strong';
    return <div key={medication.id} role="listitem" className="min-w-0 rounded-lg border border-brand-border-soft bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-base font-medium leading-6 text-brand-ink">{medication.name}</p>
          {medication.expired && <span className="shrink-0 text-status-critical" role="img" aria-label={`ยาหมดอายุ ${medication.name}`}>
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>}
        </div>
        <div className="flex flex-wrap gap-1.5">{medication.lowStock && <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-[11px] font-medium text-status-warning">ใกล้หมด</span>}{medication.expired && <span className="rounded-full bg-status-critical-bg px-2 py-0.5 text-[11px] font-medium text-status-critical">หมดอายุ</span>}</div>
      </div>
      {!medication.expired && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-page" role="progressbar" aria-label={`จำนวนคงเหลือของยา ${medication.name}`} aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(medication.stock, threshold)}>
        <div className={`h-full rounded-full transition-[width] ${barClass}`} style={{ width: `${progress}%` }} />
      </div>}
      <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[11px] leading-4 text-brand-muted"><span>คงเหลือ {medication.stock} · จุดสั่งซื้อ {medication.minimumStock}</span>{medication.expiryDate && <span>หมดอายุ {medication.expiryDate}</span>}</div>
    </div>;
  })}</div>;
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

  return <div className="mt-3.5 border-t border-brand-border-soft pt-3">
    <p className="text-xs font-semibold text-brand-muted sm:text-sm">บันทึกการกินยาวันนี้</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {doses.map((dose) => dose.status === 'taken' ? (
        <span key={dose.scheduledAt} className="inline-flex min-h-7 sm:min-h-8 items-center rounded-lg bg-status-success-bg px-2.5 sm:px-3 text-xs font-semibold text-status-success sm:text-sm">
          {dose.time} น. · กินแล้ว
        </span>
      ) : (
        <div key={dose.scheduledAt} className="inline-flex items-center gap-2 rounded-lg border border-brand-border-soft bg-brand-surface px-2 py-1">
          <span className="text-xs text-brand-body sm:text-sm">{dose.time} น. · ยังไม่ได้บันทึก</span>
          <button
            type="button"
            disabled={busyDose === dose.scheduledAt}
            onClick={() => void recordTaken(dose.scheduledAt)}
            className="inline-flex min-h-7 sm:min-h-8 items-center rounded-md bg-brand-strong px-2 sm:px-2.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            {busyDose === dose.scheduledAt ? 'กำลังบันทึก…' : 'กินแล้ว'}
          </button>
        </div>
      ))}
    </div>
    {actionError && <p role="alert" className="mt-2 text-xs text-status-critical">{actionError}</p>}
  </div>;
}

function PatientExamStatDetails({
  title,
  appointments,
}: {
  title: string;
  appointments: DashboardView['appointmentQueue'];
}) {
  return <div id="patient-exam-stat-details" role="region" aria-live="polite" aria-label={title} className="rounded-xl border border-brand-border-soft bg-brand-page/35 px-3 py-3 sm:col-span-3 sm:order-2 sm:px-4">
    {appointments.length === 0 ? <p className="rounded-lg border border-dashed border-brand-border-soft px-3 py-3 text-xs text-brand-muted sm:text-sm">ไม่พบรายการนัดหมายในช่วงนี้</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {appointments.map((appointment) => <Link key={appointment.id} href={`/records?appointment=${encodeURIComponent(appointment.id)}`} className="min-w-0 rounded-lg border border-brand-border-soft bg-white px-3 py-3 text-left transition hover:border-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">
        <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate text-sm font-semibold text-brand-ink sm:text-base">คิว #{appointment.queueNumber ?? '—'}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${appointmentStatusClasses[appointment.status]}`}>{appointmentStatusLabels[appointment.status]}</span></div>
        <p className="mt-1 truncate text-xs text-brand-body sm:text-sm">{formatThaiDate(appointment.date)} · {appointment.startTime} น.</p>
        <p className="mt-1 truncate text-xs font-medium text-brand-ink sm:text-sm">{appointment.doctorName}</p>
        <p className="mt-0.5 truncate text-xs text-brand-muted sm:text-sm">{appointment.departmentName}</p>
      </Link>)}
    </div>}
  </div>;
}

function PatientExamStatsSection({ view }: { view: DashboardView }) {
  const statuses = view.appointmentStatuses.filter((item) => item.status !== 'rejected');
  const totalAppointments = statuses.reduce((sum, item) => sum + item.count, 0);
  const completedCount = statuses.find((s) => s.status === 'completed')?.count ?? 0;
  const inProgressCount = statuses.find((s) => s.status === 'in_progress')?.count ?? 0;
  const confirmedCount = statuses.find((s) => s.status === 'confirmed')?.count ?? 0;
  const pendingCount = statuses.find((s) => s.status === 'pending')?.count ?? 0;
  const activeCount = inProgressCount + confirmedCount + pendingCount;
  const [selectedStat, setSelectedStat] = useState<'all' | 'active' | 'completed' | null>(null);
  const selectedDetailsTitle = selectedStat === null ? null : selectedStat === 'all' ? 'สรุปนัดหมายทั้งหมด' : selectedStat === 'active' ? 'สรุปนัดที่กำลังรอหรือกำลังตรวจ' : 'สรุปนัดที่ตรวจเสร็จแล้ว';
  const visibleAppointments = useMemo(() => {
    if (selectedStat === null) return [];
    const rangeAppointments = sortAppointmentsByStartTime(filterAppointmentsWithinDateRange(view.appointmentQueue, view.startDate, view.date));
    if (selectedStat === 'active') return rangeAppointments.filter((appointment) => upcomingAppointmentStatuses.has(appointment.status));
    if (selectedStat === 'completed') return rangeAppointments.filter((appointment) => appointment.status === 'completed');
    return rangeAppointments;
  }, [selectedStat, view.appointmentQueue, view.startDate, view.date]);

  const toggleStat = (stat: 'all' | 'active' | 'completed') => {
    setSelectedStat((current) => current === stat ? null : stat);
  };
  const statButtonClass = (selected: boolean) => `relative w-full rounded-xl border p-2.5 text-left transition-[background-color,border-color,box-shadow,transform] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:p-3 ${selected ? 'border-brand-strong bg-brand-soft ring-2 ring-brand-strong/35' : 'border-brand-border-soft bg-brand-page/40 hover:border-brand-border-strong hover:bg-brand-soft/50'}`;

  return (
    <section aria-label="สรุปสถานะนัดหมาย" className="rounded-2xl sm:rounded-3xl border border-brand-border-soft bg-brand-surface p-3.5 sm:p-5 shadow-xs transition-all">
      <div className="flex items-start justify-between gap-2 border-b border-brand-border-soft pb-3 sm:items-center sm:gap-1.5">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-brand-ink sm:text-lg">สรุปสถานะนัดหมาย</h2>
          <p className="text-xs text-brand-muted sm:text-sm">ดูจำนวนนัดหมายแยกตามสถานะ</p>
        </div>
        <DashboardActionLink href="/appointments" compactOnMobile>ดูนัดหมายทั้งหมด</DashboardActionLink>
      </div>

      <div className="mt-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <button type="button" aria-expanded={selectedStat === 'all'} aria-controls="patient-exam-stat-details" onClick={() => toggleStat('all')} className={statButtonClass(selectedStat === 'all')}>
            <span className="text-xs font-medium text-brand-muted sm:text-sm">นัดหมายทั้งหมด</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-strong sm:text-3xl">{totalAppointments}</p>
            <span className="text-xs text-brand-muted sm:text-sm">รายการในช่วงนี้</span>
            <ChevronDown className={`absolute right-2.5 top-2.5 size-3.5 text-brand-muted transition-transform sm:right-3 sm:top-3 ${selectedStat === 'all' ? 'rotate-180 text-brand-strong' : ''}`} aria-hidden="true" />
          </button>
          {selectedStat === 'all' && selectedDetailsTitle && <PatientExamStatDetails title={selectedDetailsTitle} appointments={visibleAppointments} />}
          <button type="button" aria-expanded={selectedStat === 'active'} aria-controls="patient-exam-stat-details" onClick={() => toggleStat('active')} className={statButtonClass(selectedStat === 'active')}>
            <span className="text-xs font-medium text-brand-muted sm:text-sm">กำลังรอหรือกำลังตรวจ</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-strong sm:text-3xl">{activeCount}</p>
            <span className="text-xs text-brand-muted sm:text-sm">นัดที่ยังไม่เสร็จ</span>
            <ChevronDown className={`absolute right-2.5 top-2.5 size-3.5 text-brand-muted transition-transform sm:right-3 sm:top-3 ${selectedStat === 'active' ? 'rotate-180 text-brand-strong' : ''}`} aria-hidden="true" />
          </button>
          {selectedStat === 'active' && selectedDetailsTitle && <PatientExamStatDetails title={selectedDetailsTitle} appointments={visibleAppointments} />}
          <button type="button" aria-expanded={selectedStat === 'completed'} aria-controls="patient-exam-stat-details" onClick={() => toggleStat('completed')} className={statButtonClass(selectedStat === 'completed')}>
            <span className="text-xs font-medium text-brand-muted sm:text-sm">ตรวจเสร็จแล้ว</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-strong sm:text-3xl">{completedCount}</p>
            <span className="text-xs text-brand-muted sm:text-sm">นัดที่ตรวจเสร็จแล้ว</span>
            <ChevronDown className={`absolute right-2.5 top-2.5 size-3.5 text-brand-muted transition-transform sm:right-3 sm:top-3 ${selectedStat === 'completed' ? 'rotate-180 text-brand-strong' : ''}`} aria-hidden="true" />
          </button>
          {selectedStat === 'completed' && selectedDetailsTitle && <PatientExamStatDetails title={selectedDetailsTitle} appointments={visibleAppointments} />}
        </div>
      </div>
    </section>
  );
}

function PatientTreatmentHistorySection({
  history,
  range,
  startDate,
  date,
}: {
  history: PatientTreatmentHistoryRecord[];
  range: DashboardRange;
  startDate: string;
  date: string;
}) {
  const rangeFilteredHistory = useMemo(() => history.filter((record) => {
    const recordDate = toBangkokDateString(record.date);
    return recordDate >= startDate && recordDate <= date;
  }), [history, startDate, date]);

  const filteredHistory = useMemo(() => rangeFilteredHistory
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [rangeFilteredHistory]);

  const historyControls = <DashboardActionLink href="/records" compactOnMobile>ดูประวัติทั้งหมด</DashboardActionLink>;

  const historyDescription = range === 'today'
    ? 'ผลตรวจวันนี้'
    : range === '7d'
      ? 'ผลตรวจใน 7 วันที่ผ่านมา'
      : 'ผลตรวจใน 30 วันที่ผ่านมา';
  const historyTitle = <span>ประวัติการรักษา</span>;

  return <Section title={historyTitle} description={historyDescription} titleClassName={patientSectionTitleClass} descriptionClassName={patientSectionDescriptionClass} headerClassName="lg:items-center" action={historyControls}>
    {rangeFilteredHistory.length === 0 ? <div className="border-y border-brand-border-soft"><EmptyState message={history.length > 0 ? 'ไม่พบประวัติการรักษาในช่วงนี้' : 'ยังไม่มีประวัติการรักษา'} /></div> : <div className="mt-4 space-y-4">
      <p className="text-xs text-brand-muted sm:text-sm" aria-live="polite">แสดง {filteredHistory.length} จาก {rangeFilteredHistory.length} รายการ</p>
      <div className="overflow-hidden border-y border-brand-border-soft">
        <table className="w-full table-fixed text-left text-xs sm:text-sm">
          <thead className="bg-brand-page/55 text-xs font-semibold text-brand-muted sm:text-sm">
            <tr>
              <th scope="col" className="w-[17%] px-2 py-2.5 sm:w-[18%] sm:px-4 sm:py-3">วันที่</th>
              <th scope="col" className="w-[18%] px-2 py-2.5 sm:px-4 sm:py-3">แผนก</th>
              <th scope="col" className="w-[23%] px-2 py-2.5 sm:w-[22%] sm:px-4 sm:py-3">แพทย์</th>
              <th scope="col" className="w-[30%] px-2 py-2.5 sm:w-[32%] sm:px-4 sm:py-3">ผลตรวจ</th>
              <th scope="col" className="w-[12%] px-2 py-2.5 text-right sm:w-[10%] sm:px-4 sm:py-3">รายการยา</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border-soft">
            {filteredHistory.map((record) => <tr key={record.id} className="align-top">
              <td className="break-words px-2 py-3 text-brand-body sm:px-4 sm:py-4">{formatThaiDateTime(record.date)}</td>
              <td className="break-words px-2 py-3 text-brand-body sm:px-4 sm:py-4">{record.departmentName}</td>
              <td className="break-words px-2 py-3 font-medium text-brand-ink sm:px-4 sm:py-4">{record.doctorName}</td>
              <td className="break-words px-2 py-3 text-brand-ink sm:px-4 sm:py-4"><p className="font-medium">{record.summary}</p></td>
              <td className="break-words px-2 py-3 text-right text-xs text-brand-muted sm:px-4 sm:py-4 sm:text-sm">{record.medicationCount > 0 ? `${record.medicationCount} รายการ` : 'ไม่ได้สั่งยา'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>}
  </Section>;
}

function PatientDashboardContent({ view, onRefresh }: { view: DashboardView; onRefresh: () => void }) {
  const medications = view.patientMedications ?? [];
  const history = view.patientTreatmentHistory ?? [];

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <PatientExamStatsSection view={view} />

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 rounded-2xl sm:rounded-3xl border border-brand-border-soft bg-brand-surface p-3.5 sm:p-5 shadow-xs">
          <Section
            title="ยาที่กำลังใช้อยู่"
            description="ยาที่แพทย์สั่งให้ใช้ตามแผนการรักษา"
            titleClassName={patientSectionTitleClass}
            descriptionClassName={patientSectionDescriptionClass}
            action={<DashboardActionLink href="/reminders">ดูทั้งหมด</DashboardActionLink>}
          >
            {medications.length === 0 ? (
              <EmptyState message="ยังไม่มียาที่กำลังใช้อยู่" />
            ) : (
              <div className="mt-4 space-y-3">
                {medications.map((medication) => {
                  const takenDoses = medication.takenDoses ?? 0;
                  const totalDoses = medication.totalDoses ?? 0;
                  const remainingDoses = Math.max(0, totalDoses - takenDoses);
                  const progress = totalDoses > 0 ? Math.min(100, Math.round((takenDoses / totalDoses) * 100)) : 0;
                  return (
                      <article key={medication.id} className="rounded-2xl sm:rounded-3xl border border-brand-border-soft bg-brand-surface p-3.5 sm:p-5 shadow-xs transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Pill className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-base sm:text-lg text-brand-ink">{medication.name}</p>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">ตามแผนการรักษา</span>
                              {medication.endDate && <span className="text-xs text-brand-muted sm:text-sm">ถึง {formatThaiDate(medication.endDate)}</span>}
                            </div>
                            <p className="mt-1 text-xs sm:text-sm leading-5 text-brand-body">
                              <span className="font-medium text-brand-ink">ขนาดยา:</span> {medication.dosage}
                              <span className="mx-2 text-brand-border">·</span>
                              <span className="font-medium text-brand-ink">วิธีใช้:</span> {medication.instruction}
                            </p>
                          </div>
                        </div>

                        <div className="w-full sm:w-64 shrink-0 space-y-2">
                          {totalDoses > 0 ? (
                            <div aria-label={`ทานยาแล้ว ${takenDoses} จาก ${totalDoses} ครั้ง`}>
                              <div className="flex items-center justify-between text-xs font-semibold text-brand-body sm:text-sm">
                                <span>กินแล้ว {takenDoses} ครั้ง</span>
                                <span>เหลือ {remainingDoses} ครั้ง</span>
                              </div>
                              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={totalDoses} aria-valuenow={takenDoses}>
                                <div className="h-full rounded-full bg-brand-strong transition-[width]" style={{ width: `${progress}%` }} />
                              </div>
                              <p className="mt-1 text-xs text-brand-muted sm:text-sm">จากทั้งหมด {totalDoses} ครั้ง</p>
                            </div>
                          ) : (
                            <p className="text-xs text-brand-muted sm:text-sm">เวลา {medication.reminderTimes.length > 0 ? medication.reminderTimes.map((time) => `${time} น.`).join(' · ') : 'ยังไม่ตั้งเวลา'}</p>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-strong sm:text-sm">
                              <Clock3 className="size-3.5" aria-hidden="true" />
                              ครั้งถัดไป: {medication.nextDoseTime ? `${medication.nextDoseTime} น.` : 'ยังไม่ตั้งเวลา'}
                            </span>
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                              รอบถัดไป
                            </span>
                          </div>
                        </div>
                      </div>

                      <PatientMedicationLog medication={medication} onRefresh={onRefresh} />
                    </article>
                  );
                })}
              </div>
            )}
          </Section>

        </div>

        <div className="min-w-0 rounded-2xl sm:rounded-3xl border border-brand-border-soft bg-brand-surface p-3.5 sm:p-5 shadow-xs">
          <PatientTreatmentHistorySection
            history={history}
            range={view.range}
            startDate={view.startDate}
            date={view.date}
          />
        </div>
      </div>
    </div>
  );
}

function MedicationAlertSection({ view, filter, onFilterChange }: {
  view: DashboardView;
  filter: MedicationAlertFilter;
  onFilterChange: (filter: MedicationAlertFilter) => void;
}) {
  const medicationFilterOptions: Array<{ value: MedicationAlertFilter; label: string; count: number }> = [
    { value: 'all', label: 'ทั้งหมด', count: view.medicationAlerts.length },
    { value: 'low-stock', label: 'ใกล้หมด', count: view.medicationAlerts.filter((medication) => medication.lowStock).length },
    { value: 'expired', label: 'หมดอายุ', count: view.medicationAlerts.filter((medication) => medication.expired).length },
  ];
  const visibleMedications = filter === 'low-stock'
    ? view.medicationAlerts.filter((medication) => medication.lowStock)
    : filter === 'expired'
      ? view.medicationAlerts.filter((medication) => medication.expired)
      : view.medicationAlerts;
  const emptyMessage = filter === 'low-stock'
    ? 'ไม่พบยาที่ใกล้หมด'
    : filter === 'expired'
      ? 'ไม่พบยาที่หมดอายุ'
      : 'ไม่พบรายการยาที่ต้องตรวจสอบ';

  return <Section className="border-y border-brand-border-soft" title="รายการยาที่ต้องตรวจสอบ" description="แยกยาหมดอายุออกจากยาใกล้หมด" action={<DashboardActionLink href="/pharmacy">ดูคลังยา</DashboardActionLink>}>
    <div className="overflow-x-auto pb-1">
      <div role="group" aria-label="กรองสถานะยา" className="flex w-fit min-w-0 items-end gap-1 border-b border-brand-border-soft">
        {medicationFilterOptions.map((option) => {
          const selected = filter === option.value;
          return <button key={option.value} type="button" aria-pressed={selected} onClick={() => onFilterChange(option.value)} className={`relative flex min-h-9 shrink-0 items-center justify-center gap-1.5 border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong sm:min-h-10 sm:px-4 ${selected ? 'z-10 -mb-px rounded-t-xl border-brand-border-soft border-t-2 border-t-brand-strong bg-brand-surface text-brand-strong' : 'border-transparent text-brand-body hover:border-brand-border-soft hover:text-brand-ink'}`}>
            <span>{option.label}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${selected ? 'bg-brand-soft text-brand-strong' : 'bg-brand-page text-brand-muted'}`}>{option.count}</span>
          </button>;
        })}
      </div>
    </div>
    <MedicationProgressList medications={visibleMedications} emptyMessage={emptyMessage} />
  </Section>;
}

function MedicalPharmacySections({ view, filter, includePrescriptions = true, onMedicationFilterChange }: {
  view: DashboardView;
  filter: MedicalWorkFilter;
  includePrescriptions?: boolean;
  onMedicationFilterChange?: (filter: MedicationAlertFilter) => void;
}) {
  const [localMedicationFilter, setLocalMedicationFilter] = useState<MedicationAlertFilter>('all');
  const pendingPrescriptions = view.pendingPrescriptions ?? [];
  const medicationFilter: MedicationAlertFilter = onMedicationFilterChange
    ? filter === 'low-stock' || filter === 'expired' ? filter : 'all'
    : localMedicationFilter;
  const showPrescriptions = includePrescriptions && (filter === 'all' || filter === 'prescriptions');
  const showAlerts = filter === 'all' || filter === 'low-stock' || filter === 'expired';
  const handleMedicationFilterChange = (nextFilter: MedicationAlertFilter) => {
    if (onMedicationFilterChange) onMedicationFilterChange(nextFilter);
    else setLocalMedicationFilter(nextFilter);
  };

  return <div className="w-full space-y-8 sm:space-y-10">
    {showPrescriptions && <Section title="ใบสั่งยาที่รอจ่าย" description="ใบสั่งยาที่ยังจ่ายยาไม่ครบ" action={<DashboardActionLink href="/pharmacy">ดูทั้งหมด</DashboardActionLink>}>
      {pendingPrescriptions.length === 0 ? <EmptyState message="ไม่พบใบสั่งยาที่รอจ่าย" /> : <div className="divide-y divide-brand-border-soft">
        {pendingPrescriptions.map((prescription) => <div key={prescription.id} className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="font-semibold text-brand-ink">{prescription.patientName}</p><p className="mt-1 text-sm text-brand-body">{prescription.diagnosis}</p><p className="mt-1 text-xs text-brand-muted">{prescription.doctorName} · {prescription.departmentName} · {formatThaiDateTime(prescription.date)} น.</p></div>
          <span className="shrink-0 self-start rounded-full bg-status-warning-bg px-2.5 py-1 text-xs font-semibold text-status-warning">เหลือจ่าย {Math.max(0, prescription.medicationCount - prescription.dispensedCount)} จาก {prescription.medicationCount} รายการ</span>
        </div>)}
      </div>}
    </Section>}

    {showAlerts && <MedicationAlertSection view={view} filter={medicationFilter} onFilterChange={handleMedicationFilterChange} />}
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
  return <MedicationAlertSection view={view} filter={medicationFilter} onFilterChange={setMedicationFilter} />;
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
    <Section title="สรุปตามแผนก" description={`ผู้ป่วย แพทย์ที่ปฏิบัติงาน และความหนาแน่นในช่วง ${dashboardRangeLabels[view.range]}`} action={<DashboardActionLink href="/departments">จัดการแผนก</DashboardActionLink>}>
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
      <Section title="สถานะแพทย์" description="เลือกสถานะเพื่อดูรายชื่อแพทย์" action={<DashboardActionLink href="/schedules">ดูตารางแพทย์</DashboardActionLink>}>
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
            return doctorList.length === 0 ? <p className="px-1 py-4 text-xs text-brand-muted">ไม่พบแพทย์ในสถานะนี้</p> : <div className="divide-y divide-brand-border-soft">{doctorList.map((doctor) => <div key={doctor.doctorId} className="flex flex-col gap-2 px-1 py-4 sm:px-2"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-brand-ink">{doctor.doctorName}</p><p className="mt-1 text-xs text-brand-body">{doctor.departmentName}</p>{doctor.status === 'away' && <p className="mt-1 text-[11px] text-brand-muted">ลาหรือนอกเวลาทำการ</p>}{doctor.status === 'available' && doctor.nextAppointmentTime && <p className="mt-1 text-[11px] text-brand-muted">นัดถัดไป: {doctor.nextAppointmentTime} น.</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${doctorStatusClasses[doctor.status]}`}>{doctorStatusLabels[doctor.status]}</span></div><Link href="/schedules" className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg border border-brand-strong bg-white px-3 text-xs font-semibold text-brand-strong transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong">ดูตาราง <ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>)}</div>;
          })()}
        </div>
      </Section>
      <StaffMedicationAlerts view={view} />
    </div>
  </div>;
}

function DashboardSkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-brand-border-soft motion-reduce:animate-none ${className}`} />;
}

function DashboardSkeletonSection({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-4 border-y border-brand-border-soft py-5" aria-hidden="true">
    <div className="space-y-2">
      <DashboardSkeletonBlock className="h-4 w-44" />
      <DashboardSkeletonBlock className="h-3 w-64 max-w-full" />
    </div>
    <div className="divide-y divide-brand-border-soft">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1 space-y-2">
          <DashboardSkeletonBlock className="h-4 w-2/5" />
          <DashboardSkeletonBlock className="h-3 w-3/5" />
        </div>
        <DashboardSkeletonBlock className="h-7 w-20 shrink-0 rounded-full" />
      </div>)}
    </div>
  </div>;
}

function DashboardRangeSkeleton({ role }: { role: 'staff_admin' | 'medical' | 'patient' }) {
  return <div className="space-y-6 sm:space-y-8" role="status" aria-label="กำลังโหลดข้อมูลช่วงเวลาที่เลือก">
    {role === 'staff_admin' && <>
      <div className="mx-auto grid w-full max-w-[920px] grid-cols-1 gap-4 border-b border-brand-border-soft py-4 sm:grid-cols-2 sm:gap-8" aria-hidden="true">
        {Array.from({ length: 2 }, (_, index) => <div key={index} className="flex min-h-36 items-center justify-center gap-5 border-y border-brand-border-soft py-5">
          <DashboardSkeletonBlock className="size-28 rounded-full" />
          <div className="space-y-2">
            <DashboardSkeletonBlock className="h-4 w-24" />
            <DashboardSkeletonBlock className="h-3 w-16" />
          </div>
        </div>)}
      </div>
      <DashboardSkeletonSection rows={3} />
      <div className="grid gap-8 lg:grid-cols-2" aria-hidden="true">
        <DashboardSkeletonSection rows={2} />
        <DashboardSkeletonSection rows={2} />
      </div>
    </>}

    {role === 'medical' && <>
      <div className="grid grid-cols-2 gap-2 border-b border-brand-border-soft pb-4 sm:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-3 border-y border-brand-border-soft px-3 py-4 sm:px-4">
          <DashboardSkeletonBlock className="size-9 rounded-xl" />
          <DashboardSkeletonBlock className="h-7 w-16" />
          <DashboardSkeletonBlock className="h-3 w-24 max-w-full" />
        </div>)}
      </div>
      <DashboardSkeletonSection rows={4} />
      <DashboardSkeletonSection rows={3} />
    </>}

    {role === 'patient' && <>
      <div className="grid grid-cols-1 gap-3 border-b border-brand-border-soft pb-5 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-3 border-y border-brand-border-soft px-3 py-4 sm:px-4">
          <DashboardSkeletonBlock className="h-3 w-24" />
          <DashboardSkeletonBlock className="h-8 w-20" />
          <DashboardSkeletonBlock className="h-3 w-32 max-w-full" />
        </div>)}
      </div>
      <DashboardSkeletonSection rows={2} />
      <DashboardSkeletonSection rows={3} />
    </>}
  </div>;
}

export default function DashboardScreen({
  role,
  actorId,
  preview,
}: {
  role: 'staff_admin' | 'medical' | 'patient';
  actorId: string;
  preview?: 'upcoming-toast';
}) {
  const [range, setRange] = useState<DashboardRange>('today');
  const [view, setView] = useState<DashboardView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appointmentToastMessage, setAppointmentToastMessage] = useState<string | null>(null);
  const [appointmentFilter, setAppointmentFilter] = useState<AppointmentQueueFilter>(role === 'medical' ? 'appointments' : 'all');
  const [medicalWorkFilter, setMedicalWorkFilter] = useState<MedicalWorkFilter>('all');
  const [chartMode, setChartMode] = useState<DashboardChartMode>('status');
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus>('checking');
  const dashboardWidthClass = role === 'patient'
    ? 'relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8'
    : 'relative left-1/2 w-screen -translate-x-1/2 px-3 sm:px-6 lg:px-8';
  const dashboardGapClass = role === 'patient' ? 'gap-6 sm:gap-8' : 'gap-4 sm:gap-6';
  const refreshDashboard = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
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
            setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลแดชบอร์ดไม่สำเร็จ');
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

  useEffect(() => {
    if (!view || typeof window === 'undefined') return;

    const isPending = sessionStorage.getItem('login_appointment_toast');
    if (!isPending) return;

    sessionStorage.removeItem('login_appointment_toast');
    if (role !== 'patient') return;

    const nextAppointment = view.upcomingAppointments?.[0] ?? view.nextAppointment;
    if (!nextAppointment) return;

    setAppointmentToastMessage(`นัดหมายถัดไป: ${formatThaiDate(nextAppointment.date)} เวลา ${nextAppointment.startTime.slice(0, 5)} น.`);
  }, [role, view]);

  if (loading && !view) {
    return <div className={`dashboard-shell ${dashboardWidthClass} max-w-none space-y-8 sm:space-y-10`} aria-busy="true" aria-label="กำลังโหลดแดชบอร์ด">{role === 'staff_admin' && <div className="flex justify-end"><DatabaseStatusChip status={databaseStatus} /></div>}<div className="space-y-3 border-b border-brand-border-soft pb-6"><div className="h-8 w-2/5 rounded bg-brand-border-soft" /><div className="h-4 w-3/5 rounded bg-brand-border-soft" /></div>{role !== 'staff_admin' && <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 border-y border-brand-border-soft bg-brand-page/50" />)}</div>}<div className="h-64 border-y border-brand-border-soft bg-brand-page/50" /></div>;
  }

  if (!view) {
    return <div className={`dashboard-shell ${dashboardWidthClass} max-w-none flex min-h-[55vh] flex-col items-center justify-center border-y border-rose-200 py-12 text-center`} role="alert">{role === 'staff_admin' && <div className="absolute right-3 top-3 sm:right-6"><DatabaseStatusChip status={databaseStatus} /></div>}<PackageX className="size-10 text-rose-500" /><h1 className="mt-4 text-xl font-bold text-brand-ink">โหลดข้อมูลแดชบอร์ดไม่สำเร็จ</h1><p className="mt-2 text-sm text-status-critical">{error ?? 'ไม่พบข้อมูลสำหรับบทบาทนี้'}</p><button type="button" onClick={() => { setLoading(true); setRefreshToken((value) => value + 1); }} className={`${dashboardButton} mt-5 border-rose-700 bg-rose-700 text-white hover:bg-rose-800`}><RefreshCw className="size-4" /> ลองอีกครั้ง</button></div>;
  }

  const isMedicalDoctorDashboard = role === 'medical' && view.metrics.some((item) => item.id === 'own-appointments');
  const isMedicalPharmacyDashboard = role === 'medical' && !isMedicalDoctorDashboard;
  const toastPreviewEnabled = process.env.NODE_ENV !== 'production' && preview === 'upcoming-toast' && isMedicalDoctorDashboard;
  const toastAppointments = toastPreviewEnabled
    ? [...view.appointmentQueue, ...createUpcomingToastPreviewAppointments()]
    : view.appointmentQueue;
  const doctorAppointmentFilter: MedicalMetricAppointmentFilter = appointmentFilter === 'appointments' || appointmentFilter === 'remaining' || appointmentFilter === 'in_progress' || appointmentFilter === 'completed'
    ? appointmentFilter
    : 'appointments';
  const selectedAppointmentFilter = isMedicalDoctorDashboard
    ? doctorAppointmentFilter
    : isMedicalPharmacyDashboard
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
  const medicalMetricDropdownFilter: MedicalMetricAppointmentFilter | null = isMedicalDoctorDashboard ? doctorAppointmentFilter : null;
  const isPartialLoading = loading;
  return (
    <main className={`dashboard-shell ${dashboardWidthClass} max-w-none flex flex-col ${dashboardGapClass} pb-8 sm:pb-10`}>
      <Toast
        message={appointmentToastMessage}
        onDismiss={() => setAppointmentToastMessage(null)}
        variant="info"
        position="top-right-below"
        duration={5000}
      />
      <header className="relative flex flex-col gap-3 sm:gap-4 border-b border-brand-border-soft pb-4 sm:pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 pr-12 sm:flex-1 sm:pr-0">
          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-brand-ink sm:text-3xl lg:text-4xl">{view.title}</h1>
            <p className="mt-1 sm:mt-2 max-w-2xl text-xs sm:text-sm leading-5 sm:leading-6 text-brand-body">{view.description}</p>
          </div>
        </div>
        <div className="absolute right-0 top-0 flex flex-wrap items-center justify-end gap-2 sm:static sm:self-start">
          {role === 'staff_admin' && <DatabaseStatusChip status={databaseStatus} />}
          <button type="button" aria-label={isRefreshing ? 'กำลังโหลด' : 'รีเฟรช'} onClick={() => void refreshDashboard()} disabled={isRefreshing} className="inline-flex min-h-8 sm:min-h-11 shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-lg border border-brand-strong bg-brand-strong px-2.5 sm:px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={`size-3.5 sm:size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" /><span className="hidden sm:inline">{isRefreshing ? 'กำลังโหลด…' : 'รีเฟรช'}</span></button>
        </div>
      </header>

      <div className="min-w-0 space-y-6 sm:space-y-8">
        {role === 'patient' && <PatientNextAppointmentSummary appointments={view.upcomingAppointments} fallbackAppointment={view.nextAppointment} />}
        {role === 'medical' && isMedicalDoctorDashboard && <MedicalNextAppointmentSummary appointments={view.upcomingAppointments} fallbackAppointment={view.nextAppointment} />}

        <section className="border-b border-brand-border-soft pb-2 sm:pb-3" aria-label="ตัวกรองแดชบอร์ด">
          <div className="flex flex-col gap-2.5 py-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex shrink-0 items-center gap-1.5 text-xs sm:text-sm font-semibold text-brand-ink"><Filter className="size-3.5 sm:size-4 text-brand-strong" aria-hidden="true" />ช่วงเวลา</div>
              <div className="min-w-0 max-w-full overflow-x-auto scrollbar-none">
                <SegmentedControl
                  ariaLabel="เลือกช่วงเวลาย้อนหลัง"
                  value={range}
                  options={(Object.entries(dashboardRangeLabels) as Array<[DashboardRange, string]>).map(([value, label]) => ({ value, label }))}
                  onChange={(value) => { if (value !== range) { setError(null); setLoading(true); setRange(value); } }}
                />
              </div>
            </div>
            <div className="text-left sm:text-right text-xs sm:text-sm font-medium tabular-nums text-brand-body lg:ml-2">{formatThaiRange(view.startDate, view.date)}</div>
            {role === 'medical' && isMedicalDoctorDashboard && <UpcomingAppointmentToast appointments={toastAppointments} isPreview={toastPreviewEnabled} />}
            {role === 'staff_admin' && <div className="min-w-0 sm:ml-auto sm:shrink-0">
              <div className="scrollbar-none min-w-0 overflow-x-auto">
                <SegmentedControl
                  className="w-max max-w-none"
                  ariaLabel="เลือกข้อมูลภาพรวม"
                  value={chartMode}
                  options={[{ value: 'status' as const, label: 'สรุปตามสถานะ' }, { value: 'gender' as const, label: 'สรุปตามเพศ' }]}
                  onChange={setChartMode}
                />
              </div>
            </div>}
          </div>
        </section>

        <div className="space-y-6 sm:space-y-8" aria-busy={isPartialLoading}>
        {error && <div role="alert" className="border-y border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</div>}

        {isPartialLoading ? <DashboardRangeSkeleton role={role} /> : <>

        {role === 'staff_admin' && chartMode === 'status' && <div className="mx-auto grid w-full max-w-[920px] grid-cols-1 items-center gap-4 border-b border-brand-border-soft py-4 sm:grid-cols-2 sm:gap-8" role="group" aria-label="ความคืบหน้านัดหมาย">
          <StatusDonut title="ยืนยันแล้ว" centerPercent={confirmationPercent} slices={[{ label: 'รอการยืนยัน', count: pendingAppointments, color: '#e8efed' }, { label: 'ยืนยันแล้ว', count: confirmedAppointments, color: '#087f78' }]} />
          <StatusDonut title="ตรวจเสร็จแล้ว" centerPercent={examinationPercent} slices={[{ label: 'กำลังตรวจ', count: inProgressAppointments, color: '#e8efed' }, { label: 'ตรวจเสร็จแล้ว', count: completedAppointments, color: '#15803d' }]} />
        </div>}

        {role === 'staff_admin' && chartMode === 'gender' && <div id="staff-gender-summary" className={`${dashboardContentWidthClass} animate-in fade-in slide-in-from-top-2 duration-200`}>
          <GenderSummary patientCounts={view.patientGenderCounts} doctorCounts={view.doctorGenderCounts} />
        </div>}

        {role === 'medical' && <section aria-label="ข้อมูลสรุป" className="border-b border-brand-border-soft">
          <div>
            <div className={`grid grid-cols-2 items-stretch gap-2 ${view.metrics.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
              {view.metrics.map((item) => {
                const metricFilter: MedicalWorkFilter | undefined = item.id === 'own-appointments' || item.id === 'appointments-in-range'
                  ? 'appointments'
                  : item.id === 'own-queue'
                    ? 'remaining'
                    : item.id === 'in-progress-in-range'
                      ? 'in_progress'
                    : item.id === 'completed-in-range'
                      ? 'completed'
                      : item.id === 'pending-dispensing'
                        ? 'prescriptions'
                        : item.id === 'low-stock'
                          ? 'low-stock'
                          : item.id === 'expired'
                            ? 'expired'
                            : undefined;
                const selectedFilter = isMedicalPharmacyDashboard ? medicalWorkFilter : doctorAppointmentFilter;
                return <MedicalMetricItem
                  key={item.id}
                  item={item}
                  selected={Boolean(metricFilter && selectedFilter === metricFilter)}
                  onSelect={metricFilter ? () => {
                    if (isMedicalPharmacyDashboard) {
                      setMedicalWorkFilter(metricFilter);
                    } else {
                      setAppointmentFilter(metricFilter as AppointmentQueueFilter);
                    }
                  } : undefined}
                />;
              })}
            </div>
            {medicalMetricDropdownFilter && <MedicalMetricDropdown appointments={view.appointmentQueue} startDate={view.startDate} date={view.date} range={view.range} filter={medicalMetricDropdownFilter} />}
          </div>
        </section>}

          {role === 'patient' ? <PatientDashboardContent view={view} onRefresh={refreshDashboard} /> : <>
          {role === 'staff_admin' && <Section className={dashboardContentWidthClass} title={rangeHeading('นัดหมายตามสถานะ', view.range)} description="เลือกสถานะเพื่อดูนัดหมายและรายละเอียด" action={<DashboardActionLink href="/appointments">จัดการนัดหมาย</DashboardActionLink>}>
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

      {((role === 'medical' && ((isMedicalDoctorDashboard && !medicalMetricDropdownFilter) || medicalWorkFilter === 'appointments')) || role === 'staff_admin') && <Section className={dashboardContentWidthClass} hideHeader={role === 'staff_admin'} title={role === 'medical' ? 'คิวและนัดหมายของฉัน' : 'คิวและนัดหมายล่าสุด'} description={`คิวและนัดหมายในช่วง ${dashboardRangeLabels[view.range]}`} action={<DashboardActionLink href="/appointments">{role === 'medical' ? 'ดูนัดหมายทั้งหมด' : 'จัดการนัดหมาย'}</DashboardActionLink>}>{filteredAppointmentQueue.length === 0 ? <EmptyState message={appointmentFilter === 'today' ? 'ไม่พบนัดหมายวันนี้' : appointmentFilter === 'remaining' ? 'ไม่พบคิวที่เหลือ' : appointmentFilter === 'pending' ? 'ไม่พบผู้ป่วยที่รอการยืนยัน' : appointmentFilter === 'confirmed' ? 'ไม่พบผู้ป่วยที่ยืนยันแล้ว' : appointmentFilter === 'in_progress' ? 'ไม่พบรายการที่กำลังตรวจ' : appointmentFilter === 'completed' ? 'ยังไม่มีนัดหมายที่ตรวจเสร็จ' : appointmentFilter === 'cancelled' ? 'ไม่พบนัดที่ยกเลิก' : appointmentFilter === 'no_show' ? 'ไม่พบผู้ป่วยที่ไม่มาตามนัด' : appointmentFilter === 'served' ? 'ยังไม่พบผู้ป่วยที่เข้ารับบริการ' : 'ไม่พบนัดหมายในช่วงนี้'} /> : <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[80px_120px_1.2fr_1fr_130px] gap-4 border-b border-brand-border-soft px-5 py-3 text-xs font-semibold text-brand-muted"><span>คิว</span><span>วันเวลา</span><span>ผู้ป่วย</span><span>{role === 'medical' ? 'แผนก' : 'แพทย์ / แผนก'}</span><span>สถานะ</span></div><div className="divide-y divide-brand-border-soft">{filteredAppointmentQueue.map((item) => <div key={item.id} className="grid grid-cols-[80px_120px_1.2fr_1fr_130px] items-center gap-4 px-5 py-4 text-sm"><span className="font-bold tabular-nums text-brand-ink">{item.queueNumber ? `#${item.queueNumber}` : '—'}</span><span className="text-brand-body"><span className="block">{new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00+07:00`))}</span><span className="text-xs text-brand-muted">{item.startTime} น.</span></span><span className="font-semibold text-brand-ink">{item.patientName}{role === 'medical' && isMedicalDoctorDashboard && <Link href={`/records?appointment=${encodeURIComponent(item.id)}`} className="mt-1 block text-xs font-semibold text-brand-strong hover:underline">เปิดรายละเอียด</Link>}</span><span className="text-brand-body">{role === 'medical' ? item.departmentName : <>{item.doctorName}<span className="block text-xs text-brand-muted">{item.departmentName}</span></>}</span><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${appointmentStatusClasses[item.status]}`}>{appointmentStatusLabels[item.status]}</span></div>)}</div></div></div>}</Section>}

      {role === 'staff_admin' && <ClinicOverviewSections view={view} />}

      {role === 'medical' && <MedicalPharmacySections
        view={view}
        filter={isMedicalPharmacyDashboard ? medicalWorkFilter : 'all'}
        includePrescriptions={isMedicalPharmacyDashboard}
        onMedicationFilterChange={isMedicalPharmacyDashboard ? (nextFilter) => setMedicalWorkFilter(nextFilter) : undefined}
      />}

          </>}
        </>}
        </div>

      </div>

    </main>
  );
}
