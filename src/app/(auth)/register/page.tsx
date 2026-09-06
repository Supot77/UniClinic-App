'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/services/authService';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (!email.endsWith('@mail.wu.ac.th')) {
      setError('กรุณาใช้อีเมล @mail.wu.ac.th เท่านั้น');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, fullName, studentId, phone);
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-zinc-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">สมัครสมาชิก</h1>
        <p className="text-zinc-500 mt-2">สร้างบัญชีเพื่อเข้าใช้งานระบบ</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">ชื่อ-นามสกุล</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="ชื่อ นามสกุล"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">รหัสนักศึกษา/บุคลากร</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="6XXXXXXXXX"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@mail.wu.ac.th"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08X-XXX-XXXX"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition disabled:opacity-60"
        >
          {isSubmitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
        </button>
        <p className="text-center text-sm text-zinc-500">
          มีบัญชีแล้ว?{' '}
          <Link href="/login" className="text-sky-500 font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </div>
  );
}