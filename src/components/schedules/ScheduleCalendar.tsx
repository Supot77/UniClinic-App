import Link from 'next/link';
import { ArrowRight, CalendarDays, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import type { DoctorLeave, ScheduleDepartment, ScheduleDoctor, ScheduleService, ScheduleSlot, ScheduleSlotStatus } from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { THAI_MONTHS_SHORT } from '@/constants/dateTime';
import { useLocale } from '@/context/LocaleContext';
import { getBangkokToday } from '@/features/scheduling/domain/rules';

export type CalendarView = 'day' | 'week' | 'month';

export const textButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';

const slotStyles: Record<ScheduleSlotStatus, { label: string; marker: string; text: string }> = {
  available: { label: 'เปิดให้จอง', marker: 'border-l-status-success', text: 'text-status-success' },
  full: { label: 'เต็ม', marker: 'border-l-status-warning', text: 'text-status-warning' },
  closed: { label: 'ปิดรอบ', marker: 'border-l-status-neutral', text: 'text-status-neutral' },
};

export function getTodayDate(): string {
  return getBangkokToday();
}

export function getCurrentWeekMonday(refDateStr?: string): string {
  const dateStr = refDateStr ?? getTodayDate();
  const [year, month, dayOfMonth] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(year, month - 1, diff));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}

