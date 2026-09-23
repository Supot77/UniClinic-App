import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Loader2, Trash2, Users, X } from 'lucide-react';
import DatePicker from '@/components/common/DatePicker';
import { LEAVE_REASONS } from '@/constants/dateTime';
import type { DoctorLeave, ScheduleDoctor, ScheduleSlot } from '@/types/schedule';
import type { UserRole } from '@/types/database';

export interface DoctorLeaveDraft {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

type Props = {
  role: UserRole;
  currentDoctor?: ScheduleDoctor;
  editingLeaveId: string | null;
  leaveDraft: DoctorLeaveDraft;
  setLeaveDraft: Dispatch<SetStateAction<DoctorLeaveDraft>>;
  doctors: ScheduleDoctor[];
  today: string;
  inputClass: string;
  draftLeaveOverlap: DoctorLeave | undefined;
  affectedLeaveSlots: ScheduleSlot[];
  formatShortDate: (date: string) => string;
  leaveFormError: string;
  leaveIsSaving: boolean;
  leaveIsDeleting: boolean;
  closeLeaveForm: () => void;
  cancelDoctorLeave: () => void;
  saveDoctorLeave: () => void;
};

export function DoctorLeaveDialog(props: Props) {
  const {
    role, currentDoctor, editingLeaveId, leaveDraft, setLeaveDraft, doctors, today,
    inputClass, draftLeaveOverlap, affectedLeaveSlots, formatShortDate, leaveFormError,
    leaveIsSaving, leaveIsDeleting, closeLeaveForm, cancelDoctorLeave, saveDoctorLeave,
  } = props;

  return (
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
                <p className="mt-1 text-xs text-slate-500">รอบตรวจเดิมจะยังคงอยู่ เจ้าหน้าที่ต้องประสานผู้ป่วยด้วยตนเอง</p>
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
                  minDate={today}
                  value={leaveDraft.startDate}
                  onChange={(newDate) => setLeaveDraft((current) => ({ ...current, startDate: newDate, endDate: current.endDate < newDate ? newDate : current.endDate }))}
                />
              </div>
              <div className="space-y-1.5">
                <DatePicker
                  label="วันที่สิ้นสุด"
                  minDate={leaveDraft.startDate || today}
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
                      {draftLeaveOverlap ? 'ช่วงวันลาซ้ำกับรายการเดิม' : `มีรอบตรวจเดิมค้างอยู่ ${affectedLeaveSlots.length} รอบในช่วงวันดังกล่าว`}
                    </p>
                    {!draftLeaveOverlap && affectedLeaveSlots.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs">
                        {affectedLeaveSlots.slice(0, 5).map((slot) => <li key={slot.id}>{formatShortDate(slot.slotDate)} · {slot.startTime}–{slot.endTime}</li>)}
                        {affectedLeaveSlots.length > 5 && <li>และอีก {affectedLeaveSlots.length - 5} รอบ</li>}
                      </ul>
                    )}
                    {!draftLeaveOverlap && affectedLeaveSlots.length === 0 && <p className="mt-1 text-xs">ไม่พบรอบตรวจเดิม ระบบจะไม่เปลี่ยนแปลงรอบใด</p>}
                  </div>
                </div>
              </div>
            )}

            {leaveFormError && <p className="mt-3 text-sm font-medium text-rose-700" role="alert">{leaveFormError}</p>}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              {editingLeaveId && (
                <button type="button" disabled={leaveIsSaving || leaveIsDeleting} aria-busy={leaveIsDeleting} onClick={cancelDoctorLeave} className="mr-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  {leaveIsDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {!leaveIsDeleting && <Trash2 className="h-4 w-4" aria-hidden="true" />}
                  {leaveIsDeleting ? 'กำลังยกเลิก…' : 'ยกเลิกวันลา'}
                </button>
              )}
              <button type="button" onClick={closeLeaveForm} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">ปิด</button>
              <button type="button" disabled={leaveIsSaving || leaveIsDeleting || Boolean(draftLeaveOverlap)} aria-busy={leaveIsSaving} onClick={saveDoctorLeave} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-800 px-5 text-sm font-semibold text-white shadow-xs hover:bg-violet-900 disabled:opacity-50">
                {leaveIsSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {leaveIsSaving ? 'กำลังบันทึก…' : editingLeaveId ? 'บันทึกการแก้ไข' : 'บันทึกวันลา'}
              </button>
            </div>
          </div>
          </div>
  );
}
