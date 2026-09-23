import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Copy, Plus, RefreshCw } from 'lucide-react';
import DatePicker from '@/components/common/DatePicker';
import type { ScheduleDepartment, ScheduleDoctor, ScheduleService, ScheduleSlot, ScheduleSlotStatus } from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { THAI_MONTHS_SHORT } from '@/constants/dateTime';
import {
  formatShortDate,
  formatWeekRange,
  getCurrentWeekMonday,
  parseClinicDate,
  shiftClinicDate,
  shiftClinicMonth,
  textButtonClass,
  type CalendarView,
} from './ScheduleCalendar';

const filterClass = 'h-11 w-full rounded-lg border border-brand-border-strong bg-transparent px-3 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';

type HeaderProps = {
  role: UserRole;
  isLoading: boolean;
  openSlotForm: (slot?: ScheduleSlot, suggestedDate?: string) => void;
  openBatchForm: (mode: 'range' | 'copy') => void;
  openLeaveForm: () => void;
  openServiceForm: () => void;
};

export function ScheduleWorkspaceHeader({ role, isLoading, openSlotForm, openBatchForm, openLeaveForm, openServiceForm }: HeaderProps) {
  return (
    <header className="sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-brand-surface/90 backdrop-blur-md shadow-[0_4px_16px_-4px_rgba(16,47,61,0.06)] transition-shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <h1 className="text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl lg:text-4xl">ตารางตรวจแพทย์</h1>
          {role !== 'patient' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
              <button type="button" disabled={isLoading} onClick={() => openSlotForm()} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50">
                <Plus className="h-4 w-4" aria-hidden="true" />เพิ่มรอบตรวจ
              </button>
              <button type="button" disabled={isLoading} onClick={() => openBatchForm('range')} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-brand-border-strong bg-brand-soft px-4 text-sm font-semibold text-brand-strong hover:bg-brand-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />สร้างรอบหลายวัน
              </button>
              <button type="button" disabled={isLoading} onClick={() => openBatchForm('copy')} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50">
                <Copy className="h-4 w-4" aria-hidden="true" />คัดลอกรอบจากวันก่อน
              </button>
              <button type="button" disabled={isLoading} onClick={() => openLeaveForm()} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-800 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:opacity-50">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />บันทึกวันลาแพทย์
              </button>
              <button type="button" disabled={isLoading} onClick={() => openServiceForm()} className={`${textButtonClass} shrink-0 whitespace-nowrap disabled:opacity-50`}>
                <Plus className="h-4 w-4" aria-hidden="true" />เพิ่มบริการ
              </button>
            </div>
          )}
        </div>
      </header>
  );
}

type CalendarToolbarProps = {
  calendarView: CalendarView;
  setCalendarView: Dispatch<SetStateAction<CalendarView>>;
  weekStart: string;
  setWeekStart: Dispatch<SetStateAction<string>>;
  availableSlotDates: string[];
  jumpToToday: () => void;
  effectiveDepartmentFilter: string;
  setDepartmentFilter: Dispatch<SetStateAction<string>>;
  openDepartments: ScheduleDepartment[];
  effectiveServiceFilter: string;
  setServiceFilter: Dispatch<SetStateAction<string>>;
  openServices: ScheduleService[];
  doctorFilter: string;
  setDoctorFilter: Dispatch<SetStateAction<string>>;
  filteredDoctors: ScheduleDoctor[];
  statusFilter: 'all' | ScheduleSlotStatus;
  setStatusFilter: Dispatch<SetStateAction<'all' | ScheduleSlotStatus>>;
  visibleSlots: ScheduleSlot[];
  slots: ScheduleSlot[];
  nearestSlotDate: string | null;
  role: UserRole;
  currentDoctor?: ScheduleDoctor;
  setNotice: Dispatch<SetStateAction<string>>;
};