export function parseClinicDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`);
}

function toClinicDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function shiftClinicDate(isoDate: string, days: number) {
  const date = parseClinicDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toClinicDate(date);
}

export function shiftClinicMonth(isoDate: string, deltaMonths: number) {
  const date = parseClinicDate(isoDate);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + deltaMonths, 1, 12, 0, 0));
  return toClinicDate(targetDate);
}

export function formatShortDate(isoDate: string, locale: 'en' | 'th' = 'th') {
  const date = parseClinicDate(isoDate);
  if (locale === 'en') return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
  return `${date.getUTCDate()} ${THAI_MONTHS_SHORT[date.getUTCMonth()]}`;
}

export function formatWeekRange(start: string, locale: 'en' | 'th' = 'th') {
  const end = shiftClinicDate(start, 6);
  return locale === 'th'
    ? `${formatShortDate(start, locale)} – ${formatShortDate(end, locale)} ${parseClinicDate(end).getUTCFullYear() + 543}`
    : `${formatShortDate(start, locale)} – ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parseClinicDate(end))}`;
}

export function formatLeaveRange(leave: DoctorLeave, locale: 'en' | 'th' = 'th') {
  return leave.startDate === leave.endDate
    ? formatShortDate(leave.startDate, locale)
    : `${formatShortDate(leave.startDate, locale)}–${formatShortDate(leave.endDate, locale)}`;
}

const statusLabelEnglish: Record<ScheduleSlotStatus, string> = { available: 'Available', full: 'Full', closed: 'Closed' };

export function isClinicWeekday(date: string) {
  const day = parseClinicDate(date).getUTCDay();
  return day >= 1 && day <= 5;
}

type Props = {
  view: CalendarView;
  weekDays: string[];
  displayDays: string[];
  weekStart: string;
  visibleSlots: ScheduleSlot[];
  doctors: ScheduleDoctor[];
  departments: ScheduleDepartment[];
  services: ScheduleService[];
  role: UserRole;
  canBook: boolean;
  visibleDoctorLeaves: DoctorLeave[];
  canModifySlot: (slot: ScheduleSlot) => boolean;
  canCreateForDate: (date: string) => boolean;
  openSlotForm: (slot?: ScheduleSlot, suggestedDate?: string) => void;
  toggleClosed: (slot: ScheduleSlot) => void;
  handleDrillDownDay: (date: string) => void;
  openLeaveForm: (leave?: DoctorLeave) => void;
};

export function ScheduleCalendar(props: Props) {
  const { locale, text } = useLocale();
  const {
    view, weekDays, displayDays, weekStart, visibleSlots, doctors, departments, services,
    role, canBook, visibleDoctorLeaves, canModifySlot, canCreateForDate, openSlotForm,
    toggleClosed, handleDrillDownDay, openLeaveForm,
  } = props;

  if (view !== 'week') {
    return (
      <CalendarBoard
        view={view}
        locale={locale}
        days={displayDays}
        currentMonth={weekStart.slice(0, 7)}
        slots={visibleSlots}
        doctors={doctors}
        departments={departments}
        services={services}
        canModifySlot={canModifySlot}
        canCreate={role !== 'patient'}
        doctorLeaves={visibleDoctorLeaves}
        canCreateForDate={canCreateForDate}
        canBook={canBook}
        loginToBook={!canBook && role === 'patient'}
        onCreate={openSlotForm}
        onEdit={openSlotForm}
        onToggle={toggleClosed}
        onSelectDay={handleDrillDownDay}
        canModifyLeave={role !== 'patient'}
        onEditLeave={openLeaveForm}
      />
    );
  }

  return (
    <>            <div className="hidden lg:block">
              <div className="grid grid-cols-7 border-y border-brand-border-soft">
                {weekDays.map((date) => {
                  const parsed = parseClinicDate(date);
                  const isToday = date === getTodayDate();
                  return (
                    <button
                      type="button"
                      key={date}
                      onClick={() => handleDrillDownDay(date)}
                      onDoubleClick={() => handleDrillDownDay(date)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleDrillDownDay(date);
                        }
                      }}
                      aria-label={text(`เปิดตารางตรวจวันที่ ${formatShortDate(date, locale)}`, `Open schedule for ${formatShortDate(date, locale)}`)}
                      className="cursor-pointer px-3 py-4 text-center hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
                       title={text(`ดับเบิลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date, locale)}`, `Double-click to view the schedule for ${formatShortDate(date, locale)}`)}
                    >
                      <div className={`text-xs font-semibold ${isToday ? 'text-sky-700' : 'text-slate-500'}`}>{new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }).format(parsed)}</div>
                      <div className={`mx-auto mt-2 flex h-9 w-9 items-center justify-center rounded-full text-base font-bold tabular-nums ${isToday ? 'bg-sky-600 text-white' : 'text-slate-950'}`}>{parsed.getUTCDate()}</div>
                    </button>
                  );
                })}
              </div>
              <div className="grid min-h-[460px] grid-cols-7 divide-x divide-brand-border-soft border-b border-brand-border-soft">
                {weekDays.map((date) => {
                  const daySlots = visibleSlots.filter((slot) => slot.slotDate === date);
                  return (
                    <div
                      key={date}
                      onDoubleClick={() => handleDrillDownDay(date)}
                      className="flex min-w-0 flex-col gap-7 px-3 py-6"
                       title={text(`ดับเบิลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date, locale)}`, `Double-click to view the schedule for ${formatShortDate(date, locale)}`)}
                    >
                      <LeaveChips date={date} leaves={visibleDoctorLeaves} doctors={doctors} canModify={role !== 'patient'} onEdit={openLeaveForm} />
                      {daySlots.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          doctors={doctors}
                          departments={departments}
                          services={services}
                          canModify={canModifySlot(slot)}
                          onEdit={() => openSlotForm(slot)}
                          onToggleClosed={() => toggleClosed(slot)}
                        />
                      ))}
                      {daySlots.length === 0 && (
                        role === 'patient' || date < getTodayDate() ? (
                          <div className="py-8 text-center text-sm text-brand-body">
                            {text('ไม่พบรอบตรวจ', 'No appointments')}
                          </div>
                        ) : !canCreateForDate(date) || !isClinicWeekday(date) ? (
                          <LeaveBlockedNotice date={date} />
                        ) : (
                          <button type="button" onClick={() => openSlotForm(undefined, date)} aria-label={text(`เพิ่มรอบตรวจวันที่ ${formatShortDate(date, locale)}`, `Add a time slot for ${formatShortDate(date, locale)}`)} className={textButtonClass}>
                            <Plus className="mb-2 h-4 w-4" aria-hidden="true" />{text('เพิ่มรอบ', 'Add time slot')}
                          </button>
                        )
                      )}
                      <button type="button" onClick={() => handleDrillDownDay(date)} aria-label={text(`ดูรายวัน ${formatShortDate(date, locale)}`, `View day: ${formatShortDate(date, locale)}`)} className={`${textButtonClass} mt-auto text-xs`}>
                        {text('ดูรายวัน', 'View day')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-brand-border-soft border-y border-brand-border-soft lg:hidden">
              {weekDays.map((date) => {
                const parsed = parseClinicDate(date);
                const daySlots = visibleSlots.filter((slot) => slot.slotDate === date);
                return (
                  <article
                    key={date}
                    onDoubleClick={() => handleDrillDownDay(date)}
                    className="py-6"
                     title={text(`ดับเบิลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date, locale)}`, `Double-click to view the schedule for ${formatShortDate(date, locale)}`)}
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-sky-700">{new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { weekday: 'short', timeZone: 'UTC' }).format(parsed)}</div>
                        <h2 className="font-bold text-slate-950">{formatShortDate(date, locale)}</h2>
                      </div>
                      <LeaveChips date={date} leaves={visibleDoctorLeaves} doctors={doctors} canModify={role !== 'patient'} onEdit={openLeaveForm} />
                      <button type="button" onClick={() => handleDrillDownDay(date)} aria-label={text(`ดูรายวัน ${formatShortDate(date, locale)}`, `View day: ${formatShortDate(date, locale)}`)} className={textButtonClass}>
                        {text('ดูรายวัน', 'View day')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {role !== 'patient' && date >= getTodayDate() && canCreateForDate(date) && isClinicWeekday(date) && (
                        <button type="button" onClick={() => openSlotForm(undefined, date)} aria-label={text(`เพิ่มรอบตรวจวันที่ ${formatShortDate(date, locale)}`, `Add a time slot for ${formatShortDate(date, locale)}`)} className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                          <Plus className="h-4 w-4" aria-hidden="true" />{text('เพิ่มรอบ', 'Add time slot')}
                        </button>
                      )}
                      {role !== 'patient' && date >= getTodayDate() && (!canCreateForDate(date) || !isClinicWeekday(date)) && <LeaveBlockedNotice date={date} />}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      {daySlots.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          doctors={doctors}
                          departments={departments}
                          services={services}
                          canModify={canModifySlot(slot)}
                          onEdit={() => openSlotForm(slot)}
                          onToggleClosed={() => toggleClosed(slot)}
                        />
                      ))}
                      {daySlots.length === 0 && (
                        <p className="py-3 text-sm text-brand-body sm:col-span-2">{text('ไม่พบรอบตรวจตามตัวกรอง', 'No appointments match these filters.')}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
    </>
  );
}
function SlotCard({
  slot,
  doctors,
  departments,
  services,
  canModify = true,
  onEdit,
  onToggleClosed,
}: {
  slot: ScheduleSlot;
  doctors: import('@/types/schedule').ScheduleDoctor[];
  departments: import('@/types/schedule').ScheduleDepartment[];
  services: import('@/types/schedule').ScheduleService[];
  canModify?: boolean;
  onEdit: () => void;
  onToggleClosed: () => void;
}) {
  const { text } = useLocale();
  const doctor = doctors.find((item) => item.id === slot.doctorId);
  const department = departments.find((item) => item.id === doctor?.departmentId);
  const service = services.find((item) => item.id === slot.serviceId);
  const config = slotStyles[slot.status];

  return (
    <article className={`min-w-0 rounded-xl border border-brand-border-soft border-l-4 bg-white px-4 py-4 shadow-xs transition-shadow hover:shadow-sm ${config.marker}`}>
      <div className="text-sm font-bold tabular-nums text-brand-ink">{slot.startTime}–{slot.endTime}</div>
      <h3 className="mt-2 break-words text-sm font-semibold leading-6 text-brand-ink">{service?.name ?? text('ไม่พบบริการ', 'Service unavailable')}</h3>
      <p className="mt-1 break-words text-sm leading-6 text-brand-body">{doctor?.fullName ?? text('ไม่พบแพทย์', 'Clinician unavailable')}</p>
      {department && <p className="text-xs leading-5 text-brand-body">{department.name}</p>}
      <p className={`mt-2 text-sm font-semibold ${config.text}`}>
        {text(config.label, statusLabelEnglish[slot.status])}{slot.status === 'available' && ` · ${text('ว่าง', 'Available')} ${Math.max(0, slot.maxCapacity - slot.bookedCount)} ${text('ที่', 'spots')}`}
      </p>
      <p className="mt-1 text-xs tabular-nums text-brand-body">{text('ผู้จอง', 'Booked')} {slot.bookedCount}/{slot.maxCapacity}</p>
      {canModify && (
        <div className="mt-2 flex flex-wrap gap-x-3">
          <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong" aria-label={`${text('แก้ไขรอบ', 'Edit time slot')} ${slot.startTime}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{text('แก้ไข', 'Edit')}
          </button>
          <button type="button" onClick={onToggleClosed} className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand-body hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong" aria-label={slot.status === 'closed' ? text('เปิดรอบตรวจ', 'Reopen time slot') : text('ปิดรอบตรวจ', 'Close time slot')}>
            {slot.status === 'closed' ? <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
            {slot.status === 'closed' ? text('เปิดรอบ', 'Reopen') : text('ปิดรอบ', 'Close')}
          </button>
        </div>
      )}
    </article>
  );
}

