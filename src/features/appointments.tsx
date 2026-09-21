'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Search,
  Stethoscope,
  TicketCheck,
} from 'lucide-react';
import DatePicker from '@/components/common/DatePicker';
import {
  actionLabels,
  allowedActions,
  bangkokDate,
  bangkokTime,
  ClinicDatePicker,
  ClinicPageLoading,
  ClinicSelect,
  ClinicWorkspaceShell,
  inputClass,
  isSlotArrived,
  primaryButtonClass,
  secondaryButtonClass,
  type ClinicRepository,
  type ClinicRole,
  type ClinicSnapshot,
  useClinicWorkspace,
  type WorkspaceHeaderStat,
} from '@/features/clinic-care';

export type AppointmentStatus = ClinicSnapshot['appointments'][number]['status'];
export const statusLabels: Record<AppointmentStatus, string> = {
  pending: 'รออนุมัติ',
  confirmed: 'ยืนยันแล้ว',
  in_progress: 'กำลังตรวจ',
  completed: 'ตรวจเสร็จ',
  cancelled: 'ยกเลิกแล้ว',
  no_show: 'ไม่มาตามนัด',
  rejected: 'ไม่อนุมัติ',
};

const activeAppointmentStatuses = new Set<AppointmentStatus>(['pending', 'confirmed', 'in_progress', 'completed']);

const statusStyles: Record<string, string> = {
  pending: 'bg-status-warning-bg text-status-warning ring-amber-200',
  confirmed: 'bg-status-info-bg text-status-info ring-brand-border',
  in_progress: 'bg-status-info-bg text-status-info ring-brand-border',
  completed: 'bg-status-success-bg text-status-success ring-emerald-200',
  cancelled: 'bg-status-neutral-bg text-status-neutral ring-brand-border-soft',
  rejected: 'bg-status-critical-bg text-status-critical ring-red-200',
  no_show: 'bg-status-critical-bg text-status-critical ring-red-200',
};

