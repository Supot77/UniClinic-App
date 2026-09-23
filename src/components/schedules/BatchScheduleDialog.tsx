import type { Dispatch, SetStateAction } from 'react';
import { Loader2, X } from 'lucide-react';
import DatePicker from '@/components/common/DatePicker';
import { CLINIC_TIME_BLOCKS } from '@/constants/dateTime';
import { buildSlotBatchPlan, type SlotBatchInput, type SlotBatchTimeBlock } from '@/features/scheduling/domain/rules';
import type { ScheduleDoctor, ScheduleService } from '@/types/schedule';
import type { UserRole } from '@/types/database';

const weekdayOptions = [
  { value: 1, label: 'จันทร์', shortLabel: 'จ.' },
  { value: 2, label: 'อังคาร', shortLabel: 'อ.' },
  { value: 3, label: 'พุธ', shortLabel: 'พ.' },
  { value: 4, label: 'พฤหัสบดี', shortLabel: 'พฤ.' },
  { value: 5, label: 'ศุกร์', shortLabel: 'ศ.' },
] as const;

export interface BatchScheduleDraft {
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

type Props = {
  role: UserRole;
  currentDoctor?: ScheduleDoctor;
  doctors: ScheduleDoctor[];
  activeServices: ScheduleService[];
  batchMode: 'range' | 'copy';
  batchDraft: BatchScheduleDraft;
  setBatchDraft: Dispatch<SetStateAction<BatchScheduleDraft>>;
  copySourceDates: string[];
  effectiveCopySourceDate: string;
  copyTimeBlocks: SlotBatchTimeBlock[];
  batchDates: string[];
  batchInput: SlotBatchInput | null;
  batchPreview: ReturnType<typeof buildSlotBatchPlan> | null;
  batchFormError: string;
  batchIsSaving: boolean;
  inputClass: string;
  today: string;
  formatSourceDate: (date: string) => string;
  closeBatchForm: () => void;
  saveBatchSlots: () => void;
};

export function BatchScheduleDialog(props: Props) {
  const {
    role, currentDoctor, doctors, activeServices, batchMode, batchDraft, setBatchDraft,
    copySourceDates, effectiveCopySourceDate, copyTimeBlocks, batchDates, batchInput,
    batchPreview, batchFormError, batchIsSaving, inputClass, today,
    formatSourceDate, closeBatchForm, saveBatchSlots,
  } = props;

  return (
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
                <h2 id="batch-slot-form-title" className="mt-1 text-xl font-bold text-slate-950">
                  {batchMode === 'copy' ? 'คัดลอกรอบจากวันทำการล่าสุด' : 'สร้างรอบตรวจหลายวัน'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  ระบบจะบันทึกเมื่อกดปุ่ม “สร้างรอบตรวจ” และไม่แก้ไขรอบเดิม
                </p>
              </div>
              <button type="button" onClick={closeBatchForm} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="ปิดแบบฟอร์มสร้างรอบหลายวัน">
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
                <span className="text-sm font-medium text-slate-700">บริการที่เปิดให้จอง</span>
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
                      minDate={today}
                      value={batchDraft.startDate}
                      onChange={(newDate) => setBatchDraft((current) => ({ ...current, startDate: newDate, endDate: current.endDate < newDate ? newDate : current.endDate }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <DatePicker
                      label="วันที่สิ้นสุด"
                      minDate={batchDraft.startDate || today}
                      value={batchDraft.endDate}
                      onChange={(newDate) => setBatchDraft((current) => ({ ...current, endDate: newDate }))}
                    />
                  </div>
                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm font-medium text-slate-700">วันที่เปิดรอบตรวจ</legend>
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
                    <span className="text-sm font-medium text-slate-700">ระยะเวลาต่อรอบ</span>
                    <select value={batchDraft.slotDurationMinutes} onChange={(event) => setBatchDraft((current) => ({ ...current, slotDurationMinutes: Number(event.target.value) as 30 | 60 }))} className={inputClass}>
                      <option value={30}>30 นาที</option>
                      <option value={60}>1 ชั่วโมง</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">จำนวนผู้ป่วยต่อรอบ</span>
                    <input type="number" min={1} step={1} value={batchDraft.maxCapacity} onChange={(event) => setBatchDraft((current) => ({ ...current, maxCapacity: Number(event.target.value) }))} className={inputClass} />
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">วันต้นทาง</span>
                    <select aria-label="วันต้นทาง" value={effectiveCopySourceDate} onChange={(event) => setBatchDraft((current) => ({ ...current, sourceDate: event.target.value }))} className={inputClass} disabled={!copySourceDates.length}>
                      {!copySourceDates.length && <option value="">ยังไม่มีวันก่อนหน้า</option>}
                      {copySourceDates.map((date) => <option key={date} value={date}>{formatSourceDate(date)}</option>)}
                    </select>
                  </label>
                  <div className="space-y-1.5">
                    <DatePicker
                      label="วันที่ต้องการสร้าง"
                      minDate={today}
                      value={batchDraft.targetDate}
                      onChange={(newDate) => setBatchDraft((current) => ({ ...current, targetDate: newDate }))}
                    />
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                     <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">รอบที่จะคัดลอก</p>
                    {copyTimeBlocks.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {copyTimeBlocks.map((block) => <span key={`${block.startTime}-${block.endTime}`} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200">{block.startTime}–{block.endTime} · {block.maxCapacity} คน</span>)}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">เลือกแพทย์ที่มีรอบตรวจในวันที่เลือก</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {batchInput && batchPreview?.ok && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status" aria-live="polite">
                <p className="font-semibold">ตัวอย่างที่จะสร้าง: {batchPreview.value.slots.length} รอบ ใน {batchDates.length - batchPreview.value.skippedLeaveDates.length} วัน</p>
                {batchPreview.value.skippedLeaveDates.length > 0 && <p className="mt-1 text-xs">ข้ามวันลา {batchPreview.value.skippedLeaveDates.length} วัน</p>}
                {batchPreview.value.skippedConflictCount > 0 && <p className="mt-1 text-xs">ข้ามรอบที่ซ้ำกับรายการเดิม {batchPreview.value.skippedConflictCount} รอบ</p>}
              </div>
            )}
            {batchInput && batchPreview && !batchPreview.ok && <p className="mt-4 text-sm font-medium text-rose-700" role="alert">{batchPreview.error}</p>}
            {!batchInput && <p className="mt-4 text-sm text-slate-500" role="status">เลือกแพทย์ บริการ และช่วงเวลา เพื่อดูตัวอย่างรอบตรวจ</p>}
            {batchFormError && <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{batchFormError}</p>}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={closeBatchForm} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">ยกเลิก</button>
              <button type="button" disabled={batchIsSaving || !batchPreview?.ok || batchPreview.value.slots.length === 0} aria-busy={batchIsSaving} onClick={saveBatchSlots} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-ink px-5 text-sm font-semibold text-white shadow-xs hover:bg-brand-hover disabled:opacity-50">
                {batchIsSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {batchIsSaving ? 'กำลังสร้าง…' : 'สร้างรอบตรวจ'}
              </button>
            </div>
          </div>
          </div>
  );
}
