import type { Dispatch, SetStateAction } from 'react';
import { CalendarDays, Loader2, Users, X } from 'lucide-react';
import DatePicker from '@/components/common/DatePicker';
import {
  getClinicEndTimeOptions,
  getCreatableClinicStartTimeOptions,
  getEarliestCreatableClinicStartTime,
  isDoctorOnLeave,
} from '@/features/scheduling/domain/rules';
import type { DoctorLeave, ScheduleDepartment, ScheduleDoctor, ScheduleService, ScheduleSlot } from '@/types/schedule';
import type { UserRole } from '@/types/database';
import { RestrictedTimeSelect } from './RestrictedTimeSelect';

export interface SlotDraft {
  doctorId: string;
  serviceId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
}

type Props = {
  role: UserRole;
  currentDoctor?: ScheduleDoctor;
  editingSlotId: string | null;
  draft: SlotDraft;
  setDraft: Dispatch<SetStateAction<SlotDraft>>;
  doctors: ScheduleDoctor[];
  departments: ScheduleDepartment[];
  activeServices: ScheduleService[];
  slots: ScheduleSlot[];
  visibleDoctorLeaves: DoctorLeave[];
  today: string;
  currentDate: string;
  currentTime: string;
  inputClass: string;
  getNextAvailableTimeSlot: (slots: ScheduleSlot[], doctorId: string, date: string, currentDate?: string, currentTime?: string) => { startTime: string; endTime: string };
  addMinutesToTime: (time: string, minutes?: number) => string;
  formError: string;
  isSaving: boolean;
  closeSlotForm: () => void;
  saveSlot: () => void;
};

export function SlotEditorDialog(props: Props) {
  const {
    role, currentDoctor, editingSlotId, draft, setDraft, doctors, departments,
    activeServices, slots, visibleDoctorLeaves, today, inputClass,
    currentDate, currentTime, getNextAvailableTimeSlot, addMinutesToTime, formError, isSaving,
    closeSlotForm, saveSlot,
  } = props;

  const earliestCreatableStartTime = editingSlotId
    ? '08:30'
    : getEarliestCreatableClinicStartTime(draft.slotDate, currentDate, currentTime);
  const canCreateAtSelectedDate = Boolean(editingSlotId || earliestCreatableStartTime);
  const startTimeMin = earliestCreatableStartTime ?? '16:30';
  const startTimeOptions = editingSlotId || !earliestCreatableStartTime
    ? []
    : getCreatableClinicStartTimeOptions(earliestCreatableStartTime);
  const endTimeOptions = editingSlotId ? [] : getClinicEndTimeOptions(draft.startTime);
  const getSuggestedEndTime = (startTime: string) => {
    const nextEndTime = addMinutesToTime(startTime, 30);
    if (startTime >= '12:00' && startTime < '13:00') return '13:30';
    if (startTime < '12:00' && nextEndTime > '12:00') return '12:00';
    return nextEndTime;
  };
  const suggestedEndTime = getSuggestedEndTime(draft.startTime);

  return (
    <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-form-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeSlotForm();
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
                  กำหนดช่วงเวลาตรวจและจำนวนผู้ป่วยต่อรอบเพื่อเปิดรับนัดหมาย
                </p>
              </div>
              <button
                type="button"
                onClick={closeSlotForm}
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
                          ? getNextAvailableTimeSlot(slots, newDoctorId, current.slotDate, currentDate, currentTime)
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
                <span className="text-sm font-medium text-slate-700">บริการที่เปิดให้จอง</span>
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
                {!activeServices.length && <span className="text-xs text-rose-600">ยังไม่มีบริการที่เปิดให้จอง เพิ่มบริการก่อนสร้างรอบตรวจ</span>}
              </label>
              <div className="space-y-1.5 sm:col-span-2">
                <DatePicker
                  label="วันที่"
                  minDate={editingSlotId ? undefined : today}
                  value={draft.slotDate}
                  onChange={(newDate) => {
                    setDraft((current) => {
                        const nextTimes = !editingSlotId && current.doctorId && newDate
                          ? getNextAvailableTimeSlot(slots, current.doctorId, newDate, currentDate, currentTime)
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
                {editingSlotId ? (
                  <input
                    type="time"
                    value={draft.startTime}
                    min={startTimeMin}
                    max="16:30"
                    onChange={(event) => {
                      const newStartTime = event.target.value;
                      setDraft((current) => ({ ...current, startTime: newStartTime, endTime: getSuggestedEndTime(newStartTime) }));
                    }}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
                  />
                ) : (
                  <RestrictedTimeSelect
                    aria-label="เวลาเริ่ม"
                    value={draft.startTime}
                    options={startTimeOptions}
                    disabled={!canCreateAtSelectedDate}
                    onChange={(newStartTime) => setDraft((current) => {
                      const nextEndOptions = getClinicEndTimeOptions(newStartTime);
                      const suggestedEndTime = getSuggestedEndTime(newStartTime);
                      return {
                        ...current,
                        startTime: newStartTime,
                        endTime: nextEndOptions.includes(suggestedEndTime) ? suggestedEndTime : nextEndOptions[0] ?? '',
                      };
                    })}
                    className={inputClass}
                  />
                )}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">เวลาสิ้นสุด</span>
                {editingSlotId ? (
                  <input
                    type="time"
                    value={draft.endTime}
                    min={suggestedEndTime}
                    max="16:30"
                    onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
                  />
                ) : (
                  <RestrictedTimeSelect
                    aria-label="เวลาสิ้นสุด"
                    value={draft.endTime}
                    options={endTimeOptions}
                    disabled={!canCreateAtSelectedDate}
                    onChange={(newEndTime) => setDraft((current) => ({ ...current, endTime: newEndTime }))}
                    className={inputClass}
                  />
                )}
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">จำนวนผู้ป่วยต่อรอบ</span>
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
                 จำนวนผู้จองจะปรับอัตโนมัติตามการจองหรือยกเลิกคิวของผู้ป่วย และแก้ไขโดยตรงไม่ได้
              </div>
            )}

            {!editingSlotId && isDoctorOnLeave(visibleDoctorLeaves, draft.doctorId, draft.slotDate) && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 ring-1 ring-violet-200" role="alert">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                 แพทย์มีวันลาในวันที่เลือก จึงเพิ่มรอบตรวจไม่ได้
              </div>
            )}

            {!editingSlotId && canCreateAtSelectedDate && (
              <p className="mt-4 text-xs text-slate-500" role="status">
                วันที่เลือกสร้างรอบได้ตั้งแต่ {earliestCreatableStartTime} น. และต้องอยู่ในเวลาทำการ 08:30–16:30 น. (พัก 12:00–13:00 น.)
              </p>
            )}
            {!editingSlotId && !canCreateAtSelectedDate && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200" role="alert">
                วันนี้หมดเวลาสร้างรอบตรวจแล้ว เลือกวันถัดไปเพื่อสร้างรอบใหม่
              </p>
            )}

            {formError && (
              <p className="mt-3 text-sm font-medium text-rose-700" role="alert">
                {formError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeSlotForm}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSaving || (!editingSlotId && (!canCreateAtSelectedDate || !startTimeOptions.includes(draft.startTime) || !endTimeOptions.includes(draft.endTime) || isDoctorOnLeave(visibleDoctorLeaves, draft.doctorId, draft.slotDate)))}
                aria-busy={isSaving}
                onClick={saveSlot}
                className="min-h-11 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-white hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50 shadow-xs inline-flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />}
                {isSaving ? 'กำลังบันทึก…' : 'บันทึกรอบตรวจ'}
              </button>
            </div>
          </div>
          </div>
  );
}