export function ScheduleCalendarToolbar(props: CalendarToolbarProps) {
  const {
    calendarView, setCalendarView, weekStart, setWeekStart, availableSlotDates, jumpToToday,
    effectiveDepartmentFilter, setDepartmentFilter, openDepartments, effectiveServiceFilter,
    setServiceFilter, openServices, doctorFilter, setDoctorFilter, filteredDoctors, statusFilter,
    setStatusFilter, visibleSlots, slots, nearestSlotDate, role, currentDoctor, setNotice,
  } = props;
  return (
    <>
      <div className="mb-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setWeekStart((current) =>
                        calendarView === 'day'
                          ? shiftClinicDate(current, -1)
                          : calendarView === 'month'
                          ? shiftClinicMonth(current, -1)
                          : shiftClinicDate(current, -7),
                      )
                    }
                    className={textButtonClass}
                    aria-label="ช่วงก่อนหน้า"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <DatePicker
                    ariaLabel="เลือกวันที่ตารางตรวจ"
                    mode="single"
                    value={weekStart}
                    onChange={(newDate) => {
                      if (calendarView === 'week') {
                        setWeekStart(getCurrentWeekMonday(newDate));
                      } else {
                        setWeekStart(newDate);
                      }
                      setNotice(`เลือกวันที่ ${formatShortDate(newDate)} แล้ว`);
                    }}
                    displayCustomText={
                      calendarView === 'day'
                        ? formatShortDate(weekStart)
                        : calendarView === 'month'
                        ? `${THAI_MONTHS_SHORT[parseClinicDate(weekStart).getUTCMonth()]} ${parseClinicDate(weekStart).getUTCFullYear() + 543}`
                        : formatWeekRange(weekStart)
                    }
                    slotDates={availableSlotDates}
                    triggerClassName="min-h-11 rounded-xl border border-brand-border-strong bg-white px-3.5 py-1.5 text-sm font-semibold tabular-nums text-brand-ink shadow-2xs hover:bg-brand-soft hover:border-brand-strong cursor-pointer"
                    className="w-auto"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setWeekStart((current) =>
                        calendarView === 'day'
                          ? shiftClinicDate(current, 1)
                          : calendarView === 'month'
                          ? shiftClinicMonth(current, 1)
                          : shiftClinicDate(current, 7),
                      )
                    }
                    className={textButtonClass}
                    aria-label="ช่วงถัดไป"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className={textButtonClass}
                    aria-label={
                      calendarView === 'day'
                        ? 'ไปยังวันนี้'
                        : calendarView === 'month'
                        ? 'ไปยังเดือนปัจจุบัน'
                        : 'ไปยังสัปดาห์ปัจจุบัน'
                    }
                  >
                    {calendarView === 'day' ? 'วันนี้' : calendarView === 'month' ? 'เดือนนี้' : 'สัปดาห์นี้'}
                  </button>
                </div>
                <label className="flex items-center gap-3 text-sm text-brand-body">
                  <span>มุมมอง</span>
                  <select aria-label="มุมมองปฏิทิน" value={calendarView} onChange={(event) => setCalendarView(event.target.value as CalendarView)} className={filterClass}>
                    <option value="day">วัน</option>
                    <option value="week">สัปดาห์</option>
                    <option value="month">เดือน</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-5">
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
                  <label className="col-span-2 grid gap-2 text-sm text-brand-body sm:col-span-1">
                    <span>แผนก</span>
                    <select aria-label="กรองแผนก" value={effectiveDepartmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setDoctorFilter('all'); }} className={filterClass}>
                      <option value="all">ทุกแผนก</option>
                      {openDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                    </select>
                  </label>
                  <label className="col-span-2 grid gap-2 text-sm text-brand-body sm:col-span-1">
                    <span>บริการ</span>
                    <select aria-label="กรองบริการ" value={effectiveServiceFilter} onChange={(event) => { setServiceFilter(event.target.value); setDoctorFilter('all'); }} className={filterClass}>
                      <option value="all">ทุกบริการ</option>
                      {openServices.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm text-brand-body">
                    <span>แพทย์</span>
                    <select aria-label="กรองแพทย์" value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)} className={filterClass}>
                      <option value="all">แพทย์ทุกคน</option>
                      {filteredDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>)}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-2 text-sm text-brand-body">
                    <span>สถานะ</span>
                    <select aria-label="กรองสถานะ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ScheduleSlotStatus)} className={filterClass}>
                      <option value="all">ทุกสถานะ</option>
                       <option value="available">เปิดให้จอง</option>
                      <option value="full">เต็ม</option>
                      <option value="closed">ปิดรอบ</option>
                    </select>
                  </label>
                </div>
                 <p className="pb-3 text-sm tabular-nums text-brand-body">พบ {visibleSlots.length} รอบตามตัวกรอง</p>
              </div>
            </div>

            {slots.length > 0 && visibleSlots.length === 0 && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border-strong bg-brand-soft/70 px-4 py-3 text-sm text-brand-strong animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
                  <span>
                    {nearestSlotDate
                      ? (calendarView === 'day'
                           ? 'วันนี้ไม่พบรอบตรวจตามตัวกรอง'
                          : calendarView === 'month'
                           ? 'เดือนนี้ไม่พบรอบตรวจตามตัวกรอง'
                           : 'สัปดาห์นี้ไม่พบรอบตรวจตามตัวกรอง')
                       : 'ไม่พบรอบตรวจตามตัวกรอง'}
                  </span>
                </div>
                {nearestSlotDate ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWeekStart(getCurrentWeekMonday(nearestSlotDate));
                      setCalendarView('week');
                      setNotice(`ไปยังสัปดาห์ที่มีรอบตรวจ: ${formatShortDate(getCurrentWeekMonday(nearestSlotDate))}`);
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-strong px-3 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover transition cursor-pointer"
                  >
                    ไปยังสัปดาห์ที่มีรอบตรวจ ({formatShortDate(getCurrentWeekMonday(nearestSlotDate))})
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentFilter('all');
                      setServiceFilter('all');
                      setDoctorFilter(role === 'medical' && currentDoctor ? currentDoctor.id : 'all');
                      setStatusFilter('all');
                       setNotice('ล้างตัวกรองแล้ว');
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-strong px-3 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
            )}
    </>
  );
}
