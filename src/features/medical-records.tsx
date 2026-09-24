'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileHeart,
  HeartPulse,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  ClinicPageLoading,
  ClinicSelect,
  ClinicWorkspaceShell,
  inputClass,
  physicalExamSchema,
  primaryButtonClass,
  prescriptionSchema,
  recordUpdateInputSchema,
  secondaryButtonClass,
  type ClinicRepository,
  type ClinicSnapshot,
  type RecordInput,
  type RecordUpdateInput,
  useClinicWorkspace,
} from '@/features/clinic-care';

type Prescription = RecordInput['prescriptions'][number];
type PrescriptionDraft = Prescription & { meal: string; times: string };
type PhysicalExamDraft = { height_cm: string; weight_kg: string; blood_pressure: string; pulse_bpm: string };
const emptyPhysicalExam: PhysicalExamDraft = { height_cm: '', weight_kg: '', blood_pressure: '', pulse_bpm: '' };
const mealTimingOptions = ['ก่อนอาหาร', 'หลังอาหาร', 'พร้อมอาหาร', 'ไม่ขึ้นกับมื้ออาหาร'] as const;
const mealTimingSeparator = ' · ';

function joinPrescriptionFrequency(meal: string, times: string) {
  return [meal, times.trim()].filter(Boolean).join(mealTimingSeparator);
}

function splitPrescriptionFrequency(frequency: string) {
  const meal = mealTimingOptions.find((option) => frequency === option || frequency.startsWith(`${option}${mealTimingSeparator}`));
  if (!meal) return { meal: '', times: frequency };
  return { meal, times: frequency === meal ? '' : frequency.slice(`${meal}${mealTimingSeparator}`.length) };
}

function nullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

const recordSteps = [
  { id: 'physical', eyebrow: '01', title: 'การตรวจร่างกายเบื้องต้น', description: 'บันทึกข้อมูลจากการคัดกรอง' },
  { id: 'summary', eyebrow: '02', title: 'ผลวินิจฉัย', description: 'ระบุผลวินิจฉัยและคำแนะนำ' },
  { id: 'medications', eyebrow: '03', title: 'รายการยา', description: 'เพิ่มยาที่สั่งให้ผู้ป่วย' },
  { id: 'review', eyebrow: '04', title: 'ตรวจทาน', description: 'ตรวจสอบข้อมูลก่อนยืนยัน' },
] as const;

type PhysicalExamInput = Pick<RecordInput, 'height_cm' | 'weight_kg' | 'blood_pressure' | 'pulse_bpm'>;

function physicalExamInput(draft: PhysicalExamDraft): PhysicalExamInput {
  return {
    height_cm: nullableNumber(draft.height_cm),
    weight_kg: nullableNumber(draft.weight_kg),
    blood_pressure: draft.blood_pressure.trim() || null,
    pulse_bpm: nullableNumber(draft.pulse_bpm),
  };
}

function validatePhysicalExam(draft: PhysicalExamDraft) {
  const result = physicalExamSchema.safeParse(physicalExamInput(draft));
  return result.success ? '' : result.error.issues[0]?.message ?? 'กรุณาตรวจสอบข้อมูลการตรวจร่างกาย';
}

function prescriptionInput(item: PrescriptionDraft): Prescription {
  return {
    medication_id: item.medication_id,
    name: item.name,
    dosage: item.dosage,
    frequency: item.frequency,
    quantity: item.quantity,
    duration_days: item.duration_days,
  };
}

function validatePrescriptions(items: PrescriptionDraft[]) {
  const seen = new Set<string>();
  for (const item of items) {
    const result = prescriptionSchema.safeParse(prescriptionInput(item));
    if (!result.success) return result.error.issues[0]?.message ?? 'กรุณากรอกรายการยาให้ครบ';
    if (seen.has(item.medication_id)) return 'ไม่ควรเลือกยาซ้ำในรายการเดียวกัน';
    seen.add(item.medication_id);
  }
  return '';
}

function recordValidation(diagnosis: string, physicalExam: PhysicalExamDraft, items: PrescriptionDraft[]) {
  const physicalError = validatePhysicalExam(physicalExam);
  if (physicalError) return { step: 0, message: physicalError };
  if (!diagnosis.trim()) return { step: 1, message: 'กรุณากรอกผลวินิจฉัยก่อนดำเนินการต่อ' };
  if (diagnosis.trim().length > 5000) return { step: 1, message: 'ผลวินิจฉัยต้องไม่เกิน 5,000 ตัวอักษร' };
  const prescriptionError = validatePrescriptions(items);
  if (prescriptionError) return { step: 2, message: prescriptionError };
  return null;
}

