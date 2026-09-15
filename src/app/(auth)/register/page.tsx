'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { signUp } from '@/services/authService';

type FieldName = 'fullName' | 'studentId' | 'email' | 'phone' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;

export function validateRegistration(values: Record<FieldName, string>): FieldErrors {
  const errors: FieldErrors = {};
  const fullName = values.fullName.trim();

  if (!fullName) errors.fullName = 'กรุณากรอกชื่อ-นามสกุล';
  else if (!/^[A-Za-z\u0E00-\u0E7F]+(?:[ -][A-Za-z\u0E00-\u0E7F]+)*$/.test(fullName)) {
    errors.fullName = 'ใช้ได้เฉพาะตัวอักษรไทย อังกฤษ และช่องว่าง';
  }
  if (!/^\d{8}$/.test(values.studentId)) errors.studentId = 'รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก';
  if (!/^[^\s@]+@mail\.wu\.ac\.th$/i.test(values.email.trim())) errors.email = 'กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น';
  if (!/^0\d{9}$/.test(values.phone)) errors.phone = 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลักและขึ้นต้นด้วย 0';
  if (values.password.length < 8) errors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'ยืนยันรหัสผ่านไม่ตรงกัน';
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<FieldName, string>>({
    fullName: '', studentId: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: FieldName, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const errors = validateRegistration(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setIsSubmitting(true);
    try {
      await signUp(form.email.trim().toLowerCase(), form.password, form.fullName.trim(), form.studentId, form.phone);
      router.push('/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = (field: FieldName) => `w-full min-w-0 rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 ${fieldErrors[field] ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-50' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-50'}`;
  return (
    <section className="relative left-1/2 w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_55px_rgba(15,58,72,0.12)] sm:w-[min(100vw-3rem,42rem)] sm:rounded-3xl">
      <header className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 px-5 py-6 text-center sm:px-10 sm:py-7">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20"><UserPlus className="size-6" aria-hidden="true" /></div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">สมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-slate-500">สร้างบัญชีผู้ป่วยสำหรับเข้าใช้งาน WU Clinic</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 px-5 py-6 sm:px-8 sm:py-7 md:px-10">
        {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" id="full-name" label="ชื่อ-นามสกุล" error={fieldErrors.fullName} help="ใช้ตัวอักษรไทยหรืออังกฤษเท่านั้น">
            <input id="full-name" type="text" required autoComplete="name" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="เช่น สมชาย ใจดี" aria-invalid={Boolean(fieldErrors.fullName)} aria-describedby="full-name-help" disabled={isSubmitting} className={inputClass('fullName')} />
          </Field>

          <Field id="student-id" label="รหัสนักศึกษา" error={fieldErrors.studentId} help={`${form.studentId.length}/8 หลัก`}>
            <input id="student-id" type="text" required inputMode="numeric" maxLength={8} value={form.studentId} onChange={(e) => updateField('studentId', e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="67116004" aria-invalid={Boolean(fieldErrors.studentId)} aria-describedby="student-id-help" disabled={isSubmitting} className={inputClass('studentId')} />
          </Field>

          <Field id="phone" label="เบอร์โทรศัพท์" error={fieldErrors.phone} help="ตัวเลข 10 หลัก ไม่ต้องใส่ขีด">
            <input id="phone" type="tel" required inputMode="numeric" autoComplete="tel" maxLength={10} value={form.phone} onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0812345678" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby="phone-help" disabled={isSubmitting} className={inputClass('phone')} />
          </Field>

          <Field className="sm:col-span-2" id="register-email" label="อีเมลมหาวิทยาลัย" error={fieldErrors.email} help="รองรับเฉพาะอีเมลที่ลงท้ายด้วย @mail.wu.ac.th">
            <input id="register-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => updateField('email', e.target.value.replace(/\s/g, ''))} placeholder="example@mail.wu.ac.th" aria-invalid={Boolean(fieldErrors.email)} aria-describedby="register-email-help" disabled={isSubmitting} className={inputClass('email')} />
          </Field>

          <Field id="register-password" label="รหัสผ่าน" error={fieldErrors.password} help="อย่างน้อย 8 ตัวอักษร">
            <div className="relative">
              <input id="register-password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => updateField('password', e.target.value)} placeholder="อย่างน้อย 8 ตัวอักษร" aria-invalid={Boolean(fieldErrors.password)} aria-describedby="register-password-help" disabled={isSubmitting} className={`${inputClass('password')} pr-12`} />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-teal-600" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
            </div>
          </Field>

          <Field id="confirm-password" label="ยืนยันรหัสผ่าน" error={fieldErrors.confirmPassword} help="ต้องตรงกับรหัสผ่าน">
            <input id="confirm-password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" aria-invalid={Boolean(fieldErrors.confirmPassword)} aria-describedby="confirm-password-help" disabled={isSubmitting} className={inputClass('confirmPassword')} />
          </Field>
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500"><CheckCircle2 className="mr-2 inline size-4 text-teal-600" aria-hidden="true" />บัญชีที่สมัครจะได้รับสิทธิ์ผู้ป่วย และไม่สามารถเปลี่ยนบทบาทเองได้</div>
        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-lg shadow-teal-600/15 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}{isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}</button>
        <p className="text-center text-sm text-slate-500">มีบัญชีแล้ว? <Link href="/login" className="font-semibold text-teal-600 hover:underline">เข้าสู่ระบบ</Link></p>
      </form>
    </section>
  );
}

function Field({ id, label, error, help, className = '', children }: { id: string; label: string; error?: string; help: string; className?: string; children: React.ReactNode }) {
  return <div className={`min-w-0 ${className}`}><label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">{label} <span className="text-rose-500">*</span></label>{children}<p id={`${id}-help`} className={`mt-1.5 min-h-4 text-xs ${error ? 'text-rose-600' : 'text-slate-400'}`}>{error || help}</p></div>;
}
