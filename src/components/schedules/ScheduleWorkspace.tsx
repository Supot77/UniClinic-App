'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarRange,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  AlertTriangle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Users,
  X,
  Trash2,
} from 'lucide-react';
import ScheduleSkeleton from './ScheduleSkeleton';
import ConfirmationModal, { type ConfirmationModalRequest } from '@/components/common/ConfirmationModal';
import Toast from '@/components/common/Toast';
import DatePicker from '@/components/common/DatePicker';
import { useShop } from '@/features/shop/context/ShopProvider';
import type { DoctorLeave, ScheduleSlot, ScheduleSlotStatus } from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { CLINIC_TIME_BLOCKS, LEAVE_REASONS, THAI_MONTHS_SHORT, WEEKDAY_NAMES } from '@/constants/dateTime';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-4 focus:ring-sky-100';

const filterClass = 'h-11 w-full rounded-lg border border-brand-border-strong bg-transparent px-3 text-sm text-brand-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';
const textButtonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-brand-strong hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong';

function ViewportPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

const slotStyles: Record<ScheduleSlotStatus, { label: string; marker: string; text: string }> = {
  available: { label: 'เปิดรับ', marker: 'border-l-status-success', text: 'text-status-success' },
  full: { label: 'เต็ม', marker: 'border-l-status-warning', text: 'text-status-warning' },
  closed: { label: 'ปิดรอบ', marker: 'border-l-status-neutral', text: 'text-status-neutral' },
};

import {
  buildSlotBatchPlan,
  deriveSlotStatus,
  countAffectedSlots,
  getClinicDatesForWeekdays,
  getBangkokCurrentTime,
  getBangkokToday,
  isDoctorOnLeave,
  isSlotExpired,
} from '@/features/shop/domain/rules';
import type { SlotBatchInput, SlotBatchTimeBlock } from '@/features/shop/domain/rules';

function getTodayDate(): string {
  return getBangkokToday();
}

function getCurrentWeekMonday(refDateStr?: string): string {
  const dateStr = refDateStr ?? getTodayDate();
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(Date.UTC(y, m - 1, diff));
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}

type CalendarView = 'day' | 'week' | 'month';

interface SlotDraft {
  doctorId: string;
  serviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

type BatchMode = 'range' | 'copy';

interface SlotBatchDraft {
  doctorId: string;
  serviceId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: 30 | 60;
  maxCapacity: number;
  sourceDate: string;
  targetDate: string;
}

const weekdayOptions = [
  { value: 1, label: 'จันทร์', shortLabel: 'จ.' },
  { value: 2, label: 'อังคาร', shortLabel: 'อ.' },
  { value: 3, label: 'พุธ', shortLabel: 'พ.' },
  { value: 4, label: 'พฤหัสบดี', shortLabel: 'พฤ.' },
  { value: 5, label: 'ศุกร์', shortLabel: 'ศ.' },
] as const;

function createEmptySlotBatchDraft(doctorId = '', serviceId = ''): SlotBatchDraft {
  const today = getTodayDate();
  return {
    doctorId,
    serviceId,
    startDate: today,
    endDate: shiftClinicDate(today, 6),
    weekdays: [1, 2, 3, 4, 5],
    startTime: '08:30',
    endTime: '12:00',
    slotDurationMinutes: 30,
    maxCapacity: 1,
    sourceDate: '',
    targetDate: today,
  };
}

function getPreviousSlotDates(slots: ScheduleSlot[], doctorId: string, targetDate: string) {
  return [...new Set(
    slots
      .filter((slot) => slot.doctorId === doctorId && slot.slotDate < targetDate)
      .map((slot) => slot.slotDate),
  )].sort((a, b) => b.localeCompare(a));
}

function getBatchTimeBlocks(startTime: string, endTime: string, duration: 30 | 60, maxCapacity: number): SlotBatchTimeBlock[] {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || !Number.isInteger(maxCapacity) || maxCapacity < 1) return [];
  const blocks: SlotBatchTimeBlock[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration) {
    const blockEnd = cursor + duration;
    blocks.push({
      startTime: `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`,
      endTime: `${String(Math.floor(blockEnd / 60)).padStart(2, '0')}:${String(blockEnd % 60).padStart(2, '0')}`,
      maxCapacity,
    });
    if (blockEnd === 12 * 60) cursor = 13 * 60 - duration;
  }
  const lastEnd = blocks[blocks.length - 1]?.endTime;
  return lastEnd === endTime ? blocks : [];
}

interface DoctorLeaveDraft {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const emptySlotDraft: SlotDraft = {
  doctorId: '',
  serviceId: '',
  get slotDate() {
    return getTodayDate();
  },
  startTime: '08:30',
  endTime: '09:00',
  maxCapacity: 1,
};

function createEmptyDoctorLeaveDraft(): DoctorLeaveDraft {
  const today = getTodayDate();
  return { doctorId: '', startDate: today, endDate: today, reason: '' };
}

function parseClinicDate(isoDate: string) {
  // Treat YYYY-MM-DD as a Bangkok calendar date, independent of the browser's zone.
  return new Date(`${isoDate}T12:00:00Z`);
}

function toClinicDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftClinicDate(isoDate: string, days: number) {
  const date = parseClinicDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toClinicDate(date);
}

function shiftClinicMonth(isoDate: string, deltaMonths: number) {
  const date = parseClinicDate(isoDate);
  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() + deltaMonths;
  const targetDate = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0));
  return toClinicDate(targetDate);
}

function formatShortDate(isoDate: string) {
  const date = parseClinicDate(isoDate);
  return `${date.getUTCDate()} ${THAI_MONTHS_SHORT[date.getUTCMonth()]}`;
}

function formatWeekRange(start: string) {
  const end = shiftClinicDate(start, 6);
  return `${formatShortDate(start)} – ${formatShortDate(end)} ${parseClinicDate(end).getUTCFullYear() + 543}`;
}

function formatLeaveRange(leave: DoctorLeave) {
  return leave.startDate === leave.endDate
    ? formatShortDate(leave.startDate)
    : `${formatShortDate(leave.startDate)}–${formatShortDate(leave.endDate)}`;
}

function addMinutesToTime(timeStr: string, minutes = 30): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function isClinicWeekday(date: string) {
  const day = parseClinicDate(date).getUTCDay();
  return day >= 1 && day <= 5;
}

export function getNextAvailableTimeSlot(
  slots: ScheduleSlot[],
  doctorId: string,
  slotDate: string,
): { startTime: string; endTime: string } {
  if (!doctorId || !slotDate) {
    return { startTime: '08:30', endTime: '09:00' };
  }
  const doctorDaySlots = slots.filter(
    (s) => s.doctorId === doctorId && s.slotDate === slotDate,
  );
  if (doctorDaySlots.length === 0) {
    return { startTime: '08:30', endTime: '09:00' };
  }
  const latestEndTime = doctorDaySlots.reduce((max, s) => (s.endTime > max ? s.endTime : max), '08:30');

  // Skip lunch break 12:00–13:00
  if (latestEndTime >= '12:00' && latestEndTime < '13:00') {
    return { startTime: '13:00', endTime: '13:30' };
  }
  // If latestEndTime is already at or past closing time 16:30
  if (latestEndTime >= '16:30') {
    return { startTime: '16:00', endTime: '16:30' };
  }
  const nextEndTime = addMinutesToTime(latestEndTime, 30);
  return {
    startTime: latestEndTime,
    endTime: nextEndTime > '16:30' ? '16:30' : nextEndTime,
  };
}