export function MedicalRecordStepper({ data, busy, selectedId, save, showQueueSelector = true, onSaved }: {
  data: ClinicSnapshot;
  busy: boolean;
  selectedId?: string;
  save: (input: RecordInput) => Promise<boolean>;
  showQueueSelector?: boolean;
  onSaved?: () => void;
}) {
  const pending = data.appointments.filter((appointment) => appointment.status === 'in_progress' && !appointment.has_record);
  const [appointmentId, setAppointmentId] = useState(pending.find((appointment) => appointment.id === selectedId)?.id ?? pending[0]?.id ?? '');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [items, setItems] = useState<PrescriptionDraft[]>([]);
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamDraft>(emptyPhysicalExam);
  const [complete, setComplete] = useState(true);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const chosen = pending.find((appointment) => appointment.id === appointmentId);

  function update(index: number, patch: Partial<PrescriptionDraft>) {
    setItems((rows) => rows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      return { ...next, frequency: joinPrescriptionFrequency(next.meal, next.times) };
    }));
  }

  function updatePhysicalExam(field: keyof PhysicalExamDraft, value: string) {
    setPhysicalExam((current) => ({ ...current, [field]: value }));
  }

  function resetDraft() {
    setDiagnosis('');
    setAdvice('');
    setItems([]);
    setPhysicalExam(emptyPhysicalExam);
    setComplete(true);
    setStep(0);
    setStepError('');
  }

  if (!pending.length) return <div className="flex items-start gap-3 rounded-2xl border border-dashed border-brand-border-soft bg-brand-surface p-5 text-sm text-brand-body"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-strong shadow-sm"><ClipboardCheck className="h-4 w-4" aria-hidden="true" /></span><p>ไม่มีคิวที่รอบันทึกผลตรวจ เริ่มตรวจจากหน้านัดหมายก่อน</p></div>;

  function validateCurrentStep() {
    if (step === 0) return validatePhysicalExam(physicalExam);
    if (step === 1) return !diagnosis.trim() ? 'กรุณากรอกผลวินิจฉัยก่อนดำเนินการต่อ' : diagnosis.trim().length > 5000 ? 'ผลวินิจฉัยต้องไม่เกิน 5,000 ตัวอักษร' : '';
    if (step === 2) return validatePrescriptions(items);
    return '';
  }

  function goNext() {
    const error = validateCurrentStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError('');
    setStep((current) => Math.min(current + 1, recordSteps.length - 1));
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = recordValidation(diagnosis, physicalExam, items);
    if (validation) {
      setStep(validation.step);
      setStepError(validation.message);
      return;
    }
    if (!chosen) return;
    const saved = await save({
      appointmentId: chosen.id,
      diagnosis,
      advice,
      prescriptions: items.map(prescriptionInput),
      ...physicalExamInput(physicalExam),
      complete,
    });
    if (saved) {
      resetDraft();
      onSaved?.();
    }
  }

  const currentStep = recordSteps[step];
  const currentSectionTitle = step === 1 ? 'สรุปผลตรวจ' : currentStep.title;
  const physicalValue = (value: string, unit: string) => value.trim() ? `${value.trim()} ${unit}` : 'ไม่ได้ระบุ';

  return <form className="overflow-visible rounded-[1.75rem] border border-brand-border-soft bg-white shadow-[0_16px_42px_rgba(26,61,62,0.07)]" onSubmit={submitRecord}>
    <div className="relative overflow-hidden border-b border-brand-border-soft bg-[linear-gradient(115deg,#f1f9ff_0%,#f8fcfb_62%,#fff8e9_100%)] px-5 py-5 sm:px-7 sm:py-6">
      <div className="absolute -right-10 -top-20 h-44 w-44 rounded-full bg-sky-100/80 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-strong text-white shadow-lg shadow-brand-strong/20"><FileHeart className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-strong">บันทึกทางคลินิก</p><h2 className="mt-1 text-xl font-bold tracking-tight text-brand-ink">บันทึกผลตรวจทีละขั้นตอน</h2><p className="mt-1 text-sm text-brand-body">กรอกข้อมูลตามลำดับ แล้วตรวจทานก่อนบันทึกครั้งเดียว</p></div>
      </div>
      <div className="relative mt-4 flex items-start gap-2 text-xs leading-5 text-brand-body"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span>โปรดตรวจสอบข้อมูลให้เรียบร้อยก่อนยืนยัน หลังบันทึกแล้วจะแก้ไขได้ภายใน 15 นาที</span></div>
      <ol className="relative mt-6 grid gap-2 sm:grid-cols-4" aria-label="ขั้นตอนการบันทึกผลตรวจ">
        {recordSteps.map((item, index) => {
          const active = index === step;
          const completeStep = index < step;
          return <li key={item.id} className="min-w-0">
            <button type="button" disabled={busy || index > step} aria-current={active ? 'step' : undefined} onClick={() => { if (index <= step) { setStep(index); setStepError(''); } }} className={`flex min-h-12 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong disabled:cursor-default ${active ? 'bg-brand-strong text-white shadow-sm' : completeStep ? 'bg-white/80 text-brand-strong' : 'bg-white/50 text-brand-body'}`}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-white/20 text-white' : completeStep ? 'bg-brand-soft text-brand-strong' : 'bg-white text-brand-body'}`}>{completeStep ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}</span>
              <span className="min-w-0"><span className="block truncate font-bold">{item.title}</span><span className={`mt-0.5 block truncate text-[11px] ${active ? 'text-white/75' : 'text-brand-body'}`}>{item.description}</span></span>
            </button>
          </li>;
        })}
      </ol>
    </div>

    <fieldset disabled={busy} className="space-y-6 p-5 sm:p-7">
      {showQueueSelector ? <section className="rounded-2xl border border-brand-border-soft bg-brand-surface p-4 sm:p-5" aria-labelledby="record-queue-title">
        <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-brand-strong shadow-sm"><Stethoscope className="h-4 w-4" aria-hidden="true" /></span><div><h3 id="record-queue-title" className="font-bold text-brand-ink">คิวที่กำลังตรวจ</h3><p className="text-xs text-brand-body">เลือกผู้ป่วยที่กำลังอยู่ในขั้นตอนตรวจ</p></div></div>
        <ClinicSelect value={chosen?.id ?? ''} onChange={(value) => { setAppointmentId(value); resetDraft(); }} placeholder="เลือกคิว" ariaLabel="คิวที่กำลังตรวจ" options={pending.map((appointment) => ({ value: appointment.id, label: `คิว ${appointment.queue_number ?? '—'} · ${appointment.patient}` }))} />
        <p className="mt-3 border-t border-brand-border-soft/70 pt-3 text-xs leading-5 text-brand-body"><span className="font-medium text-brand-body">อาการหรือเหตุผลที่มาพบแพทย์:</span>{' '}<span className="whitespace-pre-wrap break-words">{chosen?.reason?.trim() || 'ไม่ได้ระบุ'}</span></p>
      </section> : <div className="flex items-start gap-3 rounded-2xl border border-brand-border-soft bg-brand-surface px-4 py-3 text-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-strong shadow-sm"><Stethoscope className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="font-bold text-brand-ink">{chosen?.patient ?? 'ผู้ป่วยที่เลือก'}</p><p className="mt-1 text-brand-body">อาการที่แจ้ง: {chosen?.reason || 'ไม่ได้ระบุ'}</p></div><span className="ml-auto shrink-0 rounded-full bg-status-info-bg px-2.5 py-1 text-xs font-bold text-status-info">กำลังตรวจ</span></div>}
      {stepError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{stepError}</p>}

      <section className="space-y-5" aria-labelledby="record-step-title">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">{currentStep.eyebrow}</p><h3 id="record-step-title" className="mt-1 text-xl font-bold tracking-tight text-brand-ink">{currentSectionTitle}</h3><p className="mt-1 text-sm text-brand-body">{currentStep.description}</p></div>

        {step === 0 && <section aria-labelledby="physical-exam-title" className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm"><HeartPulse className="h-5 w-5" aria-hidden="true" /></span><div><h4 id="physical-exam-title" className="font-bold text-brand-ink">บันทึกการตรวจร่างกายเบื้องต้น</h4><p className="mt-0.5 text-xs leading-5 text-brand-body">กรอกข้อมูลจากการคัดกรอง ช่องว่างสามารถข้ามได้</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm text-brand-ink" htmlFor="record-height"><span className="mb-1.5 block font-semibold">ส่วนสูง <span className="font-normal text-brand-body">(ซม.)</span></span><input id="record-height" type="number" min={30} max={250} step="0.1" inputMode="decimal" placeholder="เช่น 170" aria-label="ส่วนสูง (ซม.)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.height_cm} onChange={(event) => { setStepError(''); updatePhysicalExam('height_cm', event.target.value); }} /></label>
            <label className="block text-sm text-brand-ink" htmlFor="record-weight"><span className="mb-1.5 block font-semibold">น้ำหนัก <span className="font-normal text-brand-body">(กก.)</span></span><input id="record-weight" type="number" min={1} max={300} step="0.1" inputMode="decimal" placeholder="เช่น 65" aria-label="น้ำหนัก (กก.)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.weight_kg} onChange={(event) => { setStepError(''); updatePhysicalExam('weight_kg', event.target.value); }} /></label>
            <label className="block text-sm text-brand-ink" htmlFor="record-blood-pressure"><span className="mb-1.5 block font-semibold">ความดันโลหิต <span className="font-normal text-brand-body">(mmHg)</span></span><input id="record-blood-pressure" type="text" inputMode="numeric" pattern="[0-9]{2,3}/[0-9]{2,3}" placeholder="เช่น 120/80" aria-label="ความดันโลหิต (mmHg)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.blood_pressure} onChange={(event) => { setStepError(''); updatePhysicalExam('blood_pressure', event.target.value); }} /></label>
            <label className="block text-sm text-brand-ink" htmlFor="record-pulse"><span className="mb-1.5 block font-semibold">ชีพจร <span className="font-normal text-brand-body">(ครั้ง/นาที)</span></span><input id="record-pulse" type="number" min={20} max={250} step={1} inputMode="numeric" placeholder="เช่น 72" aria-label="ชีพจร (ครั้ง/นาที)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.pulse_bpm} onChange={(event) => { setStepError(''); updatePhysicalExam('pulse_bpm', event.target.value); }} /></label>
          </div>
        </section>}

        {step === 1 && <section className="space-y-4" aria-labelledby="diagnosis-title">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-brand-ink">ผลวินิจฉัย<textarea required maxLength={5000} rows={7} value={diagnosis} onChange={(event) => { setStepError(''); setDiagnosis(event.target.value); }} className={`${inputClass} mt-2 min-h-40 resize-y rounded-2xl border-brand-border-soft bg-brand-surface`} placeholder="บันทึกผลวินิจฉัยของผู้ป่วย" /></label>
            <label className="block text-sm font-semibold text-brand-ink">คำแนะนำการรักษา<textarea maxLength={5000} rows={7} value={advice} onChange={(event) => { setStepError(''); setAdvice(event.target.value); }} className={`${inputClass} mt-2 min-h-40 resize-y rounded-2xl border-brand-border-soft bg-brand-surface`} placeholder="คำแนะนำ การดูแลตัวเอง หรือการติดตามผล" /></label>
          </div>
          <p className="rounded-xl border border-brand-border-soft bg-brand-surface px-4 py-3 text-xs leading-5 text-brand-body">ผลวินิจฉัยจำเป็นต้องกรอก ส่วนคำแนะนำสามารถเว้นว่างได้</p>
        </section>}

        {step === 2 && <section className="space-y-4" aria-labelledby="prescription-title">
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><Pill className="h-5 w-5" aria-hidden="true" /></span><div><h4 id="prescription-title" className="font-bold text-brand-ink">รายการยาที่สั่ง</h4><p className="mt-0.5 text-xs leading-5 text-brand-body">หากไม่มีรายการยา ให้กด “ถัดไป” ได้</p></div></div>
            <div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-xs font-semibold text-brand-body">{items.length} รายการ</span><button type="button" disabled={!data.medications.length || items.length >= 50} className={`${secondaryButtonClass} min-h-11 rounded-xl bg-white`} onClick={() => { setStepError(''); setItems((rows) => [...rows, { medication_id: '', name: '', dosage: '', frequency: '', meal: '', times: '', quantity: 1, duration_days: 1 }]); }}><Plus className="h-4 w-4" aria-hidden="true" />เพิ่มรายการยา</button></div>
          </div>
          {items.length === 0 && <div className="rounded-2xl border border-dashed border-brand-border-soft bg-brand-surface px-4 py-4 text-sm leading-6 text-brand-body">ยังไม่มีรายการยา สามารถบันทึกผลตรวจโดยไม่สั่งยาได้</div>}
          <div className="space-y-3">{items.map((item, index) => <fieldset key={index} className="rounded-2xl border border-brand-border-soft bg-[#fbfdfc] p-4 sm:p-5">
            <legend className="sr-only">ยารายการที่ {index + 1}</legend>
            <div className="mb-3 flex items-start justify-between gap-3"><p className="pt-0 text-sm font-bold text-brand-ink">ยารายการที่ {index + 1}</p><button type="button" aria-label={`ลบยารายการที่ ${index + 1}`} title={`ลบยารายการที่ ${index + 1}`} className="-mt-3 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-status-critical transition hover:bg-status-critical-bg hover:text-status-critical focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-critical" onClick={() => { setStepError(''); setItems((rows) => rows.filter((_, rowIndex) => rowIndex !== index)); }}><X className="h-4 w-4" aria-hidden="true" /></button></div>
            <label className="block text-sm font-semibold text-brand-ink">ยา<ClinicSelect value={item.medication_id} onChange={(value) => { const medication = data.medications.find((entry) => entry.id === value); setStepError(''); update(index, { medication_id: medication?.id ?? '', name: medication?.name ?? '' }); }} placeholder="เลือกยา" ariaLabel={`ยารายการที่ ${index + 1}`} options={data.medications.map((medication) => ({ value: medication.id, label: `${medication.name} · ${medication.type}`, disabled: items.some((entry, rowIndex) => rowIndex !== index && entry.medication_id === medication.id) }))} /></label>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm font-medium text-brand-ink">ขนาดยาต่อครั้ง<input maxLength={500} placeholder="เช่น 500 mg, 1 เม็ด หรือ 5 ml" className={`${inputClass} mt-1.5 rounded-2xl border-brand-border-soft bg-white`} value={item.dosage} onChange={(event) => { setStepError(''); update(index, { dosage: event.target.value }); }} /></label>
              <label className="text-sm font-medium text-brand-ink">จำนวนที่สั่ง (หน่วยยา)<input type="number" min={1} max={100000} step={1} className={`${inputClass} mt-1.5 rounded-2xl border-brand-border-soft bg-white`} value={item.quantity} onChange={(event) => { setStepError(''); update(index, { quantity: Number(event.target.value) }); }} /></label>
              <label className="text-sm font-medium text-brand-ink">ระยะเวลา (วัน)<input type="number" min={1} max={365} step={1} className={`${inputClass} mt-1.5 rounded-2xl border-brand-border-soft bg-white`} value={item.duration_days} onChange={(event) => { setStepError(''); update(index, { duration_days: Number(event.target.value) }); }} /></label>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <label className="text-sm font-medium text-brand-ink md:col-span-3" htmlFor={`medication-times-${index}`}><span className="mb-1.5 block">วิธีใช้ / ความถี่ <span className="sr-only">รายการที่ {index + 1}</span></span><input id={`medication-times-${index}`} maxLength={400} placeholder="เช่น เช้า เที่ยง เย็น หรือก่อนนอน" className={`${inputClass} rounded-2xl border-brand-border-soft bg-white`} value={item.times} onChange={(event) => { setStepError(''); update(index, { times: event.target.value }); }} /></label>
              <div className="relative z-20 space-y-1.5 text-sm font-medium text-brand-ink md:col-span-2"><span className="block">การใช้ยากับอาหาร</span><ClinicSelect value={item.meal} onChange={(value) => { setStepError(''); update(index, { meal: value }); }} placeholder="เลือกมื้ออาหาร" ariaLabel={`การใช้ยากับอาหาร รายการที่ ${index + 1}`} menuPlacement="top" options={mealTimingOptions.map((meal) => ({ value: meal, label: meal }))} /></div>
            </div>
          </fieldset>)}</div>
        </section>}

        {step === 3 && <section className="space-y-5" aria-labelledby="review-title">
          <div className="rounded-2xl border border-brand-border-soft bg-brand-surface p-4 sm:p-5"><h4 id="review-title" className="font-bold text-brand-ink">ข้อมูลผู้ป่วย</h4><p className="mt-2 text-sm text-brand-body"><span className="font-semibold text-brand-ink">{chosen?.patient}</span> · อาการที่แจ้ง: {chosen?.reason || 'ไม่ได้ระบุ'}</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4" aria-labelledby="review-physical-title"><h4 id="review-physical-title" className="font-bold text-brand-ink">การตรวจร่างกายเบื้องต้น</h4><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-brand-body">ส่วนสูง</dt><dd className="mt-1 font-semibold text-brand-ink">{physicalValue(physicalExam.height_cm, 'ซม.')}</dd></div><div><dt className="text-brand-body">น้ำหนัก</dt><dd className="mt-1 font-semibold text-brand-ink">{physicalValue(physicalExam.weight_kg, 'กก.')}</dd></div><div><dt className="text-brand-body">ความดันโลหิต</dt><dd className="mt-1 font-semibold text-brand-ink">{physicalExam.blood_pressure.trim() || 'ไม่ได้ระบุ'}</dd></div><div><dt className="text-brand-body">ชีพจร</dt><dd className="mt-1 font-semibold text-brand-ink">{physicalValue(physicalExam.pulse_bpm, 'ครั้ง/นาที')}</dd></div></dl></section>
            <section className="rounded-2xl border border-brand-border-soft bg-white p-4" aria-labelledby="review-summary-title"><h4 id="review-summary-title" className="font-bold text-brand-ink">สรุปผลตรวจ</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-ink"><strong>ผลวินิจฉัย:</strong> {diagnosis || 'ไม่ได้ระบุ'}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-ink"><strong>คำแนะนำ:</strong> {advice || 'ไม่ได้ระบุ'}</p></section>
          </div>
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4" aria-labelledby="review-medications-title"><div className="flex items-center justify-between gap-3"><h4 id="review-medications-title" className="font-bold text-brand-ink">รายการยา</h4><span className="text-xs text-brand-body">{items.length} รายการ</span></div>{items.length ? <ul className="mt-3 space-y-2">{items.map((item, index) => <li key={index} className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm"><p className="font-semibold text-brand-ink">{item.name || 'ยังไม่ได้เลือกยา'} · {item.quantity} รายการ</p><p className="mt-1 text-brand-body">{item.dosage || 'ยังไม่ระบุขนาดยา'} · {item.frequency || 'ยังไม่ระบุวิธีใช้'} · {item.duration_days} วัน</p></li>)}</ul> : <p className="mt-2 text-sm text-brand-body">ไม่มีรายการยา</p>}<p className="mt-3 border-t border-emerald-100 pt-3 text-xs leading-5 text-brand-body">รายการนี้เป็นคำสั่งยา ไม่ใช่สถานะการจ่ายยา หากต้องการรับยา โปรดติดต่อจุดจ่ายยา</p></section>
          <label className="flex items-start gap-3 rounded-2xl border border-brand-border-soft bg-white p-4 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand-strong" checked={complete} onChange={(event) => setComplete(event.target.checked)} /><span><span className="block font-semibold text-brand-ink">จบการตรวจหลังบันทึก</span><span className="mt-1 block text-xs leading-5 text-brand-body">หากไม่เลือก ระบบจะบันทึกผลไว้เป็น “รอจบตรวจ” เพื่อให้เจ้าหน้าที่ดำเนินการต่อ</span></span></label>
        </section>}

      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-brand-border-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" disabled={busy || step === 0} className={`${secondaryButtonClass} rounded-xl`} onClick={() => { setStepError(''); setStep((current) => Math.max(current - 1, 0)); }}><ChevronLeft className="h-4 w-4" aria-hidden="true" />ย้อนกลับ</button>
        {step < recordSteps.length - 1 ? <button type="button" disabled={busy || !chosen} className={`${primaryButtonClass} rounded-xl`} onClick={goNext}>ถัดไป<ChevronRight className="h-4 w-4" aria-hidden="true" /></button> : <button type="submit" disabled={busy || !chosen} className={`${primaryButtonClass} min-h-12 rounded-2xl px-5`}>{busy ? 'กำลังบันทึก…' : complete ? 'ยืนยันบันทึกผลและจบการตรวจ' : 'ยืนยันบันทึกผลตรวจ'}<CheckCircle2 className="h-4 w-4" aria-hidden="true" /></button>}
      </div>
    </fieldset>
  </form>;
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')} นาที`;
}

