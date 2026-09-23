'use client';

import { CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { changePassword } from '@/services/authService';

export default function PasswordSecurityCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordIsValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && !/\s/.test(newPassword);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!passwordIsValid) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข โดยไม่มีช่องว่าง');
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
    <section className="p-5 sm:p-6">
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 p-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50">
          <ShieldCheck className="size-5 text-sky-600" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h3>
          <p className="mt-1 text-xs text-slate-500">ยืนยันรหัสเดิมก่อนตั้งรหัสใหม่</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" aria-hidden="true" /> เปลี่ยนรหัสผ่านสำเร็จ</p>}

        <div>
          <label htmlFor="current-password" className="mb-2 block text-sm font-semibold text-slate-600">รหัสผ่านปัจจุบัน</label>
          <input id="current-password" type={showPasswords ? 'text' : 'password'} required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50" />
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="profile-new-password" className="mb-2 block text-sm font-semibold text-slate-600">รหัสผ่านใหม่</label>
            <input id="profile-new-password" type={showPasswords ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50" />
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="mb-2 block text-sm font-semibold text-slate-600">ยืนยันรหัสผ่านใหม่</label>
            <input id="profile-confirm-password" type={showPasswords ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={isSubmitting} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50" />
          </div>
        </div>
        <button type="button" onClick={() => setShowPasswords((shown) => !shown)} aria-pressed={showPasswords} className="inline-flex items-center gap-2 rounded-lg text-sm text-slate-600 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500">
          {showPasswords ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
          {showPasswords ? 'ซ่อนรหัสผ่านทั้งหมด' : 'แสดงรหัสผ่านทั้งหมด'}
        </button>
        <div aria-live="polite" className="text-xs text-slate-600">
          <p>รหัสผ่านใหม่ต้องมีครบทุกข้อและไม่มีช่องว่าง:</p>
          <ul className="mt-1 space-y-1">
            <li className={newPassword && hasMinLength ? 'text-emerald-700' : ''}>{newPassword && hasMinLength ? '✓' : '○'} อย่างน้อย 8 ตัวอักษร</li>
            <li className={newPassword && hasUppercase ? 'text-emerald-700' : ''}>{newPassword && hasUppercase ? '✓' : '○'} ตัวพิมพ์ใหญ่ A–Z</li>
            <li className={newPassword && hasLowercase ? 'text-emerald-700' : ''}>{newPassword && hasLowercase ? '✓' : '○'} ตัวพิมพ์เล็ก a–z</li>
            <li className={newPassword && hasNumber ? 'text-emerald-700' : ''}>{newPassword && hasNumber ? '✓' : '○'} ตัวเลข 0–9</li>
          </ul>
          {newPassword && /\s/.test(newPassword) && <p className="mt-1 text-rose-600">รหัสผ่านต้องไม่มีช่องว่าง</p>}
          {confirmPassword && <p className={`mt-2 ${confirmPassword === newPassword ? 'text-emerald-700' : 'text-rose-600'}`}>{confirmPassword === newPassword ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน'}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60">
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? 'กำลังเปลี่ยนรหัสผ่าน…' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </form>
    </section>
  );
}
