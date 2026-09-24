'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { requestPasswordReset } from '@/services/authService';
import { useLocale } from '@/context/LocaleContext';

export default function ForgotPasswordForm() {
  const { text } = useLocale();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(
        email,
        `${window.location.origin}/reset-password`,
      );
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : text('ส่งลิงก์ไม่สำเร็จ', 'Could not send the link.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section className="rounded-2xl border border-zinc-100 bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto size-14 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold text-zinc-900">{text('ตรวจสอบอีเมลของคุณ', 'Check your email')}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {text('หากอีเมลนี้มีบัญชีในระบบ เราส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว', 'If an account exists for this email, we have sent a password reset link.')}
        </p>
        <p className="mt-2 break-all text-sm font-medium text-sky-700">{email}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-semibold text-sky-600 hover:underline"
        >
          {text('ส่งอีกครั้ง', 'Send again')}
        </button>
        <Link href="/login" className="mt-5 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-sky-600">
          <ArrowLeft className="size-4" aria-hidden="true" /> {text('กลับหน้าเข้าสู่ระบบ', 'Back to sign in')}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-sky-50">
          <Mail className="size-6 text-sky-600" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-zinc-900">{text('ลืมรหัสผ่าน', 'Forgot your password?')}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {text('กรอกอีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้', 'Enter the email address you registered with and we will send you a reset link.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div>
          <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-zinc-700">{text('อีเมล', 'Email')}</label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            placeholder="name@example.com"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50"
          />
        </div>
        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60">
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? text('กำลังส่งลิงก์…', 'Sending link…') : text('ส่งลิงก์ตั้งรหัสผ่านใหม่', 'Send password reset link')}
        </button>
        <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-sky-600">
          <ArrowLeft className="size-4" aria-hidden="true" /> {text('กลับหน้าเข้าสู่ระบบ', 'Back to sign in')}
        </Link>
      </form>
    </section>
  );
}
