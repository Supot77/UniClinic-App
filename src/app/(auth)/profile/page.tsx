'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getProfile } from '@/services/authService';
import type { Profile } from '@/types/database';
import { Phone, Mail, Pencil, AlertCircle, HeartPulse, FileClock } from 'lucide-react';

const roleLabels: Record<string, string> = {
  patient: 'ผู้ป่วย',
  staff: 'เจ้าหน้าที่',
  doctor: 'แพทย์',
  pharmacist: 'เภสัชกร',
  admin: 'ผู้ดูแลระบบ',
};

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    let active = true;
    getProfile(user.id)
      .then((data) => { if (active) setProfile(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (authLoading || isLoading) {
    return <div className="max-w-3xl mx-auto"><p className="text-zinc-500">กำลังโหลดข้อมูล...</p></div>;
  }

  if (!user) {
    return <div className="max-w-3xl mx-auto"><p className="text-zinc-500">กรุณาเข้าสู่ระบบก่อนดูข้อมูลส่วนตัว</p></div>;
  }

  if (error) {
    return <div className="max-w-3xl mx-auto"><p className="text-sm text-red-600">{error}</p></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900">ข้อมูลส่วนตัว</h1>

      {/* การ์ดข้อมูลส่วนตัว */}
      <section className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xl font-semibold">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{profile?.full_name}</h2>
              <p className="text-sm text-zinc-500">{roleLabels[profile?.role ?? ''] ?? profile?.role}</p>
            </div>
          </div>
          <button
            disabled
            title="เปิดใช้งานในเวอร์ชันถัดไป"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 border border-sky-200 rounded-lg px-3 py-1.5 opacity-50 cursor-not-allowed"
          >
            <Pencil className="size-3.5" />
            แก้ไขข้อมูล
          </button>
        </div>

        <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4">
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <Phone className="size-4 text-zinc-400" />
            {profile?.phone || 'ยังไม่ได้กรอกเบอร์โทรศัพท์'}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <Mail className="size-4 text-zinc-400" />
            {user.email}
          </div>
        </div>
      </section>

      {/* การ์ดข้อมูลสุขภาพ */}
      <section className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <HeartPulse className="size-5 text-sky-500" />
            ข้อมูลสุขภาพ
          </h2>
          <button
            disabled
            title="เปิดใช้งานในเวอร์ชันถัดไป"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 border border-sky-200 rounded-lg px-3 py-1.5 opacity-50 cursor-not-allowed"
          >
            <Pencil className="size-3.5" />
            แก้ไขข้อมูล
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
              <AlertCircle className="size-3.5" /> ประวัติแพ้ยา
            </p>
            <p className="text-sm text-zinc-700">{profile?.allergies || 'ไม่มีข้อมูล'}</p>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
            <p className="text-xs font-medium text-rose-700 flex items-center gap-1.5 mb-1">
              <HeartPulse className="size-3.5" /> โรคประจำตัว
            </p>
            <p className="text-sm text-zinc-700">{profile?.chronic_diseases || 'ไม่มีข้อมูล'}</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-400">
          * กรุ๊ปเลือด, ส่วนสูง/น้ำหนัก, ความดัน — ยังไม่มีในฐานข้อมูล รอทีมตกลงเพิ่มคอลัมน์
        </p>
      </section>

      {/* ประวัติการรักษาล่าสุด */}
      <section className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-4">
          <FileClock className="size-5 text-sky-500" />
          ประวัติการรักษาล่าสุด
        </h2>
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-6 text-center">
          <p className="text-sm text-zinc-500">รอเชื่อมต่อกับระบบนัดหมาย</p>
          <p className="text-xs text-zinc-400 mt-1">📋 ส่วนนี้ดึงข้อมูลจากงานของ ปาย</p>
        </div>
      </section>
    </div>
  );
}