export function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function BookingForm({ data, busy, book, initialSlotId }: {
  data: ClinicSnapshot;
  busy: boolean;
  book: (id: string, reason: string) => Promise<boolean>;
  initialSlotId?: string;
}) {
  const patientBookedSlotIds = new Set(
    data.appointments
      .filter((appointment) => appointment.user_id === data.actor.id && activeAppointmentStatuses.has(appointment.status))
      .map((appointment) => appointment.slot_id),
  );
  const isAvailableForPatient = (slot: ClinicSnapshot['slots'][number]) =>
    slot.bookable && slot.status === 'available' && slot.booked_count < slot.max_capacity && !patientBookedSlotIds.has(slot.id);
  const initialSlot = initialSlotId ? data.slots.find((slot) => slot.id === initialSlotId && isAvailableForPatient(slot)) : undefined;
  const [date, setDate] = useState(initialSlot?.slot_date ?? bangkokDate);
  const [department, setDepartment] = useState(initialSlot?.department ?? '');
  const [slotId, setSlotId] = useState(initialSlot?.id ?? '');
  const [reason, setReason] = useState('');
  const slots = data.slots.filter((slot) => slot.slot_date === date && (!department || slot.department === department) && isAvailableForPatient(slot));
  const selected = slots.find((slot) => slot.id === slotId);
  const departments = data.departments ?? [...new Set(data.slots.map((slot) => slot.department))].sort();

  const bookingControlClass = '!h-12 !min-h-12 !w-full !rounded-xl !border-brand-border !bg-white !px-4 !shadow-none hover:!border-brand-strong';

  return <form className="min-w-0 border-b border-brand-border-soft pb-8 sm:pb-10" onSubmit={async (event) => {
    event.preventDefault();
    if (selected && await book(selected.id, reason)) {
      setSlotId('');
      setReason('');
    }
  }}>
    <div className="flex items-start gap-3 py-6 sm:gap-4 sm:py-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-soft text-brand-strong">
          <TicketCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brand-ink">จองนัดใหม่</h2>
          <p className="mt-1 text-sm leading-6 text-brand-body">เลือกวันและเวลาที่สะดวก แล้วระบุอาการก่อนเข้ารับบริการ</p>
        </div>
    </div>

    <fieldset disabled={busy} className="grid min-w-0 gap-6 lg:grid-cols-2 lg:gap-10">
      <div className="min-w-0 space-y-5">
        <div className="grid min-w-0 gap-5 sm:grid-cols-2">
          <div className="min-w-0 text-sm font-semibold text-brand-ink">
            <label htmlFor="appointment-date" className="block">วันที่ตรวจ</label>
            <input id="appointment-date" type="date" name="appointment_date" required min={bangkokDate()} value={date} onChange={(event) => { setDate(event.target.value); setSlotId(''); }} tabIndex={-1} aria-label="วันที่ตรวจ" className="sr-only" />
            <DatePicker
              id="appointment-date-picker"
              label="เลือกวันที่ตรวจ"
              ariaLabel="เปิดปฏิทินเลือกวันที่ตรวจ"
              value={date}
              minDate={bangkokDate()}
              slotDates={data.slots.filter(isAvailableForPatient).map((slot) => slot.slot_date)}
              onChange={(value) => { setDate(value); setSlotId(''); }}
              className="mt-2 !block !w-full [&>label]:hidden"
              triggerClassName={`${bookingControlClass} border text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong`}
            />
          </div>

          <div className="min-w-0 text-sm font-semibold text-brand-ink">
            <p>บริการ</p>
            <div className="mt-2">
              <ClinicSelect value={department} onChange={(value) => { setDepartment(value); setSlotId(''); }} placeholder="ทุกบริการ" ariaLabel="บริการ" className={bookingControlClass} options={departments.map((name) => ({ value: name, label: name }))} />
            </div>
          </div>
        </div>

      <section aria-labelledby="appointment-slot-title" className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <h3 id="appointment-slot-title" className="text-sm font-semibold text-brand-ink">รอบตรวจ</h3>
          <span className="text-xs text-brand-body">{slots.length ? `มีรอบว่าง ${slots.length} รอบ` : 'ยังไม่มีรอบที่ว่าง'}</span>
        </div>
        <ClinicSelect value={selected?.id ?? ''} onChange={setSlotId} placeholder="เลือกรอบตรวจ" ariaLabel="รอบตรวจ" className={bookingControlClass} options={slots.map((slot) => ({ value: slot.id, label: `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)} · ${slot.doctor} · ว่าง ${slot.max_capacity - slot.booked_count} ที่` }))} />
        {slots.length === 0 && <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-status-warning-bg px-4 py-3 text-sm leading-6 text-status-warning"><Clock3 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><p>ไม่มีรอบว่างในวันที่และบริการนี้ ลองเลือกวันอื่นหรือเปลี่ยนบริการ</p></div>}
      </section>

      {selected && <div className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-soft px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-strong shadow-sm"><CalendarDays className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 space-y-1"><p className="text-xs font-semibold text-brand-body">รอบที่เลือก</p><p className="text-sm font-bold text-brand-ink">{formatAppointmentDate(selected.slot_date)} · {selected.start_time.slice(0, 5)}–{selected.end_time.slice(0, 5)}</p><p className="break-words text-xs leading-5 text-brand-body">{selected.department} · {selected.doctor}</p></div>
        <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-status-success" aria-hidden="true" />
      </div>}
      </div>

      <div className="min-w-0 lg:border-l lg:border-brand-border-soft lg:pl-10">
        <label htmlFor="appointment-reason" className="block text-sm font-semibold text-brand-ink">อาการหรือเหตุผลที่มาพบแพทย์</label>
        <textarea id="appointment-reason" required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} className={`${inputClass} mt-2 block min-h-36 resize-y !border-brand-border px-4 py-3 leading-6 placeholder:text-brand-body/70`} rows={4} placeholder="เช่น ปวดศีรษะ มีไข้ หรือมาติดตามผล" />
        <div className="mt-2 flex items-start justify-between gap-3 text-xs leading-5 text-brand-body"><span>ระบุอาการเบื้องต้นเพื่อเตรียมการตรวจ</span><span className="shrink-0 tabular-nums">{reason.length.toLocaleString('th-TH')} / 2,000</span></div>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-xs items-start gap-2 text-xs leading-5 text-brand-body"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span>คำขอจะอยู่ในสถานะรออนุมัติจนกว่าเจ้าหน้าที่จะตรวจสอบ</span></p>
          <button className={`${primaryButtonClass} min-h-12 w-full shrink-0 px-5 sm:w-auto`} disabled={!selected || !reason.trim()}><TicketCheck className="h-4 w-4" aria-hidden="true" />{busy ? 'กำลังบันทึก…' : 'ยืนยันจองนัด'}</button>
        </div>
      </div>
    </fieldset>
  </form>;
}

