'use client';

import { Suspense, useState } from 'react';
import {
  useRouter,
  useSearchParams,
} from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn } from '@/services/authService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toLoginErrorMessage } from '@/lib/userFacingErrors';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isRedirecting, setIsRedirecting] =
    useState(false);

  const isLoading =
    isSubmitting || isRedirecting;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }

    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(
        normalizedEmail,
        password,
      );

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('login_welcome_toast', 'true');
      }

      setIsSubmitting(false);
      setIsRedirecting(true);

      const redirect =
        searchParams.get('redirect');

      router.push(redirect || '/dashboard');
      router.refresh();
    } catch (err) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('login_welcome_toast');
      }
      setIsSubmitting(false);
      setIsRedirecting(false);

      setError(
        toLoginErrorMessage(err),
      );
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl">
      {isRedirecting && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-white/95 p-6 text-center backdrop-blur-sm"
        >
          <div className="relative mb-4 flex items-center justify-center">
            <div className="size-12 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-3 animate-ping rounded-full bg-sky-500 opacity-75" />
            </div>
          </div>

          <h2 className="text-base font-bold text-zinc-900">
            เข้าสู่ระบบสำเร็จ
          </h2>

          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            กำลังเปิดหน้าถัดไป…
          </p>
        </div>
      )}

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          เข้าสู่ระบบ
        </h1>

        <p className="mt-2 text-zinc-500">
          ระบบคลินิกสุขภาพมหาวิทยาลัย
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="login-email"
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            อีเมล
          </label>

          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            disabled={isLoading}
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value.replace(
                  /\s/g,
                  '',
                ),
              )
            }
            placeholder="name@example.com"
            aria-describedby="login-email-help"
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50 disabled:text-zinc-400"
          />

          <p
            id="login-email-help"
            className="mt-1.5 text-xs text-zinc-500"
          >
            ผู้ป่วยใช้อีเมลที่ลงท้ายด้วย @mail.wu.ac.th
            ส่วนบุคลากรใช้อีเมลตามบัญชีที่ผู้ดูแลระบบกำหนด
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-zinc-700"
            >
              รหัสผ่าน
            </label>

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-sky-600 hover:underline"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 pr-12 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:bg-zinc-50 disabled:text-zinc-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              disabled={isLoading}
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-zinc-400 transition hover:text-sky-600 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="size-5" aria-hidden="true" />
              ) : (
                <Eye className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading && (
            <Loader2
              className="size-4 animate-spin text-white"
              aria-hidden="true"
            />
          )}

          {isRedirecting
            ? 'กำลังเปิดหน้าถัดไป…'
            : isSubmitting
              ? 'กำลังเข้าสู่ระบบ…'
              : 'เข้าสู่ระบบ'}
        </button>

        <p className="text-center text-sm text-zinc-500">
          ยังไม่มีบัญชี?{' '}
          <Link
            href="/register"
            className="font-medium text-sky-500 hover:underline"
          >
            สมัครสมาชิก
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          center
          label="กำลังโหลดหน้าเข้าสู่ระบบ…"
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
