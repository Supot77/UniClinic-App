'use client';

import { Suspense, useState, useTransition } from 'react';
import {
  useRouter,
  useSearchParams,
} from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn } from '@/services/authService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toLoginErrorMessage } from '@/lib/userFacingErrors';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/context/LocaleContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { text, locale } = useLocale();

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
  const [isRoutePending, startRedirectTransition] =
    useTransition();

  const isLoading =
    isSubmitting || isRedirecting || isRoutePending;
  const showRedirectOverlay = isRedirecting && !isAuthenticated;

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
      setError(text('กรุณากรอกอีเมลให้ถูกต้อง', 'Enter a valid email address.'));
      return;
    }

    if (!password) {
      setError(text('กรุณากรอกรหัสผ่าน', 'Enter your password.'));
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

      const thaiError = toLoginErrorMessage(err);
      const englishError: Record<string, string> = {
        'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ': 'Please verify your email before signing in.',
        'อีเมลหรือรหัสผ่านไม่ถูกต้อง': 'The email or password is incorrect.',
        'ลองเข้าสู่ระบบอีกครั้งภายหลัง': 'Please try signing in again later.',
        'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่': 'Could not connect. Check your internet connection and try again.',
        'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่': 'Sign-in failed. Please try again.',
      };
      setError(locale === 'en' ? englishError[thaiError] ?? 'Sign-in failed. Please try again.' : thaiError);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-8 shadow-xl">
      {showRedirectOverlay && (
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
            {text('เข้าสู่ระบบสำเร็จ', 'Signed in successfully')}
          </h2>

          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            {text('กำลังเปิดหน้าถัดไป…', 'Opening the next page…')}
          </p>
        </div>
      )}

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          {text('เข้าสู่ระบบ', 'Sign in')}
        </h1>

        <p className="mt-2 text-zinc-500">
          {text('ระบบคลินิกสุขภาพมหาวิทยาลัย', 'University health clinic')}
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
            {text('อีเมล', 'Email')}
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
            {text('ผู้ป่วยใช้อีเมลที่ลงท้ายด้วย @mail.wu.ac.th', 'Patients must use an @mail.wu.ac.th email address.')}
          </p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-zinc-700"
            >
              {text('รหัสผ่าน', 'Password')}
            </label>

            <Link
              href="/forgot-password"
              className="text-sm font-medium text-sky-600 hover:underline"
            >
              {text('ลืมรหัสผ่าน?', 'Forgot password?')}
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
              aria-label={showPassword ? text('ซ่อนรหัสผ่าน', 'Hide password') : text('แสดงรหัสผ่าน', 'Show password')}
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

          {isRedirecting || isRoutePending
            ? text('กำลังเปิดหน้าถัดไป…', 'Opening the next page…')
            : isSubmitting
              ? text('กำลังเข้าสู่ระบบ…', 'Signing in…')
              : text('เข้าสู่ระบบ', 'Sign in')}
        </button>

        <p className="text-center text-sm text-zinc-500">
          {text('ยังไม่มีบัญชีผู้ป่วย?', 'New patient?')}{' '}
          <Link
            href="/register"
            className="font-medium text-sky-500 hover:underline"
          >
            {text('สมัครสมาชิก', 'Create an account')}
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { text } = useLocale();
  return (
    <Suspense
      fallback={
        <LoadingSpinner
          center
          label={text('กำลังโหลดหน้าเข้าสู่ระบบ…', 'Loading sign-in page…')}
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
