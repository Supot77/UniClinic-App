'use client';

import { useState } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
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
  primaryButtonClass,
  secondaryButtonClass,
  type ClinicRepository,
  type ClinicSnapshot,
  type RecordInput,
  useClinicWorkspace,
} from '@/features/clinic-care';

type Prescription = RecordInput['prescriptions'][number];
type PrescriptionDraft = Prescription & { meal: string; times: string };
type PhysicalExamDraft = { height_cm: string; weight_kg: string; blood_pressure: string; pulse_bpm: string };
const emptyPhysicalExam: PhysicalExamDraft = { height_cm: '', weight_kg: '', blood_pressure: '', pulse_bpm: '' };

function nullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function RecordEditor({ data, busy, selectedId, save }: {
  data: ClinicSnapshot;
  busy: boolean;
  selectedId?: string;
  save: (input: RecordInput) => Promise<boolean>;
}) {
  const pending = data.appointments.filter((appointment) => appointment.status === 'in_progress' && !appointment.has_record);
  const [appointmentId, setAppointmentId] = useState(pending.find((appointment) => appointment.id === selectedId)?.id ?? pending[0]?.id ?? '');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [items, setItems] = useState<PrescriptionDraft[]>([]);
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamDraft>(emptyPhysicalExam);
  const [complete, setComplete] = useState(true);
  const chosen = pending.find((appointment) => appointment.id === appointmentId);

  function update(index: number, patch: Partial<PrescriptionDraft>) {
    setItems((rows) => rows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, ...patch };
      return { ...next, frequency: [next.meal, next.times.trim()].filter(Boolean).join(' · ') };
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
  }

  if (!pending.length) return <div className="flex items-start gap-3 rounded-2xl border border-dashed border-brand-border-soft bg-brand-surface p-5 text-sm text-brand-body"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand-strong shadow-sm"><ClipboardCheck className="h-4 w-4" aria-hidden="true" /></span><p>ไม่มีคิวที่รอบันทึกผลตรวจ เริ่มตรวจจากหน้านัดหมายก่อน</p></div>;

  return <form className="overflow-hidden rounded-[1.75rem] border border-brand-border-soft bg-white shadow-[0_16px_42px_rgba(26,61,62,0.07)]" onSubmit={async (event) => {
    event.preventDefault();
    if (chosen && await save({
      appointmentId: chosen.id,
      diagnosis,
      advice,
      prescriptions: items.map((item) => ({ medication_id: item.medication_id, name: item.name, dosage: item.dosage, frequency: item.frequency, quantity: item.quantity, duration_days: item.duration_days })),
      height_cm: nullableNumber(physicalExam.height_cm),
      weight_kg: nullableNumber(physicalExam.weight_kg),
      blood_pressure: physicalExam.blood_pressure.trim() || null,
      pulse_bpm: nullableNumber(physicalExam.pulse_bpm),
      complete,
    })) resetDraft();
  }}>
    <div className="relative overflow-hidden border-b border-brand-border-soft bg-[linear-gradient(115deg,#f1f9ff_0%,#f8fcfb_62%,#fff8e9_100%)] px-5 py-5 sm:px-7 sm:py-6">
      <div className="absolute -right-10 -top-20 h-44 w-44 rounded-full bg-sky-100/80 blur-3xl" aria-hidden="true" />
      <div className="relative flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-strong text-white shadow-lg shadow-brand-strong/20"><FileHeart className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-strong">CLINICAL NOTE</p><h2 className="mt-1 text-xl font-bold tracking-tight text-brand-ink">บันทึกผลตรวจและรายการยา</h2><p className="mt-1 text-sm text-brand-body">บันทึกครั้งเดียว ส่งต่อให้ผู้ป่วยและจุดจ่ายยาตามสิทธิ์</p></div>
      </div>
      <div className="relative mt-4 flex items-start gap-2 text-xs leading-5 text-brand-body"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span>ตรวจทานข้อมูลก่อนยืนยัน เพราะผลตรวจและใบสั่งยาแก้ไขไม่ได้หลังบันทึก</span></div>
    </div>

    <fieldset disabled={busy} className="space-y-6 p-5 sm:p-7">
      <section className="rounded-2xl border border-brand-border-soft bg-brand-surface p-4 sm:p-5" aria-labelledby="record-queue-title">
        <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-brand-strong shadow-sm"><Stethoscope className="h-4 w-4" aria-hidden="true" /></span><div><h3 id="record-queue-title" className="font-bold text-brand-ink">คิวที่กำลังตรวจ</h3><p className="text-xs text-brand-body">เลือกผู้ป่วยที่กำลังอยู่ในขั้นตอนตรวจ</p></div></div>
        <ClinicSelect value={chosen?.id ?? ''} onChange={(value) => { setAppointmentId(value); resetDraft(); }} placeholder="เลือกคิว" ariaLabel="คิวที่กำลังตรวจ" options={pending.map((appointment) => ({ value: appointment.id, label: `คิว ${appointment.queue_number ?? '—'} · ${appointment.patient}` }))} />
        {chosen && <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-brand-body"><ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" /><span>อาการที่แจ้ง: {chosen.reason || 'ไม่ได้ระบุ'}</span></div>}
      </section>

      <section className="space-y-4" aria-labelledby="diagnosis-title">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">01 / CLINICAL SUMMARY</p><h3 id="diagnosis-title" className="mt-1 text-lg font-bold text-brand-ink">สรุปการตรวจ</h3></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-brand-ink">ผลวินิจฉัย<textarea required maxLength={5000} rows={5} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} className={`${inputClass} mt-2 min-h-32 resize-y rounded-2xl border-brand-border-soft bg-brand-surface`} placeholder="บันทึกผลวินิจฉัยของผู้ป่วย" /></label>
          <label className="block text-sm font-semibold text-brand-ink">คำแนะนำการรักษา<textarea maxLength={5000} rows={5} value={advice} onChange={(event) => setAdvice(event.target.value)} className={`${inputClass} mt-2 min-h-32 resize-y rounded-2xl border-brand-border-soft bg-brand-surface`} placeholder="คำแนะนำ การดูแลตัวเอง หรือการติดตามผล" /></label>
        </div>
      </section>

      <section aria-labelledby="physical-exam-title" className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
        <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm"><HeartPulse className="h-5 w-5" aria-hidden="true" /></span><div><h3 id="physical-exam-title" className="font-bold text-brand-ink">การตรวจร่างกายเบื้องต้น</h3><p className="mt-0.5 text-xs text-brand-body">กรอกเมื่อมีข้อมูลจากการคัดกรอง ผู้ป่วยจะเห็นพร้อมผลตรวจ</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm text-brand-ink" htmlFor="record-height"><span className="mb-1.5 block font-semibold">ส่วนสูง <span className="font-normal text-brand-body">(ซม.)</span></span><input id="record-height" type="number" min={30} max={250} step="0.1" inputMode="decimal" placeholder="เช่น 170" aria-label="ส่วนสูง (ซม.)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.height_cm} onChange={(event) => updatePhysicalExam('height_cm', event.target.value)} /></label>
          <label className="block text-sm text-brand-ink" htmlFor="record-weight"><span className="mb-1.5 block font-semibold">น้ำหนัก <span className="font-normal text-brand-body">(กก.)</span></span><input id="record-weight" type="number" min={1} max={300} step="0.1" inputMode="decimal" placeholder="เช่น 65" aria-label="น้ำหนัก (กก.)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.weight_kg} onChange={(event) => updatePhysicalExam('weight_kg', event.target.value)} /></label>
          <label className="block text-sm text-brand-ink" htmlFor="record-blood-pressure"><span className="mb-1.5 block font-semibold">ความดันโลหิต <span className="font-normal text-brand-body">(mmHg)</span></span><input id="record-blood-pressure" type="text" inputMode="numeric" pattern="[0-9]{2,3}/[0-9]{2,3}" placeholder="เช่น 120/80" aria-label="ความดันโลหิต (mmHg)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.blood_pressure} onChange={(event) => updatePhysicalExam('blood_pressure', event.target.value)} /></label>
          <label className="block text-sm text-brand-ink" htmlFor="record-pulse"><span className="mb-1.5 block font-semibold">ชีพจร <span className="font-normal text-brand-body">(ครั้ง/นาที)</span></span><input id="record-pulse" type="number" min={20} max={250} step={1} inputMode="numeric" placeholder="เช่น 72" aria-label="ชีพจร (ครั้ง/นาที)" className={`${inputClass} rounded-2xl border-sky-100 bg-white`} value={physicalExam.pulse_bpm} onChange={(event) => updatePhysicalExam('pulse_bpm', event.target.value)} /></label>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="prescription-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Pill className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">02 / PRESCRIPTION</p><h3 id="prescription-title" className="mt-1 text-lg font-bold text-brand-ink">รายการยา</h3></div></div><span className="text-xs text-brand-body">{items.length} รายการ</span></div>
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-brand-border-soft bg-brand-surface px-4 py-4 text-sm text-brand-body">ไม่มีรายการยา สามารถบันทึกผลตรวจโดยไม่สั่งยาได้</div>}
        <div className="space-y-3">{items.map((item, index) => <fieldset key={index} className="relative rounded-2xl border border-brand-border-soft bg-[#fbfdfc] p-4 pt-5 sm:p-5">
          <legend className="max-w-[calc(100%-2.5rem)] px-2 text-sm font-bold text-brand-ink">ยารายการที่ {index + 1}</legend>
          <button type="button" aria-label={`ลบยารายการที่ ${index + 1}`} title={`ลบยารายการที่ ${index + 1}`} className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-status-critical transition hover:bg-status-critical-bg hover:text-status-critical focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-status-critical" onClick={() => setItems((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}><X className="h-4 w-4" aria-hidden="true" /></button>
          <label className="block text-sm font-semibold text-brand-ink">ยา<ClinicSelect value={item.medication_id} onChange={(value) => { const medication = data.medications.find((entry) => entry.id === value); update(index, { medication_id: medication?.id ?? '', name: medication?.name ?? '' }); }} placeholder="เลือกยาจากคลัง" ariaLabel={`ยารายการที่ ${index + 1}`} options={data.medications.map((medication) => ({ value: medication.id, label: `${medication.name} · ${medication.type}`, disabled: items.some((entry, rowIndex) => rowIndex !== index && entry.medication_id === medication.id) }))} /></label>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium text-brand-ink">จำนวนที่สั่ง<input type="number" required min={1} max={100000} step={1} className={`${inputClass} mt-1.5 rounded-2xl border-brand-border-soft bg-white`} value={item.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} /></label>
            <label className="text-sm font-medium text-brand-ink">ระยะเวลา (วัน)<input type="number" required min={1} max={365} step={1} className={`${inputClass} mt-1.5 rounded-2xl border-brand-border-soft bg-white`} value={item.duration_days} onChange={(event) => update(index, { duration_days: Number(event.target.value) })} /></label>
            <label className="text-sm font-medium text-brand-ink">ขนาดยาต่อครั้ง (ระบุหน่วย)<input required maxLength={500} placeholder="เช่น 500 mg, 1 เม็ด หรือ 5 ml" className={`${inputClass} mt-1.5 rounded-2xl border-brand-border-soft bg-white`} value={item.dosage} onChange={(event) => update(index, { dosage: event.target.value })} /></label>
            <label className="text-sm font-medium text-brand-ink" htmlFor={`medication-times-${index}`}><span className="mb-1.5 block">ช่วงเวลาและความถี่ในการใช้ยา <span className="sr-only">รายการที่ {index + 1}</span></span><input id={`medication-times-${index}`} required maxLength={400} placeholder="เช่น เช้า เที่ยง เย็น หรือก่อนนอน" className={`${inputClass} rounded-2xl border-brand-border-soft bg-white`} value={item.times} onChange={(event) => update(index, { times: event.target.value })} /></label>
            <div className="space-y-1.5 text-sm font-medium text-brand-ink xl:col-start-1"><span className="block">การใช้ยากับอาหาร</span><ClinicSelect value={item.meal} onChange={(value) => update(index, { meal: value })} placeholder="เลือกมื้ออาหาร" ariaLabel={`การใช้ยากับอาหาร รายการที่ ${index + 1}`} options={['ก่อนอาหาร', 'หลังอาหาร', 'พร้อมอาหาร', 'ไม่ขึ้นกับมื้ออาหาร'].map((meal) => ({ value: meal, label: meal }))} /></div>
          </div>
        </fieldset>)}</div>
        <button type="button" disabled={!data.medications.length || items.length >= 50} className={`${secondaryButtonClass} rounded-xl`} onClick={() => setItems((rows) => [...rows, { medication_id: '', name: '', dosage: '', frequency: '', meal: '', times: '', quantity: 1, duration_days: 1 }])}><Plus className="h-4 w-4" aria-hidden="true" />เพิ่มรายการยา</button>
      </section>

      <div className="flex flex-col gap-4 border-t border-brand-border-soft pt-5 sm:flex-row sm:items-center sm:justify-between"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-ink"><input type="checkbox" checked={complete} onChange={(event) => setComplete(event.target.checked)} />จบตรวจพร้อมบันทึกผล</label><button disabled={!chosen || !diagnosis.trim()} className={`${primaryButtonClass} min-h-12 rounded-2xl px-5`}>{busy ? 'กำลังบันทึก…' : complete ? 'ยืนยันบันทึกผลและจบตรวจ' : 'ยืนยันบันทึกผลตรวจ'}</button></div>
    </fieldset>
  </form>;
}

