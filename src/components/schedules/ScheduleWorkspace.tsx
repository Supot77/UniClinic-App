'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ScheduleSkeleton from './ScheduleSkeleton';
import { BatchScheduleDialog, type BatchScheduleDraft } from './BatchScheduleDialog';
import { DoctorLeaveDialog, type DoctorLeaveDraft } from './DoctorLeaveDialog';
import { SlotEditorDialog, type SlotDraft } from './SlotEditorDialog';
import { ServiceDialog } from './ServiceDialog';
import { ScheduleCalendar, type CalendarView } from './ScheduleCalendar';
import { ScheduleCalendarToolbar, ScheduleWorkspaceHeader } from './ScheduleWorkspaceToolbar';
import {
  formatShortDate,
  formatLeaveRange,
  getCurrentWeekMonday,
  getTodayDate,
  isClinicWeekday,
  parseClinicDate,
  shiftClinicDate,
} from './ScheduleCalendar';
import ConfirmationModal, { type ConfirmationModalRequest } from '@/components/common/ConfirmationModal';
import Toast from '@/components/common/Toast';
import { useScheduling } from '@/features/scheduling/context/SchedulingProvider';
import type { DoctorLeave, ScheduleSlot, ScheduleSlotStatus } from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { useLocale } from '@/context/LocaleContext';
import {
  buildSlotBatchPlan,
  deriveSlotStatus,
  countAffectedSlots,
  getClinicDatesForWeekdays,
  getBangkokCurrentTime,
  getBangkokToday,
  isDoctorOnLeave,
  isSlotExpired,
  validateSlotEditWindow,
} from '@/features/scheduling/domain/rules';
import type { SlotBatchInput, SlotBatchTimeBlock } from '@/features/scheduling/domain/rules';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow] focus:border-sky-500 focus:ring-4 focus:ring-sky-100';

function ViewportPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

type BatchMode = 'range' | 'copy';