function RecordEditForm({ record, data, busy, update, onCancel }: {
  record: ClinicSnapshot['records'][number];
  data: ClinicSnapshot;
  busy: boolean;
  update: (input: RecordUpdateInput) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [diagnosis, setDiagnosis] = useState(record.diagnosis ?? '');
  const [advice, setAdvice] = useState(record.treatment_notes ?? '');
  const [items, setItems] = useState<PrescriptionDraft[]>((record.prescribed_medications ?? []).map((item) => ({ ...item, ...splitPrescriptionFrequency(item.frequency) })));
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamDraft>({
    height_cm: record.height_cm === null ? '' : String(record.height_cm),
    weight_kg: record.weight_kg === null ? '' : String(record.weight_kg),
    blood_pressure: record.blood_pressure ?? '',
    pulse_bpm: record.pulse_bpm === null ? '' : String(record.pulse_bpm),
  });
  const [formError, setFormError] = useState('');

  function updateItem(index: number, patch: Partial<PrescriptionDraft>) {
    setItems((rows) => rows.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      return { ...next, frequency: joinPrescriptionFrequency(next.meal, next.times) };
    }));
  }

  function addItem() {
    const medication = data.medications.find((item) => !items.some((selected) => selected.medication_id === item.id));
    if (!medication) return;
    setItems((rows) => [...rows, { medication_id: medication.id, name: medication.name, dosage: '', frequency: '', duration_days: 1, quantity: 1, meal: '', times: '' }]);
  }

  function updatePhysical(field: keyof PhysicalExamDraft, value: string) {
    setPhysicalExam((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = recordUpdateInputSchema.safeParse({
      recordId: record.id,
      diagnosis,
      advice,
      prescriptions: items.map(prescriptionInput),
      ...physicalExamInput(physicalExam),
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'กรุณาตรวจสอบข้อมูลก่อนบันทึก');
      return;
    }
    setFormError('');
    if (await update(parsed.data)) onCancel();
  }

  return <form className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4" onSubmit={(event) => void submit(event)}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-bold text-brand-ink">แก้ไขผลตรวจ</h4><p className="mt-1 text-xs text-brand-body">การแก้ไขจะถูกตรวจสิทธิ์และเวลาอีกครั้งจากฐานข้อมูล</p></div><button type="button" className={`${secondaryButtonClass} min-h-9 rounded-lg px-3 text-xs`} onClick={onCancel}>ยกเลิก</button></div>
    <div className="grid gap-3 lg:grid-cols-2">
      <label className="text-sm font-medium text-brand-ink lg:col-span-2">ผลวินิจฉัย<textarea aria-label="ผลวินิจฉัยที่แก้ไข" className={`${inputClass} mt-1.5 min-h-24 rounded-xl`} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></label>
      <label className="text-sm font-medium text-brand-ink lg:col-span-2">คำแนะนำ<textarea aria-label="คำแนะนำที่แก้ไข" className={`${inputClass} mt-1.5 min-h-24 rounded-xl`} value={advice} onChange={(event) => setAdvice(event.target.value)} /></label>
      <label className="text-sm font-medium text-brand-ink">ส่วนสูง (ซม.)<input type="number" className={`${inputClass} mt-1.5`} value={physicalExam.height_cm} onChange={(event) => updatePhysical('height_cm', event.target.value)} /></label>
      <label className="text-sm font-medium text-brand-ink">น้ำหนัก (กก.)<input type="number" className={`${inputClass} mt-1.5`} value={physicalExam.weight_kg} onChange={(event) => updatePhysical('weight_kg', event.target.value)} /></label>
      <label className="text-sm font-medium text-brand-ink">ความดันโลหิต (mmHg)<input className={`${inputClass} mt-1.5`} value={physicalExam.blood_pressure} onChange={(event) => updatePhysical('blood_pressure', event.target.value)} /></label>
      <label className="text-sm font-medium text-brand-ink">ชีพจร (ครั้ง/นาที)<input type="number" className={`${inputClass} mt-1.5`} value={physicalExam.pulse_bpm} onChange={(event) => updatePhysical('pulse_bpm', event.target.value)} /></label>
    </div>
    <section className="space-y-3" aria-labelledby={`edit-medications-${record.id}`}><div className="flex items-center justify-between gap-2"><h5 id={`edit-medications-${record.id}`} className="font-bold text-brand-ink">รายการยา</h5><button type="button" className={`${secondaryButtonClass} min-h-9 rounded-lg px-3 text-xs`} onClick={addItem} disabled={busy || !data.medications.some((item) => !items.some((selected) => selected.medication_id === item.id))}><Plus className="h-3.5 w-3.5" aria-hidden="true" />เพิ่มยา</button></div>{items.map((item, index) => <fieldset key={`${item.medication_id}-${index}`} className="relative z-10 rounded-xl border border-amber-200 bg-white p-3"><legend className="sr-only">รายการยาที่ {index + 1}</legend><div className="mb-3 flex items-start justify-between gap-3"><p className="pt-0 text-xs font-bold text-brand-ink">ยารายการที่ {index + 1}</p><button type="button" aria-label={`ลบยารายการที่ ${index + 1}`} title={`ลบยารายการที่ ${index + 1}`} className="-mt-3 inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-status-critical transition hover:bg-status-critical-bg hover:text-status-critical focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-critical" onClick={() => setItems((rows) => rows.filter((_row, itemIndex) => itemIndex !== index))}><X className="h-4 w-4" aria-hidden="true" /></button></div><div className="grid gap-2 md:grid-cols-2"><label className="text-xs font-semibold text-brand-body md:col-span-2">ยา<select aria-label={`ยา รายการที่ ${index + 1}`} className={`${inputClass} mt-1`} value={item.medication_id} onChange={(event) => { const medication = data.medications.find((option) => option.id === event.target.value); updateItem(index, { medication_id: event.target.value, name: medication?.name ?? item.name }); }}><option value="">เลือกยา</option>{!data.medications.some((medication) => medication.id === item.medication_id) && <option value={item.medication_id}>{item.name}</option>}{data.medications.map((medication) => <option key={medication.id} value={medication.id}>{medication.name} · {medication.type}</option>)}</select></label><label className="text-xs font-semibold text-brand-body">ขนาดยา<input className={`${inputClass} mt-1`} value={item.dosage} onChange={(event) => updateItem(index, { dosage: event.target.value })} /></label><label className="text-xs font-semibold text-brand-body">วิธีใช้ / ความถี่<input className={`${inputClass} mt-1`} value={item.times} onChange={(event) => updateItem(index, { times: event.target.value })} /></label><div className="relative z-20 space-y-1.5 text-xs font-semibold text-brand-body"><span className="block">การใช้ยากับอาหาร</span><ClinicSelect value={item.meal} onChange={(value) => updateItem(index, { meal: value })} placeholder="เลือกมื้ออาหาร" ariaLabel={`การใช้ยากับอาหาร รายการที่ ${index + 1}`} menuPlacement="top" options={mealTimingOptions.map((meal) => ({ value: meal, label: meal }))} /></div><label className="text-xs font-semibold text-brand-body">จำนวน<input type="number" min={1} className={`${inputClass} mt-1`} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></label><label className="text-xs font-semibold text-brand-body">ระยะเวลา (วัน)<input type="number" min={1} className={`${inputClass} mt-1`} value={item.duration_days} onChange={(event) => updateItem(index, { duration_days: Number(event.target.value) })} /></label></div></fieldset>)}</section>
    {formError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
    <button type="submit" className={`${primaryButtonClass} rounded-xl`} disabled={busy}>บันทึกการแก้ไข</button>
  </form>;
}

function RecordList({ data, selectedId, update, busy = false }: { data: ClinicSnapshot; selectedId?: string; update?: (input: RecordUpdateInput) => Promise<boolean>; busy?: boolean }) {
  const [query, setQuery] = useState('');
  const [onlySelected, setOnlySelected] = useState(Boolean(selectedId));
  const [editingRecordId, setEditingRecordId] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const normalizedQuery = query.trim().toLowerCase();
  const selectedFilterActive = Boolean(selectedId && onlySelected);
  const records = data.records
    .filter((record) => {
      const matchesAppointment = !selectedFilterActive || record.appointment_id === selectedId;
      const searchableText = `${record.patient} ${record.doctor} ${record.diagnosis ?? ''}`.toLowerCase();
      return matchesAppointment && searchableText.includes(normalizedQuery);
    })
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  const emptyState = normalizedQuery
    ? { title: 'ไม่พบผลตรวจที่ตรงกับการค้นหา', description: 'ลองตรวจสอบคำค้นหา แล้วลองใหม่อีกครั้ง' }
    : selectedFilterActive
      ? { title: 'ไม่พบผลตรวจจากนัดนี้', description: 'เมื่อมีผลตรวจจากนัดนี้ รายการจะแสดงที่นี่' }
      : { title: 'ยังไม่มีผลตรวจ', description: 'เมื่อมีผลตรวจ รายการจะแสดงที่นี่' };
  const dateFormatter = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' });

  return <section className="space-y-4" aria-labelledby="record-history-title">
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><ClipboardCheck className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">ประวัติการรักษา</p><h2 id="record-history-title" className="mt-1 text-lg font-bold text-brand-ink">{data.actor.role === 'patient' ? 'ผลตรวจและรายการยาของฉัน' : 'ผลตรวจของผู้ป่วยในความดูแล'}</h2><p className="mt-1 text-xs text-brand-body">แสดงเฉพาะผลตรวจที่คุณมีสิทธิ์ดู</p></div></div><span className="rounded-full bg-brand-surface px-3 py-1.5 text-xs font-bold text-brand-strong">{records.length} รายการ</span></div>
    <div className="grid gap-3 rounded-2xl border border-brand-border-soft bg-brand-surface/55 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4"><label className="relative block text-sm"><span className="sr-only">ค้นหาผลตรวจ</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-body" aria-hidden="true" /><input aria-label="ค้นหาผลตรวจ" placeholder="ค้นหาชื่อผู้ป่วย แพทย์ หรือผลวินิจฉัย" className={`${inputClass} rounded-2xl border-brand-border-soft bg-white pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>{selectedId && <label className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-brand-body"><input type="checkbox" className="h-5 w-5 accent-brand-strong" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)} />แสดงเฉพาะผลตรวจจากนัดนี้</label>}</div>
    {!records.length && <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed border-brand-border-soft bg-white px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-strong"><Search className="h-6 w-6" aria-hidden="true" /></span><p className="mt-4 font-semibold text-brand-ink">{emptyState.title}</p><p className="mt-1 text-sm text-brand-body">{emptyState.description}</p></div>}
    <div className="space-y-4">{records.map((record) => {
      const statusClass = record.completed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200';
      const remainingMs = new Date(record.created_at).getTime() + 15 * 60 * 1000 - nowMs;
      const isOwner = data.actor.role === 'medical' && record.doctor_id === data.actor.id;
      const canEdit = isOwner && remainingMs > 0;
      return <article key={record.id} className="relative space-y-5 overflow-visible rounded-[1.5rem] border border-brand-border-soft bg-white p-5 shadow-[0_8px_24px_rgba(26,61,62,0.04)] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-strong via-emerald-400 to-amber-300" aria-hidden="true" />
        {isOwner && <div className="flex flex-wrap items-center justify-end gap-2"><span role="status" className={`rounded-full px-3 py-1 text-xs font-semibold ${canEdit ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{canEdit ? `แก้ไขได้อีก ${formatRemaining(remainingMs)}` : 'หมดเวลาแก้ไข'}</span><button type="button" className={`${secondaryButtonClass} min-h-9 rounded-lg px-3 text-xs`} disabled={!canEdit || busy || !update} onClick={() => setEditingRecordId((current) => current === record.id ? '' : record.id)}>{canEdit ? 'แก้ไขผลตรวจ' : 'แก้ไขไม่ได้'}</button></div>}
        {editingRecordId === record.id && canEdit && update && <RecordEditForm record={record} data={data} busy={busy} update={update} onCancel={() => setEditingRecordId('')} />}
        <div className="flex flex-col gap-4 border-b border-brand-border-soft pb-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-strong"><Stethoscope className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><h3 className="break-words font-bold text-brand-ink">{record.patient}</h3><p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-brand-body"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /><span>วันที่บันทึกผล:</span><time dateTime={record.created_at}>{dateFormatter.format(new Date(record.created_at))}</time></p></div></div><span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusClass}`}>{record.completed ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />}{record.completed ? 'จบตรวจแล้ว' : 'รอจบตรวจ'}</span></div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.72fr)]">
          <div className="rounded-2xl bg-brand-surface p-4"><p className="text-sm text-brand-body">แพทย์ผู้บันทึก: <span className="font-semibold text-brand-ink">{record.doctor}</span></p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-brand-ink"><strong>ผลวินิจฉัย:</strong> {record.diagnosis}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-brand-ink"><strong>คำแนะนำ:</strong> {record.treatment_notes || 'ไม่ได้ระบุ'}</p></div>
          <section className="space-y-3" aria-labelledby={`physical-exam-${record.id}`}><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-sky-600" aria-hidden="true" /><h4 id={`physical-exam-${record.id}`} className="font-bold text-brand-ink">การตรวจร่างกายเบื้องต้น</h4></div><dl className="grid gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-sm sm:grid-cols-2"><div><dt className="text-brand-body">ส่วนสูง</dt><dd className="mt-1 font-semibold text-brand-ink">{record.height_cm === null ? 'ไม่ได้ระบุ' : `${record.height_cm} ซม.`}</dd></div><div><dt className="text-brand-body">น้ำหนัก</dt><dd className="mt-1 font-semibold text-brand-ink">{record.weight_kg === null ? 'ไม่ได้ระบุ' : `${record.weight_kg} กก.`}</dd></div><div><dt className="text-brand-body">ความดันโลหิต</dt><dd className="mt-1 font-semibold text-brand-ink">{record.blood_pressure === null ? 'ไม่ได้ระบุ' : `${record.blood_pressure} mmHg`}</dd></div><div><dt className="text-brand-body">ชีพจร</dt><dd className="mt-1 font-semibold text-brand-ink">{record.pulse_bpm === null ? 'ไม่ได้ระบุ' : `${record.pulse_bpm} ครั้ง/นาที`}</dd></div></dl></section>
        </div>
        <section className="space-y-3" aria-labelledby={`prescribed-medications-${record.id}`}><div className="flex items-center gap-2"><Pill className="h-4 w-4 text-emerald-600" aria-hidden="true" /><h4 id={`prescribed-medications-${record.id}`} className="font-bold text-brand-ink">รายการยาที่สั่ง</h4></div>{!record.prescribed_medications?.length && <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-brand-body">ไม่มีรายการยา</p>}<ul className="space-y-2">{record.prescribed_medications?.map((medication) => <li key={medication.medication_id} className="rounded-2xl border border-brand-border-soft bg-[#fbfdfc] p-4 text-sm"><p className="break-words font-bold text-brand-ink">{medication.name} · จำนวนที่สั่ง {medication.quantity}</p><dl className="mt-2 space-y-1 break-words text-brand-body"><div><dt className="inline font-semibold text-brand-ink">ขนาดยาต่อครั้ง: </dt><dd className="inline">{medication.dosage}</dd></div><div><dt className="inline font-semibold text-brand-ink">วิธีใช้ / ความถี่: </dt><dd className="inline">{medication.frequency}</dd></div><div><dt className="inline font-semibold text-brand-ink">ระยะเวลา: </dt><dd className="inline">{medication.duration_days} วัน</dd></div></dl></li>)}</ul><p className="border-t border-brand-border-soft pt-3 text-xs leading-5 text-brand-body">รายการนี้เป็นคำสั่งยา ไม่ใช่สถานะการจ่ายยา หากต้องการรับยา โปรดติดต่อจุดจ่ายยา</p></section>
      </article>;
    })}</div>
  </section>;
}

function RecordsIntro({ role, records, pending }: { role: 'patient' | 'medical'; records: number; pending?: number }) {
  return <div className="flex flex-col justify-between gap-3 rounded-[1.5rem] border border-brand-border-soft bg-[linear-gradient(120deg,#f8fcfb_0%,#ffffff_68%,#fffaf0_100%)] p-5 sm:flex-row sm:items-end sm:p-6"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-strong">{role === 'medical' ? 'พื้นที่ทำงานแพทย์' : 'ข้อมูลของฉัน'}</p>{role === 'medical' ? <h2 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">บันทึกผลตรวจ</h2> : <p className="mt-1 text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">ดูผลตรวจและรายการยาของฉัน</p>}<p className="mt-1 max-w-2xl text-sm leading-6 text-brand-body">{role === 'medical' ? 'บันทึกผลตรวจ คำแนะนำ และรายการยาก่อนยืนยันผลตรวจ' : 'ดูผลตรวจ การตรวจร่างกาย และรายการยาของคุณในที่เดียว'}</p></div><div className="flex gap-2 text-xs font-semibold text-brand-body"><span className="rounded-full bg-white px-3 py-1.5 shadow-sm">{records} ประวัติ</span>{pending !== undefined && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">{pending} คิวรอบันทึก</span>}</div></div>;
}

export function PatientRecordsPage({ repository, selectedId }: { repository?: ClinicRepository; selectedId?: string }) {
  const state = useClinicWorkspace('patient', repository);
  return <ClinicWorkspaceShell {...state} role="patient" section="records" wide>{state.loading ? <ClinicPageLoading /> : state.data && <div className="space-y-5"><RecordsIntro role="patient" records={state.data.records.length} /><RecordList data={state.data} selectedId={selectedId} /></div>}</ClinicWorkspaceShell>;
}

export function MedicalRecordsPage({ repository, selectedId }: { repository?: ClinicRepository; selectedId?: string }) {
  const state = useClinicWorkspace('medical', repository);
  return <ClinicWorkspaceShell {...state} role="medical" section="records" wide>{state.loading ? <ClinicPageLoading /> : state.data && <div className="space-y-5"><RecordsIntro role="medical" records={state.data.records.length} pending={state.data.appointments.filter((appointment) => appointment.status === 'in_progress' && !appointment.has_record).length} /><MedicalRecordStepper data={state.data} busy={state.busy} selectedId={selectedId} save={(input) => state.run((repositoryInstance) => repositoryInstance.saveRecord(input), input.complete ? 'บันทึกผลและจบการตรวจแล้ว ผู้ป่วยเปิดดูได้' : 'บันทึกผลตรวจแล้ว กรุณาจบการตรวจเพื่อให้ผู้ป่วยเปิดดูผลได้')} /><RecordList data={state.data} selectedId={selectedId} busy={state.busy} update={(input) => state.run((repositoryInstance) => repositoryInstance.updateRecord(input), 'แก้ไขผลตรวจแล้ว')} /></div>}</ClinicWorkspaceShell>;
}