function AppointmentCard({ appointment, slot, role, state, bangkokNow }: {
  appointment: ClinicSnapshot['appointments'][number];
  slot?: ClinicSnapshot['slots'][number];
  role: ClinicRole;
  state: ReturnType<typeof useClinicWorkspace>;
  bangkokNow: { date: string; time: string };
}) {
  const actions = allowedActions(role, appointment, slot, bangkokNow.date, bangkokNow.time).filter((action) => !(role === 'staff_admin' && action === 'cancelled'));
  const title = role === 'patient' ? `คิว ${appointment.queue_number ?? '—'}` : `${appointment.patient} · คิว ${appointment.queue_number ?? '—'}`;
  return <article className={role === 'patient'
    ? 'flex min-w-0 flex-col rounded-2xl border border-brand-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6'
    : 'group relative overflow-visible rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_8px_24px_rgba(26,61,62,0.04)] transition hover:-translate-y-0.5 hover:border-brand-border-strong hover:shadow-[0_16px_34px_rgba(26,61,62,0.08)] sm:p-6'}>
    {role === 'patient' ? <div className="min-w-0 pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="flex items-baseline gap-2.5 text-sm font-medium text-brand-body">คิว <span className="text-3xl font-bold leading-none tracking-tight text-brand-ink tabular-nums">{appointment.queue_number ?? '—'}</span></h3>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[appointment.status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{statusLabels[appointment.status]}</span>
      </div>
      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong"><Stethoscope className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0"><p className="break-words font-semibold text-brand-ink">{slot?.doctor ?? 'ไม่พบแพทย์'}</p><p className="mt-0.5 break-words text-sm text-brand-body">{slot?.department ?? 'ไม่พบบริการ'}</p></div>
      </div>
      {slot ? <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-dashed border-brand-border-soft py-4">
        <div className="min-w-0"><dt className="flex items-center gap-1.5 text-xs text-brand-body"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />วันที่ตรวจ</dt><dd className="mt-1.5 text-sm font-semibold text-brand-ink">{formatAppointmentDate(slot.slot_date)}</dd></div>
        <div className="min-w-0 border-l border-brand-border-soft pl-3 sm:pl-5"><dt className="flex items-center gap-1.5 text-xs text-brand-body"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />เวลานัดหมาย</dt><dd className="mt-1.5 text-sm font-semibold text-brand-ink tabular-nums">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)} น.</dd></div>
      </dl> : <p className="mt-4 text-sm text-brand-body">ไม่พบรอบตรวจ</p>}
      <div className="mt-4 text-sm leading-6"><p className="text-xs text-brand-body">อาการ / เหตุผลที่เข้ารับบริการ</p><p className="mt-1 whitespace-pre-wrap text-brand-ink [overflow-wrap:anywhere]">{appointment.reason || 'ไม่ได้ระบุ'}</p></div>
    </div> : <>
    <div className="absolute left-0 top-6 h-12 w-1 rounded-r-full bg-brand-strong opacity-70" aria-hidden="true" />
    <div className="flex items-start justify-between gap-3 pl-2">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-strong"><Stethoscope className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0"><h3 className="truncate font-bold text-brand-ink">{title}</h3><p className="mt-1 truncate text-xs text-brand-body">{slot?.doctor ?? 'ไม่พบแพทย์'} · {slot?.department ?? 'ไม่พบบริการ'}</p></div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusStyles[appointment.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{statusLabels[appointment.status]}</span>
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <div className="flex min-w-0 items-center gap-2 rounded-xl bg-brand-surface px-3 py-2.5 text-sm text-brand-ink"><CalendarDays className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span className="truncate">{slot ? `${formatAppointmentDate(slot.slot_date)} · ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}` : 'ไม่พบรอบตรวจ'}</span></div>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-brand-body"><ClipboardList className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span>เหตุผล: {appointment.reason || 'ไม่ได้ระบุ'}</span></div>
    </div>
    </>}
    {role !== 'patient' && <p className="mt-4 text-sm text-brand-body">เบอร์โทรผู้ป่วย: {appointment.patient_phone?.trim() || 'ไม่ได้ระบุ'}</p>}
    {appointment.cancel_requested_at && ['pending', 'confirmed'].includes(appointment.status) && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">ผู้ป่วยขอยกเลิก · รอเจ้าหน้าที่ดำเนินการ</p>}
    {appointment.rejection_reason && <p className="mt-4 break-words rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800"><strong>เหตุผลการปฏิเสธ:</strong> {appointment.rejection_reason}</p>}
    {(actions.length > 0 || (role === 'medical' && appointment.status === 'confirmed') || (role === 'medical' && appointment.status === 'in_progress') || (role === 'patient' && appointment.status === 'completed')) && <div className={`${role === 'patient' ? 'mt-auto' : 'mt-5'} flex flex-wrap items-start gap-2 border-t border-brand-border-soft pt-4`}>
      {actions.map((action) => action === 'rejected' ? <details key={action} className="group/reject relative w-auto open:mb-56 sm:open:mb-64">
        <summary className={`${secondaryButtonClass} flex w-auto list-none cursor-pointer justify-center rounded-xl border-rose-200 text-rose-700 marker:hidden`}>{actionLabels[action]}</summary>
        <form className="absolute left-0 top-full z-10 mt-3 w-[min(22rem,calc(100vw-3rem))] min-w-0 space-y-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 shadow-xl" onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const value = new FormData(form).get('rejection_reason');
          const ok = await state.run((repository) => repository.transition(appointment.id, action, typeof value === 'string' ? value : ''), 'ปฏิเสธนัดแล้วและบันทึกเหตุผล');
          if (ok) form.reset();
        }}><label className="block text-sm font-semibold text-rose-900">เหตุผลการปฏิเสธ<textarea name="rejection_reason" required maxLength={2000} rows={3} className={`${inputClass} mt-2 bg-white`} placeholder="เช่น รอบตรวจถูกยกเลิก หรือข้อมูลการจองไม่ครบ" /></label><button type="submit" disabled={state.busy} className={`${secondaryButtonClass} border-rose-200 text-rose-700`}>{state.busy ? 'กำลังบันทึก…' : 'ยืนยันปฏิเสธนัด'}</button></form>
      </details> : <button key={action} disabled={state.busy} className={`${secondaryButtonClass} rounded-xl`} onClick={() => void state.run((repository) => repository.transition(appointment.id, action), action === 'request_cancel' ? 'ส่งคำขอยกเลิกแล้ว รอเจ้าหน้าที่ดำเนินการ' : 'บันทึกสถานะนัดแล้ว')}>{actionLabels[action]}</button>)}
      {role === 'medical' && appointment.status === 'confirmed' && slot && !isSlotArrived(slot.slot_date, slot.start_time, bangkokNow.date, bangkokNow.time) && <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 ring-1 ring-amber-200"><Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />ยังไม่ถึงเวลารอบตรวจ</span>}
      {role === 'medical' && appointment.status === 'in_progress' && <Link href={`/records?appointment=${appointment.id}`} className={`${primaryButtonClass} rounded-xl`}><FileText className="h-4 w-4" aria-hidden="true" />เปิดผลตรวจ<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
      {role === 'patient' && appointment.status === 'completed' && <Link href={`/records?appointment=${appointment.id}`} className={`${secondaryButtonClass} w-full !border-brand-border text-brand-strong sm:w-auto`}><FileText className="h-4 w-4" aria-hidden="true" />ดูผลตรวจและยา<ArrowUpRight className="ml-auto h-4 w-4 sm:ml-2" aria-hidden="true" /></Link>}
    </div>}
  </article>;
}

