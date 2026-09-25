'use client';

import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { updatePassword } from '@/services/authService';
import { useLocale } from '@/context/LocaleContext';

export default function ResetPasswordForm() {
  const { text } = useLocale();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordChecks = [
    { valid: password.length >= 8, label: text('อย่างน้อย 8 ตัวอักษร', 'At least 8 characters') },
    { valid: /[A-Z]/.test(password), label: text('มีตัวพิมพ์ใหญ่ (A-Z)', 'An uppercase letter (A-Z)') },
    { valid: /[a-z]/.test(password), label: text('มีตัวพิมพ์เล็ก (a-z)', 'A lowercase letter (a-z)') },
    { valid: /\d/.test(password), label: text('มีตัวเลข (0-9)', 'A number (0-9)') },
    { valid: !/\s/.test(password), label: text('ไม่มีช่องว่าง', 'No spaces') },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!passwordChecks.every((check) => check.valid)) {
      setError(text('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข โดยไม่มีช่องว่าง', 'Use at least 8 characters, including uppercase and lowercase letters and a number. Spaces are not allowed.'));
      return;
    }
    if (password !== confirmPassword) {
      setError(text('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'The passwords do not match.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : text('ตั้งรหัสผ่านใหม่ไม่สำเร็จ ลิงก์อาจหมดอายุ', 'Could not reset your password. The link may have expired.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="rounded-2xl border border-zinc-100 bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold text-zinc-900">{text('ตั้งรหัสผ่านใหม่สำเร็จ', 'Password reset complete')}</h1>
        <p className="mt-2 text-sm text-zinc-500">{text('ใช้รหัสผ่านใหม่เข้าสู่ระบบได้แล้ว', 'You can now sign in with your new password.')}</p>
        <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600">
          {text('เข้าสู่ระบบ', 'Sign in')}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-sky-50">
          <LockKeyhole className="size-6 text-sky-600" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">{text('ตั้งรหัสผ่านใหม่', 'Reset your password')}</h1>
        <p className="mt-2 text-sm text-zinc-500">{text('รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข', 'Use uppercase and lowercase letters and a number.')}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-zinc-700">{text('รหัสผ่านใหม่', 'New password')}</label>
          <div className="relative">
            <input id="new-password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-zinc-200 px-4 py-3 pr-12 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-400 hover:text-sky-600" aria-label={showPassword ? text('ซ่อนรหัสผ่าน', 'Hide password') : text('แสดงรหัสผ่าน', 'Show password')}>
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-xs" aria-label={text('เงื่อนไขรหัสผ่าน', 'Password requirements')}>
            {passwordChecks.map((check) => (
              <li key={check.label} className={password && check.valid ? 'text-emerald-700' : 'text-zinc-500'}>
                {password && check.valid ? '✓' : '○'} {check.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-zinc-700">{text('ยืนยันรหัสผ่านใหม่', 'Confirm new password')}</label>
          <input id="confirm-new-password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50" />
        </div>
        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60">
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? text('กำลังบันทึก…', 'Saving…') : text('บันทึกรหัสผ่านใหม่', 'Save new password')}
        </button>
      </form>
    </section>
  );
}