function RecordList({ data, selectedId }: { data: ClinicSnapshot; selectedId?: string }) {
  const [query, setQuery] = useState('');
  const [onlySelected, setOnlySelected] = useState(Boolean(selectedId));
  const records = data.records.filter((record) => (!onlySelected || record.appointment_id === selectedId) && `${record.patient} ${record.doctor} ${record.diagnosis ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  return <section className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><ClipboardCheck className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-strong">ประวัติการรักษา</p><h2 className="mt-1 text-lg font-bold text-brand-ink">{data.actor.role === 'patient' ? 'ประวัติผลตรวจของฉัน' : 'ผลตรวจและประวัติผู้ป่วยที่รับผิดชอบ'}</h2><p className="mt-1 text-xs text-brand-body">แสดงเฉพาะข้อมูลที่เปิดดูได้</p></div></div><span className="rounded-full bg-brand-surface px-3 py-1.5 text-xs font-bold text-brand-strong">{records.length} รายการ</span></div>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><label className="relative block text-sm"><span className="sr-only">ค้นหาประวัติ</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-body" aria-hidden="true" /><input placeholder="ค้นหาชื่อ แพทย์ หรือผลวินิจฉัย" className={`${inputClass} rounded-2xl border-brand-border-soft bg-white pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} /></label>{selectedId && <label className="flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-brand-body"><input type="checkbox" checked={onlySelected} onChange={(event) => setOnlySelected(event.target.checked)} />เฉพาะนัดที่เลือก</label>}</div>
    {!records.length && <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed border-brand-border-soft bg-white px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-surface text-brand-strong"><Search className="h-6 w-6" aria-hidden="true" /></span><p className="mt-4 font-semibold text-brand-ink">ยังไม่มีผลตรวจตามเงื่อนไขนี้</p><p className="mt-1 text-sm text-brand-body">เมื่อมีผลตรวจ รายการจะแสดงที่นี่</p></div>}
    <div className="grid gap-4 xl:grid-cols-2">{records.map((record) => <article key={record.id} className="space-y-4 rounded-[1.5rem] border border-brand-border-soft bg-white p-5 shadow-[0_8px_24px_rgba(26,61,62,0.04)] sm:p-6">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand-strong"><Stethoscope className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><h3 className="truncate font-bold text-brand-ink">{record.patient}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-brand-body"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(record.created_at))}</p></div><span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{record.completed ? 'จบตรวจแล้ว' : 'รอจบตรวจ'}</span></div>
      <div className="rounded-2xl bg-brand-surface p-4"><p className="text-sm text-brand-body">แพทย์: <span className="font-semibold text-brand-ink">{record.doctor}</span></p><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-brand-ink"><strong>ผลวินิจฉัย:</strong> {record.diagnosis}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-brand-ink"><strong>คำแนะนำ:</strong> {record.treatment_notes || 'ไม่ได้ระบุ'}</p></div>
      <section className="space-y-3" aria-labelledby={`physical-exam-${record.id}`}><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-sky-600" aria-hidden="true" /><h4 id={`physical-exam-${record.id}`} className="font-bold text-brand-ink">การตรวจร่างกายเบื้องต้น</h4></div><dl className="grid gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-brand-body">ส่วนสูง</dt><dd className="mt-1 font-semibold text-brand-ink">{record.height_cm === null ? 'ไม่ได้ระบุ' : `${record.height_cm} ซม.`}</dd></div><div><dt className="text-brand-body">น้ำหนัก</dt><dd className="mt-1 font-semibold text-brand-ink">{record.weight_kg === null ? 'ไม่ได้ระบุ' : `${record.weight_kg} กก.`}</dd></div><div><dt className="text-brand-body">ความดันโลหิต</dt><dd className="mt-1 font-semibold text-brand-ink">{record.blood_pressure === null ? 'ไม่ได้ระบุ' : `${record.blood_pressure} mmHg`}</dd></div><div><dt className="text-brand-body">ชีพจร</dt><dd className="mt-1 font-semibold text-brand-ink">{record.pulse_bpm === null ? 'ไม่ได้ระบุ' : `${record.pulse_bpm} ครั้ง/นาที`}</dd></div></dl></section>
      <section className="space-y-3"><div className="flex items-center gap-2"><Pill className="h-4 w-4 text-emerald-600" aria-hidden="true" /><h4 className="font-bold text-brand-ink">รายการยาที่สั่ง</h4></div>{!record.prescribed_medications?.length && <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-brand-body">ไม่มีรายการยา</p>}<ul className="space-y-2">{record.prescribed_medications?.map((medication) => <li key={medication.medication_id} className="rounded-2xl border border-brand-border-soft bg-[#fbfdfc] p-4 text-sm"><p className="break-words font-bold text-brand-ink">{medication.name} · จำนวนที่สั่ง {medication.quantity}</p><dl className="mt-2 space-y-1 break-words text-brand-body"><div><dt className="inline font-semibold text-brand-ink">ขนาดยาต่อครั้ง: </dt><dd className="inline">{medication.dosage}</dd></div><div><dt className="inline font-semibold text-brand-ink">วิธีใช้และช่วงเวลา: </dt><dd className="inline">{medication.frequency}</dd></div><div><dt className="inline font-semibold text-brand-ink">ระยะเวลา: </dt><dd className="inline">{medication.duration_days} วัน</dd></div></dl></li>)}</ul><p className="text-xs leading-5 text-brand-body">รายการสั่งยาไม่ใช่หลักฐานการจ่ายยา ติดต่อจุดจ่ายยาตามขั้นตอนของคลินิก</p></section>
    </article>)}</div>
  </section>;
}

function RecordsIntro({ role, records, pending }: { role: 'patient' | 'medical'; records: number; pending?: number }) {
  return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-strong">{role === 'medical' ? 'ผลตรวจ / แพทย์' : 'ผลตรวจ / ผู้ป่วย'}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-ink sm:text-3xl">{role === 'medical' ? 'ผลตรวจและรายการยา' : 'ประวัติการรักษา'}</h1><p className="mt-1 max-w-2xl text-sm text-brand-body">{role === 'medical' ? 'บันทึกผลตรวจและข้อมูลที่ผู้ป่วยต้องทราบ' : 'เปิดดูผลตรวจ การตรวจร่างกาย และรายการยาของคุณในที่เดียว'}</p></div><div className="flex gap-2 text-xs font-semibold text-brand-body"><span className="rounded-full bg-brand-surface px-3 py-1.5">{records} ประวัติ</span>{pending !== undefined && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">{pending} คิวรอบันทึก</span>}</div></div>;
}

export function PatientRecordsPage({ repository, selectedId }: { repository?: ClinicRepository; selectedId?: string }) {
  const state = useClinicWorkspace('patient', repository);
  return <ClinicWorkspaceShell {...state} role="patient" section="records" wide>{state.loading ? <ClinicPageLoading /> : state.data && <div className="space-y-5"><RecordsIntro role="patient" records={state.data.records.length} /><RecordList data={state.data} selectedId={selectedId} /></div>}</ClinicWorkspaceShell>;
}

export function MedicalRecordsPage({ repository, selectedId }: { repository?: ClinicRepository; selectedId?: string }) {
  const state = useClinicWorkspace('medical', repository);
  return <ClinicWorkspaceShell {...state} role="medical" section="records" wide>{state.loading ? <ClinicPageLoading /> : state.data && <div className="space-y-5"><RecordsIntro role="medical" records={state.data.records.length} pending={state.data.appointments.filter((appointment) => appointment.status === 'in_progress' && !appointment.has_record).length} /><RecordEditor data={state.data} busy={state.busy} selectedId={selectedId} save={(input) => state.run((repositoryInstance) => repositoryInstance.saveRecord(input), input.complete ? 'บันทึกผลและจบตรวจแล้ว ผู้ป่วยเปิดดูได้' : 'บันทึกผลตรวจแล้ว จบตรวจเพื่อให้ผู้ป่วยเปิดดูผลได้')} /><RecordList data={state.data} selectedId={selectedId} /></div>}</ClinicWorkspaceShell>;
}
