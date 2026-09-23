import Link from 'next/link';
import { ArrowRight, CalendarDays, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import type { DoctorLeave, ScheduleDepartment, ScheduleDoctor, ScheduleService, ScheduleSlot, ScheduleSlotStatus } from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { THAI_MONTHS_SHORT, WEEKDAY_NAMES } from '@/constants/dateTime';
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

export function formatShortDate(isoDate: string) {
  const date = parseClinicDate(isoDate);
  return `${date.getUTCDate()} ${THAI_MONTHS_SHORT[date.getUTCMonth()]}`;
}

export function formatWeekRange(start: string) {
  const end = shiftClinicDate(start, 6);
  return `${formatShortDate(start)} – ${formatShortDate(end)} ${parseClinicDate(end).getUTCFullYear() + 543}`;
}

export function formatLeaveRange(leave: DoctorLeave) {
  return leave.startDate === leave.endDate
    ? formatShortDate(leave.startDate)
    : `${formatShortDate(leave.startDate)}–${formatShortDate(leave.endDate)}`;
}

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
  const {
    view, weekDays, displayDays, weekStart, visibleSlots, doctors, departments, services,
    role, canBook, visibleDoctorLeaves, canModifySlot, canCreateForDate, openSlotForm,
    toggleClosed, handleDrillDownDay, openLeaveForm,
  } = props;

  if (view !== 'week') {
    return (
      <CalendarBoard
        view={view}
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
                      aria-label={`เปิดตารางตรวจวันที่ ${formatShortDate(date)}`}
                      className="cursor-pointer px-3 py-4 text-center hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong"
                       title={`ดับเบิลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date)}`}
                    >
                      <div className={`text-xs font-semibold ${isToday ? 'text-sky-700' : 'text-slate-500'}`}>{WEEKDAY_NAMES[parsed.getUTCDay()]}</div>
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
                       title={`ดับเบิลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date)}`}
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
                            ไม่พบรอบตรวจ
                          </div>
                        ) : !canCreateForDate(date) || !isClinicWeekday(date) ? (
                          <LeaveBlockedNotice date={date} />
                        ) : (
                          <button type="button" onClick={() => openSlotForm(undefined, date)} aria-label={`เพิ่มรอบตรวจวันที่ ${formatShortDate(date)}`} className={textButtonClass}>
                            <Plus className="mb-2 h-4 w-4" aria-hidden="true" />เพิ่มรอบ
                          </button>
                        )
                      )}
                      <button type="button" onClick={() => handleDrillDownDay(date)} aria-label={`ดูรายวัน ${formatShortDate(date)}`} className={`${textButtonClass} mt-auto text-xs`}>
                        ดูรายวัน <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
                     title={`ดับเบิลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date)}`}
                  >
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-sky-700">{WEEKDAY_NAMES[parsed.getUTCDay()]}</div>
                        <h2 className="font-bold text-slate-950">{formatShortDate(date)}</h2>
                      </div>
                      <LeaveChips date={date} leaves={visibleDoctorLeaves} doctors={doctors} canModify={role !== 'patient'} onEdit={openLeaveForm} />
                      <button type="button" onClick={() => handleDrillDownDay(date)} aria-label={`ดูรายวัน ${formatShortDate(date)}`} className={textButtonClass}>
                        ดูรายวัน <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {role !== 'patient' && date >= getTodayDate() && canCreateForDate(date) && isClinicWeekday(date) && (
                        <button type="button" onClick={() => openSlotForm(undefined, date)} aria-label={`เพิ่มรอบตรวจวันที่ ${formatShortDate(date)}`} className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                          <Plus className="h-4 w-4" aria-hidden="true" />เพิ่มรอบ
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
                        <p className="py-3 text-sm text-brand-body sm:col-span-2">ไม่พบรอบตรวจตามตัวกรอง</p>
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
  const doctor = doctors.find((item) => item.id === slot.doctorId);
  const department = departments.find((item) => item.id === doctor?.departmentId);
  const service = services.find((item) => item.id === slot.serviceId);
  const config = slotStyles[slot.status];

  return (
    <article className={`min-w-0 rounded-xl border border-brand-border-soft border-l-4 bg-white px-4 py-4 shadow-xs transition-shadow hover:shadow-sm ${config.marker}`}>
      <div className="text-sm font-bold tabular-nums text-brand-ink">{slot.startTime}–{slot.endTime}</div>
      <h3 className="mt-2 break-words text-sm font-semibold leading-6 text-brand-ink">{service?.name ?? 'ไม่พบบริการ'}</h3>
      <p className="mt-1 break-words text-sm leading-6 text-brand-body">{doctor?.fullName ?? 'ไม่พบแพทย์'}</p>
      {department && <p className="text-xs leading-5 text-brand-body">{department.name}</p>}
      <p className={`mt-2 text-sm font-semibold ${config.text}`}>
        {config.label}{slot.status === 'available' && ` · ว่าง ${Math.max(0, slot.maxCapacity - slot.bookedCount)} ที่`}
      </p>
      <p className="mt-1 text-xs tabular-nums text-brand-body">ผู้จอง {slot.bookedCount}/{slot.maxCapacity} คน</p>
      {canModify && (
        <div className="mt-2 flex flex-wrap gap-x-3">
          <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong" aria-label={`แก้ไขรอบ ${slot.startTime}`}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />แก้ไข
          </button>
          <button type="button" onClick={onToggleClosed} className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand-body hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong" aria-label={slot.status === 'closed' ? 'เปิดรอบตรวจ' : 'ปิดรอบตรวจ'}>
            {slot.status === 'closed' ? <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
            {slot.status === 'closed' ? 'เปิดรอบ' : 'ปิดรอบ'}
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
  if (view === 'day') {
    const date = days[0];
    return (
      <div aria-label="ปฏิทินรายวัน">
        <div className="border-y border-brand-border-soft bg-brand-surface/60 px-4 py-5">
          <div className="text-xs font-semibold text-brand-strong">{WEEKDAY_NAMES[parseClinicDate(date).getUTCDay()]}</div>
          <h2 className="mt-1 text-lg font-bold text-brand-ink">{formatShortDate(date)}</h2>
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
                    aria-label="จองไม่ได้ รอบตรวจเต็มแล้ว"
                    className="inline-flex min-h-11 cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-500"
                  >
                    {canBook ? 'จอง (เต็มแล้ว)' : 'รอบตรวจเต็มแล้ว'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                <Link
                  href={canBook
                    ? { pathname: '/appointments', query: { slotId: slot.id } }
                    : { pathname: '/login', query: { redirect: `/appointments?slotId=${slot.id}` } }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-ink px-4 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  {canBook ? 'จอง' : 'เข้าสู่ระบบเพื่อจอง'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                )
              )}
            </div>
          ))}
          {slots.filter((slot) => slot.slotDate === date).length === 0 && (
            canCreate && date >= getTodayDate() && canCreateForDate(date) && isClinicWeekday(date) ? (
              <button type="button" onClick={() => onCreate(undefined, date)} className={`${textButtonClass} my-8`}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />เพิ่มรอบตรวจวันนี้
              </button>
            ) : canCreate && date >= getTodayDate() && (!canCreateForDate(date) || !isClinicWeekday(date)) ? (
              <LeaveBlockedNotice date={date} />
            ) : (
              <div className="py-10 text-sm text-brand-body">
                ไม่พบรอบตรวจตามตัวกรอง ลองเปลี่ยนวันหรือสถานะ
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  const monthDayHeaders = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  return (
    <div className="overflow-x-auto" aria-label="ปฏิทินรายเดือน">
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
                title="ดับเบิลคลิกเพื่อดูตารางตรวจรายวัน"
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
                    title={`ดูตารางตรวจวันที่ ${formatShortDate(date)}`}
                    aria-label={`ดูรายวัน ${formatShortDate(date)}`}
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
                    title="เพิ่มรอบตรวจ"
                    aria-label={`เพิ่มรอบตรวจวันที่ ${formatShortDate(date)}`}
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />เพิ่มรอบ
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
  const doctor = doctors.find((item) => item.id === slot.doctorId);
  const service = services.find((item) => item.id === slot.serviceId);
  const config = slotStyles[slot.status];
  const colors = `${config.marker} ${config.text}`;
  if (!canModify) {
    return (
      <div
        className={`block min-h-11 w-full rounded-lg border border-brand-border-soft border-l-4 bg-white px-3 py-2 text-left text-xs leading-5 shadow-xs ${colors}`}
        title={`${slot.startTime} ${service?.name ?? ''} ${doctor?.fullName ?? ''} (ดูเท่านั้น)`}
      >
        <span className="block font-semibold tabular-nums">{slot.startTime} · {config.label}</span>
        <span className="block break-words text-brand-ink">{service?.name ?? 'ไม่พบบริการ'}</span>
        <span className="block break-words text-brand-body">{doctor?.fullName ?? 'ไม่พบแพทย์'}</span>
        <span className="block tabular-nums text-brand-body">ผู้จอง {slot.bookedCount}/{slot.maxCapacity} คน</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      className={`block min-h-11 w-full rounded-lg border border-brand-border-soft border-l-4 bg-white px-3 py-2 text-left text-xs leading-5 shadow-xs transition-shadow hover:bg-brand-soft hover:shadow-sm focus-visible:outline-2 focus-visible:outline-brand-strong ${colors}`}
      aria-label={`แก้ไขรอบ ${slot.startTime} ${service?.name ?? ''} ${doctor?.fullName ?? ''}`}
      title={`${slot.startTime} ${service?.name ?? ''} ${doctor?.fullName ?? ''}`}
    >
      <span className="block font-semibold tabular-nums">{slot.startTime} · {config.label}</span>
      <span className="block break-words text-brand-ink">{service?.name ?? 'ไม่พบบริการ'}</span>
      <span className="block break-words text-brand-body">{doctor?.fullName ?? 'ไม่พบแพทย์'}</span>
      <span className="block tabular-nums text-brand-body">ผู้จอง {slot.bookedCount}/{slot.maxCapacity} คน</span>
      <span className="block text-brand-strong">แก้ไข</span>
    </button>
  );
}