function createEmptyBatchScheduleDraft(doctorId = '', serviceId = ''): BatchScheduleDraft {
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

function addMinutesToTime(timeStr: string, minutes = 30): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
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

export default function ScheduleWorkspace({
  role,
  actorId,
  canBook: canBookOverride,
}: {
  role: UserRole;
  actorId: string;
  canBook?: boolean;
}) {
  const { locale, text } = useLocale();
  const canBook = canBookOverride ?? role === 'patient';
  const {
    departments,
    doctors,
    services = [],
    slots,
    doctorLeaves = [],
    refresh: refreshScheduling,
    saveService: persistService,
    saveSlot: persistSlot,
    createSlotBatch: persistSlotBatch,
    toggleSlot: persistSlotToggle,
    saveDoctorLeave: persistDoctorLeave,
    deleteDoctorLeave: persistDoctorLeaveDelete,
    isLoading,
  } = useScheduling();

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
  const [serviceIsSaving, setServiceIsSaving] = useState(false);
  const [leaveFormOpen, setLeaveFormOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveDraft, setLeaveDraft] = useState<DoctorLeaveDraft>(createEmptyDoctorLeaveDraft);
  const [leaveFormError, setLeaveFormError] = useState('');
  const [leaveIsSaving, setLeaveIsSaving] = useState(false);
  const [leaveIsDeleting, setLeaveIsDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationModalRequest | null>(null);
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<BatchMode>('range');
  const [batchDraft, setBatchDraft] = useState<BatchScheduleDraft>(() => createEmptyBatchScheduleDraft());
  const [batchFormError, setBatchFormError] = useState('');
  const [batchIsSaving, setBatchIsSaving] = useState(false);

  useEffect(() => {
    void refreshScheduling();
  }, [refreshScheduling]);

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
      setLeaveFormError(err instanceof Error ? err.message : 'บันทึกวันลาไม่สำเร็จ');
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
      setLeaveFormError(err instanceof Error ? err.message : 'ยกเลิกวันลาไม่สำเร็จ');
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
      setFormError('คุณไม่มีสิทธิ์แก้ไขรอบตรวจของแพทย์คนอื่น');
      return;
    }
    const editWindow = slot
      ? validateSlotEditWindow(slot, slot, bangkokNow.date, bangkokNow.time)
      : { ok: true as const, value: true as const };
    if (!editWindow.ok) {
      setNotice('');
      setFormError(editWindow.error);
      return;
    }
    if (!slot && suggestedDate && suggestedDate < getTodayDate()) {
      setNotice('');
      setFormError('เพิ่มรอบตรวจย้อนหลังไม่ได้');
      return;
    }
    if (!slot && suggestedDate && !isClinicWeekday(suggestedDate)) {
      setNotice('');
      setFormError('เพิ่มรอบตรวจได้เฉพาะวันจันทร์–ศุกร์');
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
      setFormError('แพทย์มีวันลาในวันที่เลือก จึงเพิ่มรอบตรวจไม่ได้');
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
      ...createEmptyBatchScheduleDraft(defaultDoctorId, serviceId),
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
    setBatchFormError('กรอกข้อมูลและเลือกช่วงเวลาให้ครบ');
      return;
    }
    if (!batchPreview?.ok) {
      setBatchFormError(batchPreview?.error ?? 'ตรวจสอบข้อมูลก่อนสร้างรอบตรวจ');
      return;
    }
    if (batchPreview.value.slots.length === 0) {
    setBatchFormError('ไม่พบช่วงเวลาว่างสำหรับสร้างรอบตรวจ');
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
      const conflictNote = skipped > 0 ? ` ข้ามรอบที่ซ้ำกับรายการเดิม ${skipped} รอบ` : '';
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
      setFormError('เพิ่มรอบตรวจได้เฉพาะวันจันทร์–ศุกร์');
      return;
    }
    if (!editingSlotId && draft.slotDate < getTodayDate()) {
      setFormError('เพิ่มรอบตรวจย้อนหลังไม่ได้');
      return;
    }
    if (!editingSlotId && isDoctorOnLeave(visibleDoctorLeaves, draft.doctorId, draft.slotDate)) {
      setFormError('แพทย์มีวันลาในวันที่เลือก จึงเพิ่มรอบตรวจไม่ได้');
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
      setNotice(currentSlot ? 'อัปเดตรอบตรวจแล้ว' : 'เพิ่มรอบตรวจแล้ว');
      setFormOpen(false);
      setEditingSlotId(null);
      setDraft(emptySlotDraft);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'บันทึกรอบตรวจไม่สำเร็จ');
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
    setServiceIsSaving(true);
    const wasEditing = Boolean(editingServiceId);
    try {
      const result = await persistService({ ...serviceDraft }, editingServiceId ?? undefined);
      if (!result.ok) {
        setServiceFormError(result.error);
        return;
      }
      setServiceFormOpen(false);
      setEditingServiceId(null);
      setServiceDraft({ code: '', name: '', description: '' });
      setNotice(wasEditing ? 'อัปเดตบริการแล้ว' : 'เพิ่มบริการแล้ว');
    } catch (err) {
      setServiceFormError(err instanceof Error ? err.message : 'บันทึกบริการไม่สำเร็จ');
    } finally {
      setServiceIsSaving(false);
    }
  };

  const confirmToggleClosed = async (slot: ScheduleSlot) => {
    if (role === 'patient' || !canModifySlot(slot)) {
      setFormError('คุณไม่มีสิทธิ์แก้ไขหรือปิดรอบตรวจ');
      return;
    }
    if (slot.status === 'closed') {
      if (isSlotExpired(slot.slotDate, slot.startTime, bangkokNow.date, bangkokNow.time)) {
        setFormError('เปิดรอบตรวจไม่ได้ เพราะรอบเริ่มไปแล้ว');
        return;
      }
      if (slot.bookedCount >= slot.maxCapacity) {
        setFormError('เปิดรอบตรวจไม่ได้ เพราะมีผู้จองเต็มแล้ว');
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
      setNotice(slot.status === 'closed' ? 'เปิดรอบตรวจแล้ว' : 'ปิดรอบตรวจแล้ว นัดเดิมยังคงอยู่');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เปลี่ยนสถานะรอบตรวจไม่สำเร็จ');
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
        setFormError('เปิดรอบตรวจไม่ได้ เพราะรอบเริ่มไปแล้ว');
        return;
      }
      if (slot.bookedCount >= slot.maxCapacity) {
        setFormError('เปิดรอบตรวจไม่ได้ เพราะมีผู้จองเต็มแล้ว');
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
      setNotice(text(`ไปยังวันนี้แล้ว (${formatShortDate(today, locale)})`, `Showing today (${formatShortDate(today, locale)}).`));
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
    setNotice(text(`แสดงรอบตรวจประจำวันที่ ${formatShortDate(date, locale)}`, `Showing appointments for ${formatShortDate(date, locale)}.`));
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
      <ScheduleWorkspaceHeader
        role={role}
        isLoading={isLoading}
        openSlotForm={openSlotForm}
        openBatchForm={openBatchForm}
        openLeaveForm={() => openLeaveForm()}
        openServiceForm={openServiceForm}
      />
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
            <button type="button" onClick={() => setFormError('')} className="min-h-11 min-w-11 rounded-lg p-2 hover:bg-rose-100" aria-label={text('ปิดข้อความ', 'Dismiss message')}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {batchFormOpen && (
        <ViewportPortal>
          <BatchScheduleDialog
            role={role}
            currentDoctor={currentDoctor}
            doctors={doctors}
            activeServices={activeServices}
            batchMode={batchMode}
            batchDraft={batchDraft}
            setBatchDraft={setBatchDraft}
            copySourceDates={copySourceDates}
            effectiveCopySourceDate={effectiveCopySourceDate}
            copyTimeBlocks={copyTimeBlocks}
            batchDates={batchDates}
            batchInput={batchInput}
            batchPreview={batchPreview}
            batchFormError={batchFormError}
            batchIsSaving={batchIsSaving}
            inputClass={inputClass}
            today={getTodayDate()}
            formatSourceDate={(date) => `${formatShortDate(date)} · ${parseClinicDate(date).getUTCFullYear() + 543}`}
            closeBatchForm={closeBatchForm}
            saveBatchSlots={saveBatchSlots}
          />
        </ViewportPortal>
      )}


      {leaveFormOpen && (
        <ViewportPortal>
          <DoctorLeaveDialog
            role={role}
            currentDoctor={currentDoctor}
            editingLeaveId={editingLeaveId}
            leaveDraft={leaveDraft}
            setLeaveDraft={setLeaveDraft}
            doctors={doctors}
            today={getTodayDate()}
            inputClass={inputClass}
            draftLeaveOverlap={draftLeaveOverlap}
            affectedLeaveSlots={affectedLeaveSlots}
            formatShortDate={formatShortDate}
            leaveFormError={leaveFormError}
            leaveIsSaving={leaveIsSaving}
            leaveIsDeleting={leaveIsDeleting}
            closeLeaveForm={closeLeaveForm}
            cancelDoctorLeave={cancelDoctorLeave}
            saveDoctorLeave={saveDoctorLeave}
          />
        </ViewportPortal>
      )}


      {formOpen && (
        <ViewportPortal>
          <SlotEditorDialog
            role={role}
            currentDoctor={currentDoctor}
            editingSlotId={editingSlotId}
            draft={draft}
            setDraft={setDraft}
            doctors={doctors}
            departments={departments}
            activeServices={activeServices}
            slots={slots}
            visibleDoctorLeaves={visibleDoctorLeaves}
            today={getTodayDate()}
            inputClass={inputClass}
            getNextAvailableTimeSlot={getNextAvailableTimeSlot}
            addMinutesToTime={addMinutesToTime}
            formError={formError}
            isSaving={isSaving}
            closeSlotForm={() => setFormOpen(false)}
            saveSlot={saveSlot}
          />
        </ViewportPortal>
      )}


      {serviceFormOpen && (
        <ViewportPortal>
          <ServiceDialog
            editingServiceId={editingServiceId}
            serviceDraft={serviceDraft}
            setServiceDraft={setServiceDraft}
            serviceFormError={serviceFormError}
            serviceIsSaving={serviceIsSaving}
            inputClass={inputClass}
            closeServiceForm={() => setServiceFormOpen(false)}
            saveService={saveService}
          />
        </ViewportPortal>
      )}



      <section className="min-w-0" aria-label={text('ปฏิทินตารางตรวจ', 'Clinic schedule calendar')} aria-busy={isLoading}>
        {isLoading ? (
          <ScheduleSkeleton />
        ) : (
          <>
            <ScheduleCalendarToolbar
              calendarView={calendarView}
              setCalendarView={setCalendarView}
              weekStart={weekStart}
              setWeekStart={setWeekStart}
              availableSlotDates={availableSlotDates}
              jumpToToday={jumpToToday}
              effectiveDepartmentFilter={effectiveDepartmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              openDepartments={openDepartments}
              effectiveServiceFilter={effectiveServiceFilter}
              setServiceFilter={setServiceFilter}
              openServices={openServices}
              doctorFilter={doctorFilter}
              setDoctorFilter={setDoctorFilter}
              filteredDoctors={filteredDoctors}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              visibleSlots={visibleSlots}
              slots={slots}
              nearestSlotDate={nearestSlotDate}
              role={role}
              currentDoctor={currentDoctor}
              setNotice={setNotice}
            />        <ScheduleCalendar
          view={calendarView}
          weekDays={weekDays}
          displayDays={displayDays}
          weekStart={weekStart}
          visibleSlots={visibleSlots}
          doctors={doctors}
          departments={departments}
          services={services}
          role={role}
          canBook={canBook}
          visibleDoctorLeaves={visibleDoctorLeaves}
          canModifySlot={canModifySlot}
          canCreateForDate={canCreateForDate}
          openSlotForm={openSlotForm}
          toggleClosed={toggleClosed}
          handleDrillDownDay={handleDrillDownDay}
          openLeaveForm={openLeaveForm}
        />
          </>
        )}
      </section>

    </div>
  );
}