function LeaveChips({
  date,
  leaves,
  doctors,
  canModify = false,
  onEdit,
}: {
  date: string;
  leaves: DoctorLeave[];
  doctors: import('@/types/schedule').ScheduleDoctor[];
  canModify?: boolean;
  onEdit?: (leave: DoctorLeave) => void;
}) {
  const matchingLeaves = leaves.filter((leave) => leave.startDate <= date && leave.endDate >= date);
  if (matchingLeaves.length === 0) return null;
  return (
    <div className="mb-3 space-y-1.5" aria-label={`วันลาแพทย์วันที่ ${formatShortDate(date)}`}>
      {matchingLeaves.map((leave) => {
        const doctor = doctors.find((item) => item.id === leave.doctorId);
        const content = (
          <>
            <span className="font-semibold">ลาตรวจ: {doctor?.fullName ?? 'ไม่พบแพทย์'}</span>
            <span className="block text-violet-700">{formatLeaveRange(leave)}{leave.reason ? ` · ${leave.reason}` : ''}</span>
          </>
        );
        return canModify && onEdit ? (
          <button
            key={leave.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(leave);
            }}
            className="block w-full rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-left text-xs leading-5 text-violet-900 hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            aria-label={`แก้ไขวันลา ${doctor?.fullName ?? 'ไม่พบแพทย์'}`}
            title="คลิกเพื่อแก้ไขหรือยกเลิกวันลา"
          >
            {content}
          </button>
        ) : (
          <div key={leave.id} className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-2 text-xs leading-5 text-violet-900">
            {content}
          </div>
        );
      })}
    </div>
  );
}

