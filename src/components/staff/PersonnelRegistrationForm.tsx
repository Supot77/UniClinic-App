'use client';

import { ArrowLeft, BriefcaseMedical, CheckCircle2, Eye, EyeOff, ShieldCheck, Stethoscope, UserCog } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { normalizePersonnelInput, validatePersonnelInput, type PersonnelKind } from '@/features/personnel-registration';
import type { ProfileTitle } from '@/types/database';

interface DepartmentOption { id: string; name: string }
interface Props { departments: DepartmentOption[] }

const inputClass = 'h-12 w-full rounded-xl border border-brand-border-strong bg-white px-4 text-brand-ink outline-none transition placeholder:text-brand-muted focus:border-brand-strong focus:ring-2 focus:ring-brand-soft';

export default function PersonnelRegistrationForm({ departments }: Props) {
  const [kind, setKind] = useState<PersonnelKind>('doctor');
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
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    const input = normalizePersonnelInput({
      kind,
      title: (kind === 'staff' ? 'อื่น ๆ' : String(form.get('title'))) as ProfileTitle,
      firstName: String(form.get('firstName') ?? ''),
      lastName: String(form.get('lastName') ?? ''),
      employeeId: String(form.get('employeeId') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      password,
      position: kind === 'staff' ? 'เจ้าหน้าที่คลินิก' : String(form.get('position') ?? ''),
      organization: kind === 'staff' ? 'WU Clinic' : String(form.get('organization') ?? ''),
      licenseNumber: String(form.get('licenseNumber') ?? ''),
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
      if (!response.ok) throw new Error(result.error ?? 'สร้างบัญชีไม่สำเร็จ ลองใหม่');
      formElement.reset();
      setSuccess(`สร้างบัญชี${kind === 'doctor' ? 'แพทย์' : 'เจ้าหน้าที่'}แล้ว`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'สร้างบัญชีไม่สำเร็จ ลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <Link href="/staff/accounts" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-strong hover:text-brand-hover">
        <ArrowLeft className="size-4" aria-hidden="true" /> กลับไปจัดการบัญชี
      </Link>
      <section className="overflow-hidden rounded-3xl border border-brand-border-soft bg-white shadow-[0_18px_60px_rgba(15,55,66,0.08)]">
        <header className="border-b border-brand-border-soft bg-gradient-to-r from-brand-soft via-brand-surface to-brand-surface px-6 py-7 sm:px-10">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-strong text-white"><UserCog className="size-6" /></span>
            <div><p className="text-sm font-semibold text-brand-strong">การจัดการบุคลากร</p><h1 className="mt-1 text-2xl font-bold text-brand-ink sm:text-3xl">เพิ่มบัญชีบุคลากร</h1><p className="mt-2 text-sm text-brand-muted">เพิ่มบัญชีแพทย์หรือเจ้าหน้าที่ พร้อมข้อมูลสำหรับเข้าสู่ระบบ</p></div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-9 px-6 py-8 sm:px-10">
          <fieldset><legend className="mb-3 font-semibold text-brand-ink">ประเภทบุคลากร</legend><div className="grid gap-3 sm:grid-cols-2">
            {([{ value: 'doctor', label: 'แพทย์', description: 'มีใบประกอบวิชาชีพและประจำแผนก', icon: Stethoscope }, { value: 'staff', label: 'เจ้าหน้าที่', description: 'ดูแลงานบริหารและบริการของคลินิก', icon: ShieldCheck }] as const).map((option) => {
              const Icon = option.icon; const selected = kind === option.value;
              return <button key={option.value} type="button" onClick={() => setKind(option.value)} aria-pressed={selected} className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${selected ? 'border-brand-strong bg-brand-soft ring-1 ring-brand-strong' : 'border-brand-border-soft hover:border-brand-border-strong'}`}><span className={`flex size-11 items-center justify-center rounded-xl ${selected ? 'bg-brand-strong text-white' : 'bg-brand-page text-brand-strong'}`}><Icon className="size-5" /></span><span><strong className="block text-brand-ink">{option.label}</strong><span className="text-sm text-brand-muted">{option.description}</span></span>{selected && <CheckCircle2 className="ml-auto size-5 text-brand-strong" />}</button>;
            })}
          </div></fieldset>

          <fieldset className="space-y-5"><legend className="mb-1 flex items-center gap-2 text-lg font-bold text-brand-ink"><BriefcaseMedical className="size-5 text-brand-strong" />ข้อมูลส่วนตัวและการติดต่อ</legend>
            <div className="grid gap-5 sm:grid-cols-6">
              {kind === 'doctor' && <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-brand-ink">คำนำหน้า *</span><select name="title" required className={inputClass} defaultValue=""><option value="" disabled>เลือกคำนำหน้า</option><option>นาย</option><option>นาง</option><option>นางสาว</option><option>อื่น ๆ</option></select></label>}
              <label className={kind === 'doctor' ? 'sm:col-span-2' : 'sm:col-span-3'}><span className="mb-2 block text-sm font-semibold text-brand-ink">ชื่อ *</span><input name="firstName" required className={inputClass} /></label>
              <label className={kind === 'doctor' ? 'sm:col-span-2' : 'sm:col-span-3'}><span className="mb-2 block text-sm font-semibold text-brand-ink">นามสกุล *</span><input name="lastName" required className={inputClass} /></label>
              <label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">รหัสบุคลากร *</span><input name="employeeId" inputMode="numeric" maxLength={8} required className={inputClass} placeholder="ตัวเลข 8 หลัก" /></label>
              <label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">เบอร์โทรศัพท์ *</span><input name="phone" inputMode="tel" maxLength={10} required className={inputClass} placeholder="06, 08 หรือ 09" /></label>
              <label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">อีเมล *</span><input name="email" type="email" required className={inputClass} placeholder="กรอกอีเมลที่ใช้งานได้" /></label>
              {kind === 'doctor' && <><label className="sm:col-span-3"><span className="mb-2 block text-sm font-semibold text-brand-ink">หน่วยงาน *</span><input name="organization" required className={inputClass} placeholder="เช่น คลินิกมหาวิทยาลัย" /></label>
              <label className="sm:col-span-6"><span className="mb-2 block text-sm font-semibold text-brand-ink">ตำแหน่ง *</span><input name="position" required className={inputClass} placeholder="เช่น แพทย์เวชปฏิบัติทั่วไป" /></label></>}
            </div>
          </fieldset>

          {kind === 'doctor' && <section aria-labelledby="doctor-professional-heading" className="space-y-5 rounded-2xl border border-brand-border-soft bg-brand-page/60 p-5"><h2 id="doctor-professional-heading" className="text-lg font-bold text-brand-ink">ข้อมูลวิชาชีพ</h2><div className="grid gap-5 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">เลขใบประกอบวิชาชีพ *</span><input name="licenseNumber" inputMode="numeric" maxLength={10} required className={inputClass} placeholder="กรอกเฉพาะตัวเลขตามใบอนุญาต" /></label>
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">ความเชี่ยวชาญ *</span><input name="specialty" required className={inputClass} placeholder="เช่น เวชปฏิบัติทั่วไป" /></label>
            <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-brand-ink">แผนก *</span><select name="departmentId" required className={inputClass} defaultValue=""><option value="" disabled>เลือกแผนก</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{departments.length === 0 && <span className="mt-2 block text-sm text-amber-700">ยังไม่มีแผนกที่เปิดใช้งาน สร้างแผนกก่อนเพิ่มแพทย์</span>}</label>
          </div></section>}

          <fieldset className="space-y-5"><legend className="mb-1 text-lg font-bold text-brand-ink">ข้อมูลเข้าสู่ระบบ</legend><div className="grid gap-5 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">รหัสผ่าน *</span><span className="relative block"><input name="password" type={showPassword ? 'text' : 'password'} minLength={8} required className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button></span></label>
            <label><span className="mb-2 block text-sm font-semibold text-brand-ink">ยืนยันรหัสผ่าน *</span><input name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength={8} required className={inputClass} /></label>
          </div></fieldset>

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-brand-border-soft pt-6 sm:flex-row sm:justify-end"><Link href="/staff/accounts" className="inline-flex h-12 items-center justify-center rounded-xl border border-brand-border-strong px-6 font-semibold text-brand-ink hover:bg-brand-page">ยกเลิก</Link><button type="submit" disabled={submitting || (kind === 'doctor' && departments.length === 0)} className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-strong px-7 font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี'}</button></div>
        </form>
      </section>
    </main>
  );
}