export default function ScheduleWorkspace({ role, actorId }: { role: UserRole; actorId: string }) {
  const {
    departments,
    doctors,
    services = [],
    slots,
    doctorLeaves = [],
    refresh: refreshShop,
    saveService: persistService,
    saveSlot: persistSlot,
    createSlotBatch: persistSlotBatch,
    toggleSlot: persistSlotToggle,
    saveDoctorLeave: persistDoctorLeave,
    deleteDoctorLeave: persistDoctorLeaveDelete,
    isLoading,
  } = useShop();

  const currentDoctor = useMemo(
    () => doctors.find((d) => d.profileId === actorId || d.id === actorId),
    [doctors, actorId],
  );
  const visibleDoctorLeaves = useMemo(
    () => role === 'patient'
      ? []
      : role === 'medical' && currentDoctor
        ? doctorLeaves.filter((leave) => leave.doctorId === currentDoctor.id)
        : doctorLeaves,
    [currentDoctor, doctorLeaves, role],
  );

  const [weekStart, setWeekStart] = useState(() => getCurrentWeekMonday());
  const [isSaving, setIsSaving] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>('week');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState<string>(() => {
    if (role === 'medical') {
      const match = doctors.find((d) => d.profileId === actorId || d.id === actorId);
      return match ? match.id : 'all';
    }
    return 'all';
  });

  const hasSetInitialDoctor = useRef(false);
  useEffect(() => {
    if (role === 'medical' && currentDoctor && !hasSetInitialDoctor.current) {
      setDoctorFilter(currentDoctor.id);
      hasSetInitialDoctor.current = true;
    }
  }, [role, currentDoctor]);
  const [statusFilter, setStatusFilter] = useState<'all' | ScheduleSlotStatus>('available');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SlotDraft>(emptySlotDraft);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceDraft, setServiceDraft] = useState({ code: '', name: '', description: '' });
  const [serviceFormError, setServiceFormError] = useState('');
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveDraft, setLeaveDraft] = useState<DoctorLeaveDraft>(createEmptyDoctorLeaveDraft);
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveIsSaving, setLeaveIsSaving] = useState(false);
  const [leaveIsDeleting, setLeaveIsDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationModalRequest | null>(null);
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<BatchMode>('range');
  const [batchDraft, setBatchDraft] = useState<SlotBatchDraft>(() => createEmptySlotBatchDraft());
  const [batchFormError, setBatchFormError] = useState('');
  const [batchIsSaving, setBatchIsSaving] = useState(false);

  useEffect(() => {
    void refreshShop();
  }, [refreshShop]);

  const [bangkokNow, setBangkokNow] = useState(() => ({
    date: getBangkokToday(),
    time: getBangkokCurrentTime(),
  }));

  useEffect(() => {
    const updateTime = () => {
      setBangkokNow({
        date: getBangkokToday(),
        time: getBangkokCurrentTime(),
      });
    };
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const resolvedSlots = useMemo(() => {
    return slots.map((slot) => {
      const status = deriveSlotStatus(slot.bookedCount, slot.maxCapacity, slot.status, {
        slotDate: slot.slotDate,
        startTime: slot.startTime,
        currentDate: bangkokNow.date,
        currentTime: bangkokNow.time,
      });
      return status !== slot.status ? { ...slot, status } : slot;
    });
  }, [slots, bangkokNow]);

  const openDepartments = useMemo(() => {
    return departments
      .filter((dept) => dept.isActive)
      .map((dept) => {
        const deptDoctorIds = new Set(
          doctors.filter((d) => d.departmentId === dept.id).map((d) => d.id),
        );
        const openSlotsCount = slots.filter(
          (s) => deptDoctorIds.has(s.doctorId) && s.status !== 'closed',
        ).length;
        return {
          ...dept,
          openSlotsCount,
        };
      })
      .filter((dept) => dept.openSlotsCount > 0);
  }, [departments, doctors, slots]);

  const effectiveDepartmentFilter = useMemo(() => {
    if (departmentFilter === 'all') return 'all';
    return openDepartments.some((d) => d.id === departmentFilter) ? departmentFilter : 'all';
  }, [departmentFilter, openDepartments]);

  const activeServices = useMemo(() => services.filter((service) => service.isActive), [services]);
  const openServices = useMemo(
    () => activeServices.filter((service) => slots.some((slot) => slot.serviceId === service.id && slot.status !== 'closed')),
    [activeServices, slots],
  );

  const effectiveServiceFilter = useMemo(() => {
    if (serviceFilter === 'all') return 'all';
    return openServices.some((service) => service.id === serviceFilter) ? serviceFilter : 'all';
  }, [openServices, serviceFilter]);

  const copySourceDates = useMemo(
    () => getPreviousSlotDates(slots, batchDraft.doctorId, batchDraft.targetDate),
    [batchDraft.doctorId, batchDraft.targetDate, slots],
  );
  const effectiveCopySourceDate = copySourceDates.includes(batchDraft.sourceDate)
    ? batchDraft.sourceDate
    : copySourceDates[0] ?? '';
  const copyTimeBlocks = useMemo<SlotBatchTimeBlock[]>(
    () => slots
      .filter((slot) => slot.doctorId === batchDraft.doctorId && slot.slotDate === effectiveCopySourceDate && slot.serviceId === batchDraft.serviceId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((slot) => ({ startTime: slot.startTime, endTime: slot.endTime, maxCapacity: slot.maxCapacity })),
    [batchDraft.doctorId, batchDraft.serviceId, effectiveCopySourceDate, slots],
  );
  const batchDates = useMemo(
    () => batchMode === 'copy'
      ? (batchDraft.targetDate ? [batchDraft.targetDate] : [])
      : getClinicDatesForWeekdays(batchDraft.startDate, batchDraft.endDate, batchDraft.weekdays),
    [batchDraft.endDate, batchDraft.startDate, batchDraft.targetDate, batchDraft.weekdays, batchMode],
  );
  const batchTimeBlocks = useMemo<SlotBatchTimeBlock[]>(
    () => batchMode === 'copy'
      ? copyTimeBlocks
      : getBatchTimeBlocks(batchDraft.startTime, batchDraft.endTime, batchDraft.slotDurationMinutes, batchDraft.maxCapacity),
    [batchDraft.endTime, batchDraft.maxCapacity, batchDraft.slotDurationMinutes, batchDraft.startTime, batchMode, copyTimeBlocks],
  );
  const batchInput = useMemo<SlotBatchInput | null>(() => {
    if (!batchDraft.doctorId || !batchDraft.serviceId || batchDates.length === 0 || batchTimeBlocks.length === 0) return null;
    return {
      doctorId: batchDraft.doctorId,
      serviceId: batchDraft.serviceId,
      dates: batchDates,
      timeBlocks: batchTimeBlocks,
    };
  }, [batchDates, batchDraft.doctorId, batchDraft.serviceId, batchTimeBlocks]);
  const batchPreview = useMemo<ReturnType<typeof buildSlotBatchPlan> | null>(
    () => batchInput
      ? buildSlotBatchPlan(batchInput, slots, doctors, services, bangkokNow.date, visibleDoctorLeaves)
      : null,
    [bangkokNow.date, batchInput, doctors, services, slots, visibleDoctorLeaves],
  );

  const canModifySlot = (slot: ScheduleSlot) => {
    if (role === 'staff_admin') return true;
    if (role === 'medical' && currentDoctor) return slot.doctorId === currentDoctor.id;
    return false;
  };

  const weekDays = useMemo(
    () => {
      const monday = getCurrentWeekMonday(weekStart);
      return Array.from({ length: 7 }, (_, index) => shiftClinicDate(monday, index));
    },
    [weekStart],
  );

  const displayDays = useMemo(() => {
    if (calendarView === 'day') return [weekStart];
    if (calendarView === 'week') return weekDays;
    const first = `${weekStart.slice(0, 7)}-01`;
    const firstDate = parseClinicDate(first);
    const mondayOffset = (firstDate.getUTCDay() + 6) % 7;
    const gridStart = shiftClinicDate(first, -mondayOffset);
    const [year, month] = weekStart.slice(0, 7).split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const totalSlots = mondayOffset + daysInMonth > 35 ? 42 : 35;
    return Array.from({ length: totalSlots }, (_, index) => shiftClinicDate(gridStart, index));
  }, [calendarView, weekDays, weekStart]);

  const filteredDoctors = useMemo(
    () =>
      doctors.filter(
        (doctor) =>
          (effectiveDepartmentFilter === 'all' || doctor.departmentId === effectiveDepartmentFilter) &&
          (effectiveServiceFilter === 'all' || resolvedSlots.some((slot) => slot.doctorId === doctor.id && slot.serviceId === effectiveServiceFilter)),
      ),
    [doctors, effectiveDepartmentFilter, effectiveServiceFilter, resolvedSlots],
  );

  const allFilteredSlots = useMemo(
    () =>
      resolvedSlots.filter((slot) => {
        const doctor = doctors.find((item) => item.id === slot.doctorId);
        const matchesDepartment = effectiveDepartmentFilter === 'all' || doctor?.departmentId === effectiveDepartmentFilter;
        const matchesService = effectiveServiceFilter === 'all' || slot.serviceId === effectiveServiceFilter;
        const matchesDoctor = doctorFilter === 'all' || slot.doctorId === doctorFilter;
        const matchesStatus = statusFilter === 'all' || slot.status === statusFilter;
        return matchesDepartment && matchesService && matchesDoctor && matchesStatus;
      }),
    [doctors, doctorFilter, effectiveDepartmentFilter, effectiveServiceFilter, resolvedSlots, statusFilter],
  );

  const visibleSlots = useMemo(
    () =>
      allFilteredSlots
        .filter((slot) => displayDays.includes(slot.slotDate))
        .sort((a, b) => `${a.slotDate}${a.startTime}`.localeCompare(`${b.slotDate}${b.startTime}`)),
    [allFilteredSlots, displayDays],
  );

  const availableSlotDates = useMemo(() => {
    return [...new Set(resolvedSlots.map((slot) => slot.slotDate))];
  }, [resolvedSlots]);

  const nearestSlotDate = useMemo(() => {
    if (!allFilteredSlots.length) return null;
    const currentMonday = getCurrentWeekMonday(weekStart);
    const matchingDates = [...new Set(allFilteredSlots.map((s) => s.slotDate))].sort();
    const otherWeekDates = matchingDates.filter((d) => getCurrentWeekMonday(d) !== currentMonday);
    if (!otherWeekDates.length) {
      return matchingDates.find((d) => d !== weekStart) ?? null;
    }
    return otherWeekDates.find((d) => d >= currentMonday) ?? otherWeekDates[otherWeekDates.length - 1] ?? null;
  }, [allFilteredSlots, weekStart]);

  const draftLeaveOverlap = useMemo(
    () =>
      leaveDraft.doctorId && leaveDraft.startDate && leaveDraft.endDate
        ? visibleDoctorLeaves.find(
            (leave) =>
              leave.doctorId === leaveDraft.doctorId &&
              leaveDraft.startDate <= leave.endDate &&
              leaveDraft.endDate >= leave.startDate &&
              leave.id !== editingLeaveId,
          )
        : undefined,
    [editingLeaveId, leaveDraft.doctorId, leaveDraft.endDate, leaveDraft.startDate, visibleDoctorLeaves],
  );

  const affectedLeaveSlots = useMemo(
    () =>
      countAffectedSlots(slots, leaveDraft.doctorId, leaveDraft.startDate, leaveDraft.endDate) > 0
        ? slots
            .filter(
              (slot) =>
                slot.doctorId === leaveDraft.doctorId &&
                slot.slotDate >= leaveDraft.startDate &&
                slot.slotDate <= leaveDraft.endDate,
            )
            .sort((a, b) => `${a.slotDate}${a.startTime}`.localeCompare(`${b.slotDate}${b.startTime}`))
        : [],
    [leaveDraft.doctorId, leaveDraft.endDate, leaveDraft.startDate, slots],
  );

  const isMedicalLeaveDate = (date: string) =>
    role === 'medical' && currentDoctor ? isDoctorOnLeave(visibleDoctorLeaves, currentDoctor.id, date) : false;

  const canCreateForDate = (date: string) => !isMedicalLeaveDate(date);

  const openLeaveForm = (leave?: DoctorLeave) => {
    if (role === 'patient') return;
    setLeaveFormError('');
    setFormError('');
    setEditingLeaveId(leave?.id ?? null);
    setLeaveDraft(leave
      ? {
          doctorId: leave.doctorId,
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason ?? '',
        }
      : {
          ...createEmptyDoctorLeaveDraft(),
          doctorId: role === 'medical' && currentDoctor ? currentDoctor.id : doctorFilter !== 'all' ? doctorFilter : '',
        });
    setLeaveFormOpen(true);
  };

  const closeLeaveForm = () => {
    setLeaveFormOpen(false);
    setEditingLeaveId(null);
    setLeaveDraft(createEmptyDoctorLeaveDraft());
    setLeaveFormError('');
  };

  const saveDoctorLeave = async () => {
    setLeaveFormError('');
    setLeaveIsSaving(true);
    const wasEditing = Boolean(editingLeaveId);
    try {
      const result = await persistDoctorLeave(leaveDraft, editingLeaveId ?? undefined, actorId, role);
      if (!result.ok) {
        setLeaveFormError(result.error);
        return;
      }
      closeLeaveForm();
      setNotice(`${wasEditing ? 'แก้ไข' : 'บันทึก'}วันลาแพทย์แล้ว รอบตรวจเดิมยังคงอยู่เพื่อให้จัดการด้วยตนเอง`);
    } catch (err) {
      setLeaveFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกวันลาแพทย์');
    } finally {
      setLeaveIsSaving(false);
    }
  };

  const confirmCancelDoctorLeave = async () => {
    if (!editingLeaveId) return;
    const doctorName = doctors.find((doctor) => doctor.id === leaveDraft.doctorId)?.fullName ?? 'แพทย์';

    setLeaveFormError('');
    setLeaveIsDeleting(true);
    try {
      const result = await persistDoctorLeaveDelete(editingLeaveId, actorId, role);
      if (!result.ok) {
        setLeaveFormError(result.error);
        return;
      }
      setConfirmation(null);
      closeLeaveForm();
      setNotice(`ยกเลิกวันลาของ ${doctorName} แล้ว`);
    } catch (err) {
      setLeaveFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยกเลิกวันลาแพทย์');
    } finally {
      setLeaveIsDeleting(false);
    }
  };

  const cancelDoctorLeave = () => {
    if (!editingLeaveId) return;
    const doctorName = doctors.find((doctor) => doctor.id === leaveDraft.doctorId)?.fullName ?? 'แพทย์';
    setConfirmation({
      title: 'ยืนยันการยกเลิกวันลา',
      message: `ยกเลิกวันลาของ ${doctorName} ช่วง ${formatLeaveRange({ id: editingLeaveId, ...leaveDraft })}? รอบตรวจเดิมจะไม่เปลี่ยนแปลง`,
      confirmLabel: 'ยกเลิกวันลา',
      tone: 'danger',
      onConfirm: confirmCancelDoctorLeave,
    });
  };

  const openSlotForm = (slot?: ScheduleSlot, suggestedDate?: string) => {
    if (role === 'patient') return;
    if (slot && !canModifySlot(slot)) {
      setFormError('คุณไม่มีสิทธิ์แก้ไขรอบตรวจของแพทย์ท่านอื่น');
      return;
    }
    if (slot && isSlotExpired(slot.slotDate, slot.startTime, bangkokNow.date, bangkokNow.time)) {
      setNotice('');
      setFormError('ไม่สามารถแก้ไขรอบตรวจที่เลยเวลาเริ่มแล้ว');
      return;
    }
    if (!slot && suggestedDate && suggestedDate < getTodayDate()) {
      setNotice('');
      setFormError('ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้');
      return;
    }
    if (!slot && suggestedDate && !isClinicWeekday(suggestedDate)) {
      setNotice('');
      setFormError('คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์');
      return;
    }
    setFormError('');
    setNotice('');
    setEditingSlotId(slot?.id ?? null);
    const defaultDoctorId = role === 'medical' && currentDoctor ? currentDoctor.id : (doctorFilter !== 'all' ? doctorFilter : '');
    const today = getTodayDate();
    const initialDate = suggestedDate && suggestedDate >= today ? suggestedDate : (weekDays[0] >= today ? weekDays[0] : today);
    if (!slot && defaultDoctorId && isDoctorOnLeave(visibleDoctorLeaves, defaultDoctorId, initialDate)) {
      setNotice('');
      setFormError('แพทย์มีวันลาในวันที่เลือก ไม่สามารถสร้างรอบตรวจใหม่ได้');
      return;
    }
    const initialTimes = !slot && defaultDoctorId && initialDate
      ? getNextAvailableTimeSlot(slots, defaultDoctorId, initialDate)
      : { startTime: '08:30', endTime: '09:00' };
    setDraft(
      slot
        ? {
            doctorId: slot.doctorId,
            serviceId: slot.serviceId,
            slotDate: slot.slotDate,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxCapacity: slot.maxCapacity,
          }
        : {
            ...emptySlotDraft,
            doctorId: defaultDoctorId,
            serviceId: activeServices[0]?.id ?? '',
            slotDate: initialDate,
            startTime: initialTimes.startTime,
            endTime: initialTimes.endTime,
          },
    );
    setFormOpen(true);
  };

  const openBatchForm = (mode: BatchMode) => {
    if (role === 'patient') return;
    const defaultDoctorId = role === 'medical' && currentDoctor ? currentDoctor.id : doctorFilter !== 'all' ? doctorFilter : '';
    const targetDate = weekDays.find((date) => date >= getTodayDate()) ?? getTodayDate();
    const sourceDates = getPreviousSlotDates(slots, defaultDoctorId, targetDate);
    const sourceDate = sourceDates[0] ?? '';
    const sourceSlot = slots.find((slot) => slot.doctorId === defaultDoctorId && slot.slotDate === sourceDate);
    const serviceId = sourceSlot?.serviceId ?? activeServices[0]?.id ?? '';
    setFormOpen(false);
    setLeaveFormOpen(false);
    setBatchMode(mode);
    setBatchDraft({
      ...createEmptySlotBatchDraft(defaultDoctorId, serviceId),
      startDate: targetDate,
      endDate: shiftClinicDate(targetDate, 6),
      sourceDate,
      targetDate,
    });
    setBatchFormError('');
    setBatchFormOpen(true);
  };

  const closeBatchForm = () => {
    setBatchFormOpen(false);
    setBatchFormError('');
  };

  const saveBatchSlots = async () => {
    if (!batchInput) {
      setBatchFormError('กรอกข้อมูลและเลือกช่วงเวลาที่ต้องการสร้างให้ครบ');
      return;
    }
    if (!batchPreview?.ok) {
      setBatchFormError(batchPreview?.error ?? 'ตรวจสอบข้อมูลก่อนสร้างรอบตรวจ');
      return;
    }
    if (batchPreview.value.slots.length === 0) {
      setBatchFormError('ไม่พบช่วงเวลาว่างสำหรับสร้างรอบใหม่');
      return;
    }
    setBatchIsSaving(true);
    setBatchFormError('');
    try {
      const result = await persistSlotBatch(batchInput, bangkokNow.date, actorId, role);
      if (!result.ok) {
        setBatchFormError(result.error);
        return;
      }
      const skipped = batchPreview.value.skippedConflictCount;
      const leaveNote = batchPreview.value.skippedLeaveDates.length > 0
        ? ` ข้ามวันลา ${batchPreview.value.skippedLeaveDates.length} วัน`
        : '';
      const conflictNote = skipped > 0 ? ` ข้ามรอบที่ชนเดิม ${skipped} รอบ` : '';
      setNotice(`สร้างรอบตรวจ ${result.value} รอบแล้ว${leaveNote}${conflictNote}`);
      closeBatchForm();
    } catch (err) {
      setBatchFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างรอบตรวจหลายวัน');
    } finally {
      setBatchIsSaving(false);
    }
  };

  const saveSlot = async () => {
    if (role === 'patient') return;
    if (!editingSlotId && !isClinicWeekday(draft.slotDate)) {
      setFormError('คลินิกเปิดรอบตรวจเฉพาะวันจันทร์ถึงศุกร์');
      return;
    }
    if (!editingSlotId && draft.slotDate < getTodayDate()) {
      setFormError('ไม่สามารถเพิ่มรอบตรวจของวันในอดีตได้');
      return;
    }
    if (!editingSlotId && isDoctorOnLeave(visibleDoctorLeaves, draft.doctorId, draft.slotDate)) {
      setFormError('แพทย์มีวันลาในวันที่เลือก ไม่สามารถสร้างรอบตรวจใหม่ได้');
      return;
    }
    try {
      setIsSaving(true);
      setFormError('');
      const currentSlot = slots.find((slot) => slot.id === editingSlotId);
      const result = await persistSlot(draft, editingSlotId ?? undefined);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setNotice(currentSlot ? 'อัปเดตรอบตรวจในระบบเรียบร้อยแล้ว' : 'เพิ่มรอบตรวจในระบบเรียบร้อยแล้ว');
      setFormOpen(false);
      setEditingSlotId(null);
      setDraft(emptySlotDraft);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรอบตรวจ');
    } finally {
      setIsSaving(false);
    }
  };

  const openServiceForm = (service?: import('@/types/schedule').ScheduleService) => {
    setServiceFormError('');
    setEditingServiceId(service?.id ?? null);
    setServiceDraft(service ? { code: service.code, name: service.name, description: service.description } : { code: '', name: '', description: '' });
    setServiceFormOpen(true);
  };

  const saveService = async () => {
    setServiceFormError('');
    const result = await persistService({ ...serviceDraft }, editingServiceId ?? undefined);
    if (!result.ok) {
      setServiceFormError(result.error);
      return;
    }
    setServiceFormOpen(false);
    setEditingServiceId(null);
    setServiceDraft({ code: '', name: '', description: '' });
    setNotice(editingServiceId ? 'อัปเดตบริการแล้ว' : 'เพิ่มบริการแล้ว');
  };

  const confirmToggleClosed = async (slot: ScheduleSlot) => {
    if (role === 'patient' || !canModifySlot(slot)) {
      setFormError('คุณไม่มีสิทธิ์แก้ไขหรือปิดรอบตรวจ');
      return;
    }
    if (slot.status === 'closed') {
      if (isSlotExpired(slot.slotDate, slot.startTime, bangkokNow.date, bangkokNow.time)) {
        setFormError('ไม่สามารถเปิดรอบตรวจที่เลยเวลาเริ่มแล้ว');
        return;
      }
      if (slot.bookedCount >= slot.maxCapacity) {
        setFormError('ไม่สามารถเปิดรอบตรวจที่คนเต็มแล้ว');
        return;
      }
    }
    try {
      setIsSaving(true);
      setFormError('');
      const result = await persistSlotToggle(slot.id, actorId, role);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setConfirmation(null);
      setNotice(slot.status === 'closed' ? 'เปิดรอบตรวจอีกครั้งเรียบร้อยแล้ว' : 'ปิดรอบตรวจแล้ว นัดเดิมยังคงอยู่');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการปรับสถานะรอบตรวจ');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleClosed = (slot: ScheduleSlot) => {
    if (role === 'patient' || !canModifySlot(slot)) {
      setFormError('คุณไม่มีสิทธิ์แก้ไขหรือปิดรอบตรวจ');
      return;
    }
    if (slot.status === 'closed') {
      if (isSlotExpired(slot.slotDate, slot.startTime, bangkokNow.date, bangkokNow.time)) {
        setFormError('ไม่สามารถเปิดรอบตรวจที่เลยเวลาเริ่มแล้ว');
        return;
      }
      if (slot.bookedCount >= slot.maxCapacity) {
        setFormError('ไม่สามารถเปิดรอบตรวจที่คนเต็มแล้ว');
        return;
      }
    }
    setConfirmation({
      title: slot.status === 'closed' ? 'ยืนยันการเปิดรอบตรวจ' : 'ยืนยันการปิดรอบตรวจ',
      message: slot.status === 'closed' ? 'เปิดรอบตรวจนี้อีกครั้ง?' : `ปิดรอบตรวจนี้? นัดเดิม ${slot.bookedCount} รายการจะยังคงอยู่`,
      confirmLabel: slot.status === 'closed' ? 'เปิดรอบตรวจ' : 'ปิดรอบตรวจ',
      tone: slot.status === 'closed' ? 'primary' : 'danger',
      onConfirm: () => confirmToggleClosed(slot),
    });
  };

  const jumpToToday = () => {
    const today = getTodayDate();
    if (calendarView === 'day') {
      setWeekStart(today);
      setNotice(`ไปยังวันนี้แล้ว (${formatShortDate(today)})`);
    } else if (calendarView === 'month') {
      setWeekStart(today);
      setNotice('ไปยังเดือนปัจจุบันแล้ว');
    } else {
      setWeekStart(getCurrentWeekMonday(today));
      setNotice('ไปยังสัปดาห์ปัจจุบันแล้ว');
    }
  };

  const handleDrillDownDay = (date: string) => {
    setWeekStart(date);
    setCalendarView('day');
    setNotice(`แสดงรอบตรวจประจำวันที่ ${formatShortDate(date)}`);
  };

  useEffect(() => {
    if (confirmation || (!formOpen && !leaveFormOpen && !batchFormOpen)) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (leaveFormOpen) closeLeaveForm();
      else if (batchFormOpen) closeBatchForm();
      else setFormOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [batchFormOpen, confirmation, formOpen, leaveFormOpen]);

  return (
    <div className="schedule-shell flex min-w-0 flex-col gap-6 sm:gap-8">
      <header className="sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3.5 bg-brand-surface/90 backdrop-blur-md shadow-[0_4px_16px_-4px_rgba(16,47,61,0.06)] transition-shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <h1 className="text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl lg:text-4xl">ตารางแพทย์</h1>
          {role !== 'patient' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
              <button type="button" disabled={isLoading} onClick={() => openSlotForm()} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50">
                <Plus className="h-4 w-4" aria-hidden="true" />เพิ่มรอบตรวจ
              </button>
              <button type="button" disabled={isLoading} onClick={() => openBatchForm('range')} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-brand-border-strong bg-brand-soft px-4 text-sm font-semibold text-brand-strong hover:bg-brand-soft/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />สร้างหลายวัน
              </button>
              <button type="button" disabled={isLoading} onClick={() => openBatchForm('copy')} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:opacity-50">
                <Copy className="h-4 w-4" aria-hidden="true" />คัดลอกวันก่อน
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

      <Toast message={notice} onDismiss={() => setNotice('')} />

      <ConfirmationModal
        request={confirmation}
        onCancel={() => setConfirmation(null)}
        isBusy={isSaving || leaveIsDeleting}
      />

      <div className="space-y-2 empty:hidden" aria-live="polite">
        {formError && !formOpen && (
          <div className="flex items-center justify-between gap-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
            <span className="flex items-center gap-2">
              <X className="h-4 w-4" aria-hidden="true" />
              {formError}
            </span>
            <button type="button" onClick={() => setFormError('')} className="min-h-11 min-w-11 rounded-lg p-2 hover:bg-rose-100" aria-label="ปิดข้อความ">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {batchFormOpen && (
        <ViewportPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-slot-form-title"
            onClick={(event) => { if (event.target === event.currentTarget) closeBatchForm(); }}
          >
          <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">Batch schedule</p>
                <h2 id="batch-slot-form-title" className="mt-1 text-xl font-bold text-slate-950">
                  {batchMode === 'copy' ? 'คัดลอกจากวันทำการล่าสุด' : 'สร้างรอบตรวจหลายวัน'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  ระบบจะสร้างรอบตรวจจริงเฉพาะเมื่อกดบันทึก และไม่แก้ไขรอบที่มีอยู่แล้ว
                </p>
              </div>
              <button type="button" onClick={closeBatchForm} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="ปิดแบบฟอร์มสร้างหลายวัน">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">แพทย์</span>
                {role === 'medical' && currentDoctor ? (
                  <input type="text" disabled value={`${currentDoctor.fullName} (คุณ)`} className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-600`} />
                ) : (
                  <select
                    aria-label="แพทย์สำหรับสร้างรอบหลายวัน"
                    value={batchDraft.doctorId}
                    onChange={(event) => setBatchDraft((current) => ({ ...current, doctorId: event.target.value, sourceDate: '' }))}
                    className={inputClass}
                  >
                    <option value="">เลือกแพทย์</option>
                    {doctors.filter((doctor) => doctor.availability === 'active').map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                    ))}
                  </select>
                )}
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">บริการที่เปิดจอง</span>
                <select aria-label="บริการสำหรับสร้างรอบหลายวัน" value={batchDraft.serviceId} onChange={(event) => setBatchDraft((current) => ({ ...current, serviceId: event.target.value }))} className={inputClass}>
                  <option value="">เลือกบริการ</option>
                  {activeServices.map((service) => <option key={service.id} value={service.id}>{service.code} · {service.name}</option>)}
                </select>
              </label>

              {batchMode === 'range' ? (
                <>
                  <div className="space-y-1.5">
                    <DatePicker
                      label="วันที่เริ่ม"
                      minDate={getTodayDate()}
                      value={batchDraft.startDate}
                      onChange={(newDate) => setBatchDraft((current) => ({ ...current, startDate: newDate, endDate: current.endDate < newDate ? newDate : current.endDate }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <DatePicker
                      label="วันที่สิ้นสุด"
                      minDate={batchDraft.startDate || getTodayDate()}
                      value={batchDraft.endDate}
                      onChange={(newDate) => setBatchDraft((current) => ({ ...current, endDate: newDate }))}
                    />
                  </div>
                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm font-medium text-slate-700">วันที่เปิดตรวจ</legend>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {weekdayOptions.map((weekday) => {
                        const checked = batchDraft.weekdays.includes(weekday.value);
                        return (
                          <label key={weekday.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-semibold transition ${checked ? 'border-brand-strong bg-brand-soft text-brand-strong' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => setBatchDraft((current) => ({
                                ...current,
                                weekdays: checked ? current.weekdays.filter((value) => value !== weekday.value) : [...current.weekdays, weekday.value].sort(),
                              }))}
                            />
                            {weekday.shortLabel}
                            <span className="sr-only">{weekday.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">ช่วงเวลา</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {CLINIC_TIME_BLOCKS.map((block) => {
                        const isSelected = batchDraft.startTime === block.startTime && batchDraft.endTime === block.endTime;
                        return (
                          <button
                            key={block.label}
                            type="button"
                            onClick={() => setBatchDraft((current) => ({ ...current, startTime: block.startTime, endTime: block.endTime }))}
                            className={`${isSelected ? 'bg-brand-soft text-brand-strong' : 'bg-slate-50 text-slate-600'} min-h-10 rounded-lg px-3 text-sm font-semibold hover:bg-brand-soft`}
                          >
                            {block.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">เวลาเริ่ม</span>
                    <input type="time" value={batchDraft.startTime} onChange={(event) => setBatchDraft((current) => ({ ...current, startTime: event.target.value }))} className={inputClass} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">เวลาสิ้นสุด</span>
                    <input type="time" value={batchDraft.endTime} onChange={(event) => setBatchDraft((current) => ({ ...current, endTime: event.target.value }))} className={inputClass} />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">ความยาวแต่ละรอบ</span>
                    <select value={batchDraft.slotDurationMinutes} onChange={(event) => setBatchDraft((current) => ({ ...current, slotDurationMinutes: Number(event.target.value) as 30 | 60 }))} className={inputClass}>
                      <option value={30}>30 นาที</option>
                      <option value={60}>1 ชั่วโมง</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">ความจุต่อรอบ (คน)</span>
                    <input type="number" min={1} step={1} value={batchDraft.maxCapacity} onChange={(event) => setBatchDraft((current) => ({ ...current, maxCapacity: Number(event.target.value) }))} className={inputClass} />
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">วันต้นทาง</span>
                    <select aria-label="วันต้นทาง" value={effectiveCopySourceDate} onChange={(event) => setBatchDraft((current) => ({ ...current, sourceDate: event.target.value }))} className={inputClass} disabled={!copySourceDates.length}>
                      {!copySourceDates.length && <option value="">ยังไม่มีวันก่อนหน้า</option>}
                      {copySourceDates.map((date) => <option key={date} value={date}>{formatShortDate(date)} · {parseClinicDate(date).getUTCFullYear() + 543}</option>)}
                    </select>
                  </label>
                  <div className="space-y-1.5">
                    <DatePicker
                      label="วันที่ต้องการสร้าง"
                      minDate={getTodayDate()}
                      value={batchDraft.targetDate}
                      onChange={(newDate) => setBatchDraft((current) => ({ ...current, targetDate: newDate }))}
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">เวลาที่จะคัดลอก</p>
                    {copyTimeBlocks.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {copyTimeBlocks.map((block) => <span key={`${block.startTime}-${block.endTime}`} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200">{block.startTime}–{block.endTime} · {block.maxCapacity} คน</span>)}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">เลือกแพทย์ที่มีรอบตรวจในวันก่อนหน้า</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {batchInput && batchPreview?.ok && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status" aria-live="polite">
                <p className="font-semibold">พร้อมสร้าง {batchPreview.value.slots.length} รอบ ใน {batchDates.length - batchPreview.value.skippedLeaveDates.length} วัน</p>
                {batchPreview.value.skippedLeaveDates.length > 0 && <p className="mt-1 text-xs">ข้ามวันลา {batchPreview.value.skippedLeaveDates.length} วัน</p>}
                {batchPreview.value.skippedConflictCount > 0 && <p className="mt-1 text-xs">ข้ามรอบที่ชนกับรายการเดิม {batchPreview.value.skippedConflictCount} รอบ</p>}
              </div>
            )}
            {batchInput && batchPreview && !batchPreview.ok && <p className="mt-4 text-sm font-medium text-rose-700" role="alert">{batchPreview.error}</p>}
            {!batchInput && <p className="mt-4 text-sm text-slate-500" role="status">เลือกแพทย์ บริการ และช่วงเวลาที่ต้องการสร้าง เพื่อดูตัวอย่าง</p>}
            {batchFormError && <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{batchFormError}</p>}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={closeBatchForm} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
              <button type="button" disabled={batchIsSaving || !batchPreview?.ok || batchPreview.value.slots.length === 0} onClick={saveBatchSlots} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover disabled:opacity-50">
                {batchIsSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {batchIsSaving ? 'กำลังสร้าง...' : 'สร้างรอบตรวจ'}
              </button>
            </div>
          </div>
          </div>
        </ViewportPortal>
      )}

      {leaveFormOpen && (
        <ViewportPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-form-title"
            onClick={(event) => { if (event.target === event.currentTarget) closeLeaveForm(); }}
          >
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Manual leave</p>
                <h2 id="leave-form-title" className="mt-1 text-xl font-bold text-slate-950">{editingLeaveId ? 'แก้ไขวันลาแพทย์' : 'บันทึกวันลาแพทย์'}</h2>
                <p className="mt-1 text-xs text-slate-500">ระบบจะเก็บรอบตรวจเดิมไว้ และให้เจ้าหน้าที่ประสานผู้ป่วยด้วยตนเอง</p>
              </div>
              <button type="button" onClick={closeLeaveForm} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="ปิดแบบฟอร์มวันลา">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">แพทย์</span>
                {role === 'medical' && currentDoctor ? (
                  <input type="text" disabled value={`${currentDoctor.fullName} (คุณ)`} className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-600`} />
                ) : (
                  <select aria-label="แพทย์สำหรับวันลา" disabled={Boolean(editingLeaveId)} value={leaveDraft.doctorId} onChange={(event) => setLeaveDraft((current) => ({ ...current, doctorId: event.target.value }))} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600`}>
                    <option value="">เลือกแพทย์</option>
                    {doctors.filter((doctor) => doctor.availability !== 'inactive').map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>{doctor.fullName}</option>
                    ))}
                  </select>
                )}
              </label>
              <div className="space-y-1.5">
                <DatePicker
                  label="วันที่เริ่มลา"
                  minDate={getTodayDate()}
                  value={leaveDraft.startDate}
                  onChange={(newDate) => setLeaveDraft((current) => ({ ...current, startDate: newDate, endDate: current.endDate < newDate ? newDate : current.endDate }))}
                />
              </div>
              <div className="space-y-1.5">
                <DatePicker
                  label="วันที่สิ้นสุด"
                  minDate={leaveDraft.startDate || getTodayDate()}
                  value={leaveDraft.endDate}
                  onChange={(newDate) => setLeaveDraft((current) => ({ ...current, endDate: newDate }))}
                />
              </div>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">เหตุผลการลา <span className="font-normal text-slate-400">(ไม่บังคับ)</span></span>
                <select aria-label="เหตุผลการลา" value={leaveDraft.reason} onChange={(event) => setLeaveDraft((current) => ({ ...current, reason: event.target.value }))} className={inputClass}>
                  <option value="">เลือกเหตุผล</option>
                  {LEAVE_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </label>
            </div>

            {leaveDraft.doctorId && leaveDraft.startDate && leaveDraft.endDate && (
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${draftLeaveOverlap ? 'border-rose-200 bg-rose-50 text-rose-800' : affectedLeaveSlots.length > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status" aria-live="polite">
                <div className="flex items-start gap-2">
                  {draftLeaveOverlap ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                  <div>
                    <p className="font-semibold">
                      {draftLeaveOverlap ? 'ช่วงวันลาซ้ำซ้อนกับรายการเดิม' : `มีรอบตรวจเดิมค้างอยู่ ${affectedLeaveSlots.length} รอบในช่วงวันดังกล่าว`}
                    </p>
                    {!draftLeaveOverlap && affectedLeaveSlots.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {affectedLeaveSlots.slice(0, 5).map((slot) => <li key={slot.id}>{formatShortDate(slot.slotDate)} · {slot.startTime}–{slot.endTime}</li>)}
                        {affectedLeaveSlots.length > 5 && <li>และอีก {affectedLeaveSlots.length - 5} รอบ</li>}
                      </ul>
                    )}
                    {!draftLeaveOverlap && affectedLeaveSlots.length === 0 && <p className="mt-1 text-xs">ไม่พบรอบตรวจเดิม ระบบจะไม่สร้างหรือยกเลิกรอบโดยอัตโนมัติ</p>}
                  </div>
                </div>
              </div>
            )}

            {leaveFormError && <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{leaveFormError}</p>}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              {editingLeaveId && (
                <button type="button" disabled={leaveIsSaving || leaveIsDeleting} onClick={cancelDoctorLeave} className="mr-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  {leaveIsDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {!leaveIsDeleting && <Trash2 className="h-4 w-4" aria-hidden="true" />}
                  {leaveIsDeleting ? 'กำลังยกเลิก...' : 'ยกเลิกวันลา'}
                </button>
              )}
              <button type="button" onClick={closeLeaveForm} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">ปิด</button>
              <button type="button" disabled={leaveIsSaving || leaveIsDeleting || Boolean(draftLeaveOverlap)} onClick={saveDoctorLeave} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-800 px-5 text-sm font-semibold text-white shadow-xs hover:bg-violet-900 disabled:opacity-50">
                {leaveIsSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {leaveIsSaving ? 'กำลังบันทึก...' : editingLeaveId ? 'บันทึกการแก้ไข' : 'บันทึกวันลา'}
              </button>
            </div>
          </div>
          </div>
        </ViewportPortal>
      )}

      {formOpen && (
        <ViewportPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-form-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFormOpen(false);
            }}
          >
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80 animate-in zoom-in-95 duration-200">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Slot editor</p>
                <h2 id="slot-form-title" className="mt-1 text-xl font-bold text-slate-950">
                  {editingSlotId ? 'แก้ไขรอบตรวจ' : 'สร้างรอบตรวจใหม่'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  กำหนดช่วงเวลาตรวจและความจุผู้ป่วยเพื่อเปิดรับนัดหมาย
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="ปิดแบบฟอร์ม"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">แพทย์</span>
                {role === 'medical' && currentDoctor ? (
                  <input
                    type="text"
                    disabled
                    value={`${currentDoctor.fullName} (คุณ)`}
                    className={`${inputClass} bg-slate-100 text-slate-600 cursor-not-allowed`}
                  />
                ) : (
                  <select
                    value={draft.doctorId}
                    onChange={(event) => {
                      const newDoctorId = event.target.value;
                      setDraft((current) => {
                        const nextTimes = !editingSlotId && newDoctorId && current.slotDate
                          ? getNextAvailableTimeSlot(slots, newDoctorId, current.slotDate)
                          : { startTime: current.startTime, endTime: current.endTime };
                        return {
                          ...current,
                          doctorId: newDoctorId,
                          startTime: nextTimes.startTime,
                          endTime: nextTimes.endTime,
                        };
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="">เลือกแพทย์</option>
                    {doctors
                      .filter(
                        (doctor) =>
                          doctor.availability === 'active' &&
                          departments.some((department) => department.id === doctor.departmentId && department.isActive),
                      )
                      .map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.fullName} · {departments.find((department) => department.id === doctor.departmentId)?.name}
                        </option>
                      ))}
                  </select>
                )}
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">บริการที่เปิดจอง</span>
                <select
                  value={draft.serviceId}
                  onChange={(event) => setDraft((current) => ({ ...current, serviceId: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">เลือกบริการ</option>
                  {activeServices.map((service) => (
                    <option key={service.id} value={service.id}>{service.code} · {service.name}</option>
                  ))}
                </select>
                {!activeServices.length && <span className="text-xs text-rose-600">ยังไม่มีบริการที่เปิดใช้งาน กด “เพิ่มบริการ” ก่อนสร้างรอบ</span>}
              </label>
              <div className="space-y-1.5 sm:col-span-2">
                <DatePicker
                  label="วันที่"
                  minDate={editingSlotId ? undefined : getTodayDate()}
                  value={draft.slotDate}
                  onChange={(newDate) => {
                    setDraft((current) => {
                      const nextTimes = !editingSlotId && current.doctorId && newDate
                        ? getNextAvailableTimeSlot(slots, current.doctorId, newDate)
                        : { startTime: current.startTime, endTime: current.endTime };
                      return {
                        ...current,
                        slotDate: newDate,
                        startTime: nextTimes.startTime,
                        endTime: nextTimes.endTime,
                      };
                    });
                  }}
                />
              </div>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">เวลาเริ่ม</span>
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(event) => {
                    const newStartTime = event.target.value;
                    setDraft((current) => ({
                      ...current,
                      startTime: newStartTime,
                      endTime: addMinutesToTime(newStartTime, 30),
                    }));
                  }}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">เวลาสิ้นสุด</span>
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">ความจุผู้ป่วย (คน)</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.maxCapacity}
                  onChange={(event) => setDraft((current) => ({ ...current, maxCapacity: Number(event.target.value) }))}
                  className={inputClass}
                />
              </label>
            </div>

            {editingSlotId && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                จำนวนที่จองแล้วจะปรับเปลี่ยนอัตโนมัติตามการจองหรือยกเลิกคิวของผู้ป่วย (ไม่สามารถแก้ไขตัวเลขโดยตรงได้)
              </div>
            )}

            {!editingSlotId && isDoctorOnLeave(visibleDoctorLeaves, draft.doctorId, draft.slotDate) && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200" role="alert">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                แพทย์มีวันลาในวันที่เลือก จึงไม่สามารถสร้างรอบตรวจใหม่ได้
              </div>
            )}

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
                {formError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving || (!editingSlotId && isDoctorOnLeave(visibleDoctorLeaves, draft.doctorId, draft.slotDate))}
                onClick={saveSlot}
                className="min-h-11 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-white hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50 shadow-xs inline-flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />}
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกรอบตรวจ'}
              </button>
            </div>
          </div>
          </div>
        </ViewportPortal>
      )}

      {serviceFormOpen && (
        <ViewportPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-form-title"
            onClick={(event) => { if (event.target === event.currentTarget) setServiceFormOpen(false); }}
          >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/80">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">Service catalog</p>
                <h2 id="service-form-title" className="mt-1 text-xl font-bold text-slate-950">{editingServiceId ? 'แก้ไขบริการ' : 'เพิ่มบริการใหม่'}</h2>
                <p className="mt-1 text-xs text-slate-500">บริการนี้จะถูกเลือกไปเปิดรับจองในวันและรอบของหมอ</p>
              </div>
              <button type="button" onClick={() => setServiceFormOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="ปิดแบบฟอร์มบริการ"><X className="h-5 w-5" aria-hidden="true" /></button>
            </div>
            <div className="space-y-4">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">รหัสบริการ<input className={inputClass} value={serviceDraft.code} onChange={(event) => setServiceDraft((current) => ({ ...current, code: event.target.value }))} placeholder="เช่น GEN-CONSULT" /></label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">ชื่อบริการ<input className={inputClass} value={serviceDraft.name} onChange={(event) => setServiceDraft((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น ตรวจโรคทั่วไป" /></label>
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">คำอธิบาย<textarea rows={3} className={`${inputClass} h-auto py-3`} value={serviceDraft.description} onChange={(event) => setServiceDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              {serviceFormError && <p className="text-sm font-medium text-rose-700" role="alert">{serviceFormError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setServiceFormOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
              <button type="button" onClick={saveService} className="min-h-11 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-white hover:bg-brand-hover">บันทึกบริการ</button>
            </div>
          </div>
          </div>
        </ViewportPortal>
      )}


      <section className="min-w-0" aria-label="ปฏิทินตารางตรวจ" aria-busy={isLoading}>
        {isLoading ? (
          <ScheduleSkeleton />
        ) : (
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
                      <option value="available">เปิดรับ</option>
                      <option value="full">เต็ม</option>
                      <option value="closed">ปิดรอบ</option>
                    </select>
                  </label>
                </div>
                <p className="pb-3 text-sm tabular-nums text-brand-body">{visibleSlots.length} รอบตามตัวกรอง</p>
              </div>
            </div>

            {slots.length > 0 && visibleSlots.length === 0 && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border-strong bg-brand-soft/70 px-4 py-3 text-sm text-brand-strong animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
                  <span>
                    {nearestSlotDate
                      ? (calendarView === 'day'
                          ? 'วันนี้ไม่มีรอบตรวจที่ตรงตามตัวกรอง'
                          : calendarView === 'month'
                          ? 'เดือนนี้ไม่มีรอบตรวจที่ตรงตามตัวกรอง'
                          : 'สัปดาห์นี้ไม่มีรอบตรวจที่ตรงตามตัวกรอง')
                      : 'ไม่พบรอบตรวจที่ตรงตามตัวกรอง'}
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
                      setNotice('ล้างตัวกรองทั้งหมดแล้ว');
                    }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-strong px-3 text-xs font-semibold text-white shadow-xs hover:bg-brand-hover transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
            )}
        {calendarView !== 'week' ? (
          <CalendarBoard
            view={calendarView}
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
            canBook={role === 'patient'}
            onCreate={openSlotForm}
            onEdit={openSlotForm}
            onToggle={toggleClosed}
            onSelectDay={handleDrillDownDay}
            canModifyLeave={role !== 'patient'}
            onEditLeave={openLeaveForm}
          />
        ) : (
          <>
            <div className="hidden lg:block">
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
                      title={`ดับเบิ้ลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date)}`}
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
                      title={`ดับเบิ้ลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date)}`}
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
                    title={`ดับเบิ้ลคลิกเพื่อดูตารางตรวจวันที่ ${formatShortDate(date)}`}
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
        )}
          </>
        )}
      </section>

    </div>
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
      <p className="mt-1 text-xs tabular-nums text-brand-body">จองแล้ว {slot.bookedCount}/{slot.maxCapacity}</p>
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
    return <p className="flex items-center gap-2 py-4 text-center text-xs font-medium text-violet-800"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />วันนี้เป็นวันหยุดของคลินิก ไม่สามารถเพิ่มรอบใหม่</p>;
  }
  return <p className="flex items-center gap-2 py-4 text-center text-xs font-medium text-violet-800"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />แพทย์มีวันลา ไม่สามารถเพิ่มรอบใหม่</p>;
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
              {canBook && slot.status === 'available' && slot.bookedCount < slot.maxCapacity && slot.slotDate > getTodayDate() && (
                <Link
                  href={{ pathname: '/appointments', query: { slotId: slot.id } }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-ink px-4 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  จอง
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
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
                title="ดับเบิ้ลคลิกเพื่อดูตารางตรวจรายวัน"
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
        <span className="block tabular-nums text-brand-body">จองแล้ว {slot.bookedCount}/{slot.maxCapacity}</span>
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
      <span className="block tabular-nums text-brand-body">จองแล้ว {slot.bookedCount}/{slot.maxCapacity}</span>
      <span className="block text-brand-strong">แก้ไข</span>
    </button>
  );
}