export default function AppointmentPage({ role, repository, initialSlotId }: { role: ClinicRole; repository?: ClinicRepository; initialSlotId?: string }) {
  const state = useClinicWorkspace(role, repository);
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [status, setStatus] = useState<string>(() => {
    if (role === 'staff_admin') return 'pending';
    if (role === 'medical') return 'pending_confirmed';
    return '';
  });
  const [bangkokNow, setBangkokNow] = useState(() => ({ date: bangkokDate(), time: bangkokTime() }));

  useEffect(() => {
    const timer = setInterval(() => setBangkokNow({ date: bangkokDate(), time: bangkokTime() }), 10000);
    return () => clearInterval(timer);
  }, []);

  const data = state.data;
  const rows = data?.appointments.filter((appointment) => {
    const slot = data.slots.find((item) => item.id === appointment.slot_id);
    const matchesStatus = !status ? true : status === 'pending_confirmed' ? ['pending', 'confirmed'].includes(appointment.status) : appointment.status === status;
    return (!date || slot?.slot_date === date) && matchesStatus && `${appointment.patient} ${slot?.doctor ?? ''} ${slot?.department ?? ''} ${appointment.queue_number ?? ''}`.toLowerCase().includes(query.toLowerCase());
  }).sort((left, right) => {
    const leftSlot = data?.slots.find((slot) => slot.id === left.slot_id);
    const rightSlot = data?.slots.find((slot) => slot.id === right.slot_id);
    const leftKey = leftSlot ? `${leftSlot.slot_date}T${leftSlot.start_time}` : '';
    const rightKey = rightSlot ? `${rightSlot.slot_date}T${rightSlot.start_time}` : '';
    const timeDifference = leftKey.localeCompare(rightKey);
    if (timeDifference !== 0) return sortOrder === 'newest' ? -timeDifference : timeDifference;
    const queueDifference = Number(left.queue_number ?? 0) - Number(right.queue_number ?? 0);
    if (queueDifference !== 0) return sortOrder === 'newest' ? -queueDifference : queueDifference;
    return left.id.localeCompare(right.id);
  }) ?? [];
  const stats = data ? {
    total: data.appointments.length,
    pending: data.appointments.filter((appointment) => appointment.status === 'pending').length,
    confirmed: data.appointments.filter((appointment) => appointment.status === 'confirmed').length,
    completed: data.appointments.filter((appointment) => appointment.status === 'completed').length,
  } : null;
  const headerStats: WorkspaceHeaderStat[] = stats ? [
    { label: role === 'patient' ? 'นัดหมายของฉัน' : 'นัดหมายทั้งหมด', value: stats.total, tone: 'default' },
    { label: 'รออนุมัติ', value: stats.pending, tone: 'warning' },
    { label: 'ยืนยันแล้ว', value: stats.confirmed, tone: 'info' },
    { label: 'จบตรวจแล้ว', value: stats.completed, tone: 'success' },
  ] : [];

  return <ClinicWorkspaceShell {...state} role={role} section="appointments" stats={headerStats} wide>
    {state.loading ? <ClinicPageLoading /> : data && <div className={role === 'patient' ? 'space-y-8' : 'space-y-5'}>
      {role === 'patient' && <BookingForm data={data} busy={state.busy} initialSlotId={initialSlotId} book={(id, reason) => state.run((repository) => repository.book(id, reason), 'จองนัดสำเร็จ รอเจ้าหน้าที่อนุมัติ')} />}
      <section className="overflow-visible rounded-[1.75rem]">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
          <div><h2 className="text-xl font-bold tracking-tight text-brand-ink">{role === 'medical' ? 'คิวที่รับผิดชอบ' : role === 'staff_admin' ? 'รายการนัดทั้งหมด' : 'นัดหมายของฉัน'}</h2><p className="mt-1 text-sm leading-6 text-brand-body">{role === 'patient' ? 'ติดตามสถานะนัดหมาย และเปิดดูผลตรวจเมื่อรับบริการเสร็จ' : 'ใช้ตัวกรองด้านล่างเพื่อค้นหารายการที่ต้องการ'}</p></div>
          <span className="text-sm text-brand-body"><span className="font-semibold text-brand-ink tabular-nums">{rows.length}</span> รายการ</span>
        </div>
        <div className="grid items-start gap-4 border-y border-brand-border-soft py-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <label className="block min-w-0 text-sm sm:col-span-2 lg:col-span-1"><span className="block min-h-5 font-medium leading-5 text-brand-body">ค้นหานัดหมาย</span><span className="relative mt-2 block h-12"><Search className="pointer-events-none absolute left-3.5 top-4 h-4 w-4 text-brand-body" aria-hidden="true" /><input aria-label="ค้นหาชื่อ แพทย์ หรือคิว" placeholder="ค้นหาชื่อ แพทย์ หรือคิว" className={`${inputClass} !h-12 !border-brand-border pl-10`} value={query} onChange={(event) => setQuery(event.target.value)} /></span></label>
          <div className="flex min-w-0 flex-col text-sm"><p className="min-h-5 font-medium leading-5 text-brand-body">วันที่นัดหมาย</p><ClinicDatePicker label="กรองวันที่" value={date} onChange={setDate} markedDates={data.appointments.flatMap((appointment) => data.slots.filter((slot) => slot.id === appointment.slot_id).map((slot) => slot.slot_date))} className="mt-2 !h-12 !border-brand-border !shadow-none" /></div>
          <div className="flex min-w-0 flex-col text-sm"><p className="min-h-5 font-medium leading-5 text-brand-body">สถานะนัดหมาย</p><ClinicSelect value={status} onChange={setStatus} placeholder="ทุกสถานะ" ariaLabel="สถานะ" className="!mt-2 !h-12 !border-brand-border" options={[...(role === 'medical' ? [{ value: 'pending_confirmed', label: 'รออนุมัติและรอตรวจ' }] : []), ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))]} /></div>
          <div className="flex min-w-0 flex-col text-sm"><p className="min-h-5 font-medium leading-5 text-brand-body">เรียงคิว</p><ClinicSelect value={sortOrder} onChange={(value) => setSortOrder(value as 'newest' | 'oldest')} placeholder="ใหม่สุดก่อน" ariaLabel="เรียงคิว" className="!mt-2 !h-12 !border-brand-border" options={[{ value: 'newest', label: 'ใหม่สุดก่อน' }, { value: 'oldest', label: 'เก่าสุดก่อน' }]} /></div>
        </div>
        {rows.length === 0 && <div className="flex flex-col items-center px-6 py-14 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-strong"><Search className="h-6 w-6" aria-hidden="true" /></span><p className="mt-4 font-semibold text-brand-ink">ไม่พบนัดหมายตามเงื่อนไขนี้</p><p className="mt-1 text-sm text-brand-body">ลองเปลี่ยนสถานะ วันที่ หรือคำค้นหา แล้วลองใหม่</p></div>}
        <div className="grid gap-4 pt-6 lg:grid-cols-2 lg:gap-5">{rows.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} slot={data.slots.find((slot) => slot.id === appointment.slot_id)} role={role} state={state} bangkokNow={bangkokNow} />)}</div>
      </section>
    </div>}
  </ClinicWorkspaceShell>;
}

export function PatientAppointmentWorkspace({ initialSlotId }: { initialSlotId?: string }) {
  return <AppointmentPage role="patient" initialSlotId={initialSlotId} />;
}

export function MedicalAppointmentWorkspace() {
  return <AppointmentPage role="medical" />;
}

export function StaffAppointmentWorkspace() {
  return <AppointmentPage role="staff_admin" />;
}