function LeaveBlockedNotice({ date }: { date: string }) {
  if (!isClinicWeekday(date)) {
    return <p className="flex items-center gap-2 py-4 text-center text-xs font-medium text-violet-800"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />คลินิกปิดวันหยุด ไม่สามารถเพิ่มรอบตรวจได้</p>;
  }
  return <p className="flex items-center gap-2 py-4 text-center text-xs font-medium text-violet-800"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />แพทย์มีวันลา ไม่สามารถเพิ่มรอบตรวจได้</p>;
}

function CalendarBoard({
  view,
  locale,
  days,
  currentMonth,
  slots,
  doctors,
  departments,
  services,
  canModifySlot,
  canCreate = true,
  doctorLeaves = [],
  canCreateForDate = () => true,
  canBook = false,
  loginToBook = false,
  canModifyLeave = false,
  onCreate,
  onEdit,
  onToggle,
  onSelectDay,
  onEditLeave,
}: {
  view: CalendarView;
  locale: 'en' | 'th';
  days: string[];
  currentMonth?: string;
  slots: ScheduleSlot[];
  doctors: import('@/types/schedule').ScheduleDoctor[];
  departments: import('@/types/schedule').ScheduleDepartment[];
  services: import('@/types/schedule').ScheduleService[];
  canModifySlot: (slot: ScheduleSlot) => boolean;
  canCreate?: boolean;
  doctorLeaves?: DoctorLeave[];
  canCreateForDate?: (date: string) => boolean;
  canBook?: boolean;
  loginToBook?: boolean;
  canModifyLeave?: boolean;
  onCreate: (slot?: ScheduleSlot, suggestedDate?: string) => void;
  onEdit: (slot?: ScheduleSlot, suggestedDate?: string) => void;
  onToggle: (slot: ScheduleSlot) => void;
  onSelectDay?: (date: string) => void;
  onEditLeave?: (leave: DoctorLeave) => void;
}) {
  const { text } = useLocale();
  if (view === 'day') {
    const date = days[0];
    return (
      <div aria-label={text('ปฏิทินรายวัน', 'Daily schedule')}>
        <div className="border-y border-brand-border-soft bg-brand-surface/60 px-4 py-5">
          <div className="text-xs font-semibold text-brand-strong">{new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(parseClinicDate(date))}</div>
          <h2 className="mt-1 text-lg font-bold text-brand-ink">{formatShortDate(date, locale)}</h2>
          <LeaveChips date={date} leaves={doctorLeaves} doctors={doctors} canModify={canModifyLeave} onEdit={onEditLeave} />
        </div>
        <div className="divide-y divide-brand-border-soft">
          {slots.filter((slot) => slot.slotDate === date).map((slot) => (
            <div key={slot.id} className="flex flex-wrap items-center gap-4 py-6">
              <div className="min-w-0 flex-1">
                <SlotCard
                  slot={slot}
                  doctors={doctors}
                  departments={departments}
                  services={services}
                  canModify={canModifySlot(slot)}
                  onEdit={() => onEdit(slot)}
                  onToggleClosed={() => onToggle(slot)}
                />
              </div>
              {(canBook || loginToBook) && slot.status !== 'closed' && (
                slot.status === 'full' || slot.bookedCount >= slot.maxCapacity ? (
                  <button
                    type="button"
                    disabled
                    aria-label={text('จองไม่ได้ รอบตรวจเต็มแล้ว', 'Booking unavailable. This time slot is full.')}
                    className="inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-500"
                  >
                    {canBook ? text('จอง (เต็มแล้ว)', 'Book (full)') : text('รอบตรวจเต็มแล้ว', 'Fully booked')}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                <Link
                  href={canBook
                    ? { pathname: '/appointments', query: { slotId: slot.id } }
                    : { pathname: '/login', query: { redirect: `/appointments?slotId=${slot.id}` } }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-ink px-4 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  {canBook ? text('จอง', 'Book') : text('เข้าสู่ระบบเพื่อจอง', 'Sign in to book')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                )
              )}
            </div>
          ))}
          {slots.filter((slot) => slot.slotDate === date).length === 0 && (
            canCreate && date >= getTodayDate() && canCreateForDate(date) && isClinicWeekday(date) ? (
              <button type="button" onClick={() => onCreate(undefined, date)} className={`${textButtonClass} my-8`}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />{text('เพิ่มรอบตรวจวันนี้', 'Add a time slot today')}
              </button>
            ) : canCreate && date >= getTodayDate() && (!canCreateForDate(date) || !isClinicWeekday(date)) ? (
              <LeaveBlockedNotice date={date} />
            ) : (
              <div className="py-10 text-sm text-brand-body">
                {text('ไม่พบรอบตรวจตามตัวกรอง ลองเปลี่ยนวันหรือสถานะ', 'No time slots match these filters. Try another date or status.')}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  const monthDayHeaders = locale === 'th' ? ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="overflow-x-auto" aria-label={text('ปฏิทินรายเดือน', 'Monthly schedule')}>
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-y border-brand-border-soft bg-brand-surface/60">
          {monthDayHeaders.map((dayName) => (
            <div key={dayName} className="py-3 text-center text-xs font-semibold text-brand-strong">
              {dayName}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-brand-border-soft">
          {days.map((date) => {
            const daySlots = slots.filter((slot) => slot.slotDate === date);
            const isToday = date === getTodayDate();
            const isCurrentMonth = currentMonth ? date.startsWith(currentMonth) : true;
            return (
              <div
                key={date}
                onDoubleClick={() => onSelectDay?.(date)}
                className={`group min-h-36 min-w-0 cursor-pointer select-none p-2 transition-colors hover:bg-brand-soft/40 ${
                  isToday ? 'bg-brand-surface/50' : !isCurrentMonth ? 'bg-slate-50/40' : ''
                }`}
                title={text('ดับเบิลคลิกเพื่อดูตารางตรวจรายวัน', 'Double-click to view the daily schedule')}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay?.(date);
                    }}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold focus-visible:outline-2 focus-visible:outline-brand-strong ${
                      isToday
                        ? 'bg-brand-strong text-white shadow-xs'
                        : !isCurrentMonth
                          ? 'text-slate-400 hover:bg-brand-soft hover:text-brand-ink'
                          : 'text-brand-ink hover:bg-brand-soft hover:text-brand-strong'
                    }`}
                    title={text(`ดูตารางตรวจวันที่ ${formatShortDate(date, locale)}`, `View schedule for ${formatShortDate(date, locale)}`)}
                    aria-label={text(`ดูรายวัน ${formatShortDate(date, locale)}`, `View day: ${formatShortDate(date, locale)}`)}
                  >
                    {parseClinicDate(date).getUTCDate()}
                  </button>
                </div>
                <LeaveChips date={date} leaves={doctorLeaves} doctors={doctors} canModify={canModifyLeave} onEdit={onEditLeave} />
                <div className={`space-y-2 ${!isCurrentMonth ? 'opacity-60' : ''}`}>
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      <MiniSlot
                        slot={slot}
                        doctors={doctors}
                        services={services}
                        canModify={canModifySlot(slot)}
                        onEdit={() => onEdit(slot)}
                      />
                    </div>
                  ))}
                </div>
                {canCreate && date >= getTodayDate() && canCreateForDate(date) && isClinicWeekday(date) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreate(undefined, date);
                    }}
                    className="mt-2 flex min-h-11 w-full items-center justify-center gap-1 text-xs text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand-strong"
                    title={text('เพิ่มรอบตรวจ', 'Add time slot')}
                    aria-label={text(`เพิ่มรอบตรวจวันที่ ${formatShortDate(date, locale)}`, `Add a time slot for ${formatShortDate(date, locale)}`)}
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />{text('เพิ่มรอบ', 'Add time slot')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniSlot({
  slot,
  doctors,
  services,
  canModify = true,
  onEdit,
}: {
  slot: ScheduleSlot;
  doctors: import('@/types/schedule').ScheduleDoctor[];
  services: import('@/types/schedule').ScheduleService[];
  canModify?: boolean;
  onEdit: () => void;
}) {
  const { text } = useLocale();
  const doctor = doctors.find((item) => item.id === slot.doctorId);
  const service = services.find((item) => item.id === slot.serviceId);
  const config = slotStyles[slot.status];
  const colors = `${config.marker} ${config.text}`;
  if (!canModify) {
    return (
      <div
        className={`block min-h-11 w-full rounded-lg border border-brand-border-soft border-l-4 bg-white px-3 py-2 text-left text-xs leading-5 shadow-xs ${colors}`}
        title={`${slot.startTime} ${service?.name ?? ''} ${doctor?.fullName ?? ''} (${text('ดูเท่านั้น', 'view only')})`}
      >
        <span className="block font-semibold tabular-nums">{slot.startTime} · {text(config.label, statusLabelEnglish[slot.status])}</span>
        <span className="block break-words text-brand-ink">{service?.name ?? text('ไม่พบบริการ', 'Service unavailable')}</span>
        <span className="block break-words text-brand-body">{doctor?.fullName ?? text('ไม่พบแพทย์', 'Clinician unavailable')}</span>
        <span className="block tabular-nums text-brand-body">{text('ผู้จอง', 'Booked')} {slot.bookedCount}/{slot.maxCapacity}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`block min-h-11 w-full rounded-lg border border-brand-border-soft border-l-4 bg-white px-3 py-2 text-left text-xs leading-5 shadow-xs transition-shadow hover:bg-brand-soft hover:shadow-sm focus-visible:outline-2 focus-visible:outline-brand-strong ${colors}`}
      aria-label={`${text('แก้ไขรอบ', 'Edit time slot')} ${slot.startTime} ${service?.name ?? ''} ${doctor?.fullName ?? ''}`}
      title={`${slot.startTime} ${service?.name ?? ''} ${doctor?.fullName ?? ''}`}
    >
      <span className="block font-semibold tabular-nums">{slot.startTime} · {text(config.label, statusLabelEnglish[slot.status])}</span>
      <span className="block break-words text-brand-ink">{service?.name ?? text('ไม่พบบริการ', 'Service unavailable')}</span>
      <span className="block break-words text-brand-body">{doctor?.fullName ?? text('ไม่พบแพทย์', 'Clinician unavailable')}</span>
      <span className="block tabular-nums text-brand-body">{text('ผู้จอง', 'Booked')} {slot.bookedCount}/{slot.maxCapacity}</span>
      <span className="block text-brand-strong">{text('แก้ไข', 'Edit')}</span>
    </button>
  );
}
