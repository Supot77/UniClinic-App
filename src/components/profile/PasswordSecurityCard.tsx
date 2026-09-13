'use client';

import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { changePassword } from '@/services/authService';

export default function PasswordSecurityCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (currentPassword === newPassword) {
      setError('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section id="security" className="mt-5 scroll-mt-24 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_3px_14px_rgba(15,77,120,0.05)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50">
          <ShieldCheck className="size-5 text-sky-600" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">ความปลอดภัยและรหัสผ่าน</h2>
          <p className="mt-1 text-xs text-slate-400">เปลี่ยนรหัสผ่านสำหรับเข้าสู่ระบบ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 p-5 sm:p-6">
        {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" /> เปลี่ยนรหัสผ่านสำเร็จ</p>}

        <div>
          <label htmlFor="current-password" className="mb-2 block text-sm font-semibold text-slate-600">รหัสผ่านปัจจุบัน</label>
          <input id="current-password" type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50 disabled:bg-slate-50" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="profile-new-password" className="mb-2 block text-sm font-semibold text-slate-600">รหัสผ่านใหม่</label>
            <input id="profile-new-password" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50 disabled:bg-slate-50" />
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="mb-2 block text-sm font-semibold text-slate-600">ยืนยันรหัสผ่านใหม่</label>
            <input id="profile-confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50 disabled:bg-slate-50" />
          </div>
        </div>
        <p className="text-xs text-slate-400">รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร</p>
        <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </form>
    </section>
  );
}
