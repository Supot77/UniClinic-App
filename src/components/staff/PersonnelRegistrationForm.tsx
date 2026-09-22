'use client';

import { ArrowLeft, BriefcaseMedical, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Stethoscope, UserCog, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import RegisterPage from '@/app/(auth)/register/page';
import { normalizePersonnelInput, validatePersonnelInput, type PersonnelKind } from '@/features/personnel-registration';
import type { ProfileTitle } from '@/types/database';

interface DepartmentOption { id: string; name: string }
interface Props { departments: DepartmentOption[] }

const inputClass = 'min-h-[46px] w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:bg-slate-50';
type AccountKind = 'patient' | PersonnelKind;

export default function PersonnelRegistrationForm({ departments }: Props) {
  const [kind, setKind] = useState<AccountKind>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirmPassword') ?? '')) {
      setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (kind === 'patient') return;
    const input = normalizePersonnelInput({
      kind,
      title: String(form.get('title')) as ProfileTitle,
      firstName: String(form.get('firstName') ?? ''),
      lastName: String(form.get('lastName') ?? ''),
      employeeId: String(form.get('employeeId') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      password,
      position: kind === 'staff' ? 'เจ้าหน้าที่คลินิก' : String(form.get('position') ?? ''),
      organization: kind === 'staff' ? 'WU Clinic' : String(form.get('organization') ?? ''),
      licenseNumber: kind === 'doctor'
        ? `ว.${String(form.get('licenseNumber') ?? '').replace(/\D/g, '')}`
        : '',
      specialty: String(form.get('specialty') ?? ''),
      departmentId: String(form.get('departmentId') ?? ''),
    });
    const validationError = validatePersonnelInput(input);
    if (validationError) { setError(validationError); return; }

    setSubmitting(true);
    try {
      const response = await fetch('/api/staff/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'สร้างบัญชีไม่สำเร็จ');
      formElement.reset();
      setSuccess(`สร้างบัญชี${kind === 'doctor' ? 'แพทย์' : 'เจ้าหน้าที่'}เรียบร้อยแล้ว`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'สร้างบัญชีไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      {(submitting || success) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-live="assertive">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            {success ? <CheckCircle2 className="mx-auto size-16 text-emerald-500" aria-hidden="true" /> : <Loader2 className="mx-auto size-14 animate-spin text-brand-strong" aria-hidden="true" />}
            <h2 className="mt-5 text-xl font-bold text-brand-ink">{success || 'กำลังสร้างบัญชี…'}</h2>
            <p className="mt-2 text-sm text-brand-muted">{success ? 'ระบบบันทึกข้อมูลเรียบร้อยแล้ว' : 'กรุณารอสักครู่และอย่าปิดหน้านี้'}</p>
            {success && <button type="button" onClick={() => setSuccess(null)} className="mt-6 w-full rounded-xl bg-brand-strong px-5 py-3 font-semibold text-white hover:bg-brand-hover">ตกลง</button>}
          </div>
        </div>
      )}
      <Link href="/staff/accounts" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:text-brand-hover">
        <ArrowLeft className="size-4" aria-hidden="true" /> กลับหน้าจัดการบัญชี
      </Link>
      <section className="overflow-hidden rounded-3xl border border-brand-border-soft bg-white shadow-[0_18px_60px_rgba(15,55,66,0.08)]">
        <header className="border-b border-brand-border-soft bg-gradient-to-r from-brand-soft via-white to-white px-6 py-7 sm:px-10">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-strong text-white"><UserCog className="size-6" /></span>
            <div><p className="text-sm font-semibold text-brand-strong">สำหรับเจ้าหน้าที่คลินิก</p><h1 className="mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">สร้างบัญชี</h1><p className="mt-2 text-sm text-brand-muted">เลือกสร้างบัญชีผู้ป่วย แพทย์ หรือเจ้าหน้าที่</p></div>
          </div>
        </header>

        <fieldset className="px-6 pt-8 sm:px-10"><legend className="mb-3 font-semibold text-brand-ink">ประเภทบัญชี</legend><div className="grid gap-3 sm:grid-cols-3">
            {([{ value: 'patient', label: 'ผู้ป่วย', description: 'นักศึกษาหรือบุคลากรที่เข้ารับบริการ', icon: UserPlus }, { value: 'doctor', label: 'แพทย์', description: 'มีใบประกอบวิชาชีพและสังกัดแผนก', icon: Stethoscope }, { value: 'staff', label: 'เจ้าหน้าที่', description: 'ดูแลงานบริหารและงานบริการภายในคลินิก', icon: ShieldCheck }] as const).map((option) => {
              const Icon = option.icon; const selected = kind === option.value;
              return <button key={option.value} type="button" onClick={() => { setKind(option.value); setError(null); setSuccess(null); }} aria-pressed={selected} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-brand-strong bg-brand-soft ring-1 ring-brand-strong' : 'border-brand-border-soft hover:border-brand-border-strong'}`}><span className={`flex size-11 items-center justify-center rounded-xl ${selected ? 'bg-brand-strong text-white' : 'bg-brand-page text-brand-strong'}`}><Icon className="size-5" /></span><span><strong className="block text-brand-ink">{option.label}</strong><span className="text-sm text-brand-muted">{option.description}</span></span>{selected && <CheckCircle2 className="ml-auto size-5 text-brand-strong" />}</button>;
            })}
          </div></fieldset>

        {kind === 'patient' ? <div className="px-6 pb-8 pt-4 sm:px-10"><RegisterPage mode="staff-walk-in" embedded /></div> : <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-9 px-6 py-8 sm:px-10">

          <fieldset className="space-y-5"><legend className="mb-1 flex items-center gap-2 text-lg font-bold text-brand-ink"><BriefcaseMedical className="size-5 text-brand-strong" />ข้อมูลส่วนตัวและการติดต่อ</legend>
            <div className="grid gap-5 sm:grid-cols-6">
              <div className="grid gap-5 sm:col-span-6 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
              <label><span className="mb-2 block text-sm font-semibold text-brand-ink">คำนำหน้า *</span><select key={kind} name="title" required className={inputClass} defaultValue=""><option value="" disabled>เลือก</option>{kind === 'doctor' ? <><option>นายแพทย์</option><option>แพทย์หญิง</option><option>ดร.</option></> : <><option>นาย</option><option>นาง</option><option>นางสาว</option><option>ดร.</option></>}</select></label>
              <label><span className="mb-2 block text-sm font-semibold text-brand-ink">ชื่อ *</span><input name="firstName" required className={inputClass} placeholder="เช่น สมชาย" /></label>
              <label><span className="mb-2 block text-sm font-semibold text-brand-ink">นามสกุล *</span><input name="lastName" required className={inputClass} placeholder="เช่น ใจดี" /></label>
              </div>
              <label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">รหัสบุคลากร *</span><input name="employeeId" inputMode="numeric" maxLength={8} required className={inputClass} placeholder="ตัวเลข 8 หลัก" /></label>
              <label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">เบอร์โทรศัพท์ *</span><input name="phone" inputMode="tel" maxLength={10} required className={inputClass} placeholder="06, 08 หรือ 09" /></label>
              <label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">อีเมล *</span><input name="email" type="email" required className={inputClass} placeholder="ใช้อีเมลโดเมนใดก็ได้" /></label>
              {kind === 'doctor' && <><label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">หน่วยงาน *</span><input name="organization" required className={inputClass} placeholder="เช่น คลินิกมหาวิทยาลัย" /></label>
              <label className="sm:col-span-6"><span className="mb-2 block text-sm font-semibold text-brand-ink">ตำแหน่ง *</span><input name="position" required className={inputClass} placeholder="เช่น แพทย์เวชปฏิบัติทั่วไป" /></label></>}
            </div>
          </fieldset>

          {kind === 'doctor' && <section aria-labelledby="doctor-professional-heading" className="space-y-5 rounded-2xl border border-brand-border-soft bg-brand-page/60 p-5"><h2 id="doctor-professional-heading" className="text-lg font-bold text-brand-ink">ข้อมูลวิชาชีพแพทย์</h2><div className="grid gap-5 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">เลขใบประกอบวิชาชีพ *</span><span className="flex"><span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 border-brand-border-strong bg-brand-page px-4 font-semibold text-brand-ink">ว.</span><input name="licenseNumber" inputMode="numeric" pattern="[0-9]{5,6}" minLength={5} maxLength={6} required className={`${inputClass} rounded-l-none`} placeholder="ตัวเลข 5–6 หลัก" /></span><span className="mt-2 block text-xs text-brand-muted">รูปแบบเลขทะเบียนแพทยสภา เช่น ว.12345</span></label>
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">ความเชี่ยวชาญ *</span><input name="specialty" required className={inputClass} placeholder="เช่น เวชปฏิบัติทั่วไป" /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-brand-ink">แผนก *</span><select name="departmentId" required className={inputClass} defaultValue=""><option value="" disabled>เลือกแผนก</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{departments.length === 0 && <span className="mt-2 block text-sm text-amber-700">ยังไม่มีแผนกที่เปิดใช้งาน กรุณาสร้างแผนกก่อน</span>}</label>
          </div></section>}

          <fieldset className="space-y-5"><legend className="mb-1 text-lg font-bold text-brand-ink">ข้อมูลเข้าสู่ระบบ</legend><div className="grid gap-5 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">รหัสผ่าน *</span><span className="relative block"><input name="password" type={showPassword ? 'text' : 'password'} minLength={8} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{8,}" title="อย่างน้อย 8 ตัว มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข" required className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></span><span className="mt-2 block text-xs text-brand-muted">อย่างน้อย 8 ตัว มี A–Z, a–z และตัวเลข</span></label>
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">ยืนยันรหัสผ่าน *</span><input name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength={8} required className={inputClass} /></label>
          </div></fieldset>

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-brand-border-soft pt-6 sm:flex-row sm:justify-end"><Link href="/staff/accounts" aria-disabled={submitting} className="inline-flex h-12 items-center justify-center rounded-xl border border-brand-border-strong px-6 font-semibold text-brand-ink hover:bg-brand-page">ยกเลิก</Link><button type="submit" disabled={submitting || (kind === 'doctor' && departments.length === 0)} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-strong px-7 font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{submitting ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}</button></div>
        </form>}
      </section>
    </main>
  );
}
