'use client';

import Link from 'next/link';
import { ArrowLeft, FileClock, LogOut, Settings, ShieldCheck, Stethoscope, UserRound, UsersRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { UserRole } from '@/types/database';
import PasswordSecurityCard from '@/components/profile/PasswordSecurityCard';

interface ProfileAccountDrawerProps {
  open: boolean;
  fullName?: string;
  role: UserRole | null;
  onClose: () => void;
  onSignOut: () => void;
}

type AccountMenuItem = { href: string; label: string; icon: typeof UserRound; active?: boolean };

const accountItemsByRole: Record<UserRole, AccountMenuItem[]> = {
  patient: [
    { href: '/records', label: 'ประวัติการรักษา', icon: FileClock },
    { href: '/reminders', label: 'เตือนยา', icon: Stethoscope },
  ],
  medical: [
    { href: '/records', label: 'บันทึกการรักษา', icon: Stethoscope },
    { href: '/appointments', label: 'นัดหมายผู้ป่วย', icon: FileClock },
  ],
  staff_admin: [{ href: '/staff/accounts', label: 'จัดการผู้ใช้งาน', icon: UsersRound }],
};

export default function ProfileAccountDrawer({ open, onClose, onSignOut, role }: ProfileAccountDrawerProps) {
  const [view, setView] = useState<'menu' | 'security'>('menu');
  const menuItems: AccountMenuItem[] = [
    { href: '/profile', label: 'ข้อมูลส่วนตัว', icon: UserRound, active: true },
    ...(role ? accountItemsByRole[role] : []),
    { href: '/settings', label: 'ตั้งค่า', icon: Settings },
  ];

  function handleClose() {
    setView('menu');
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setView('menu');
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-[60] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button type="button" onClick={handleClose} aria-label="ปิดเมนูบัญชี" className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} />
      <aside className={`absolute bottom-0 right-0 top-0 flex max-w-[92vw] flex-col bg-white shadow-2xl transition-[transform,width] duration-300 ease-out ${view === 'security' ? 'w-[430px]' : 'w-[332px]'} ${open ? 'translate-x-0' : 'translate-x-full'}`} aria-label="เมนูบัญชี">
        <div className="flex min-h-20 items-center justify-between gap-3 border-b border-slate-100 px-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-2">
            {view === 'security' && <button type="button" onClick={() => setView('menu')} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100" aria-label="กลับไปเมนูบัญชี"><ArrowLeft className="size-5" aria-hidden="true" /></button>}
            <h2 className={`${view === 'security' ? 'text-lg' : 'text-2xl'} truncate font-bold text-slate-950`}>{view === 'security' ? 'ความปลอดภัยและรหัสผ่าน' : 'Profile'}</h2>
          </div>
          <button type="button" onClick={handleClose} className="flex size-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-slate-100" aria-label="ปิด"><X className="size-6" aria-hidden="true" /></button>
        </div>
        {view === 'menu' ? (
          <nav className="space-y-1 overflow-y-auto p-2" aria-label="รายการเมนูบัญชี">
            {menuItems.slice(0, -1).map((item) => {
              const Icon = item.icon;
              const active = item.active ?? false;
              return <Link key={item.href} href={item.href} onClick={handleClose} className={`flex min-h-14 items-center gap-4 rounded-xl px-5 text-base transition ${active ? 'bg-gradient-to-r from-teal-50 to-cyan-50 font-semibold text-teal-800' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-800'}`}><Icon className={`size-6 shrink-0 ${active ? 'text-teal-700' : 'text-slate-500'}`} aria-hidden="true" /><span>{item.label}</span></Link>;
            })}
            <button type="button" onClick={() => setView('security')} className="flex min-h-14 w-full items-center gap-4 rounded-xl px-5 text-left text-base font-medium text-slate-600 transition hover:bg-slate-50 hover:text-teal-800"><ShieldCheck className="size-6 shrink-0 text-slate-500" aria-hidden="true" /><span>ความปลอดภัยและรหัสผ่าน</span></button>
            {menuItems.slice(-1).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={handleClose} className="flex min-h-14 items-center gap-4 rounded-xl px-5 text-base font-medium text-slate-600 transition hover:bg-slate-50 hover:text-teal-800"><Icon className="size-6 shrink-0 text-slate-500" aria-hidden="true" /><span>{item.label}</span></Link>; })}
            <div className="mx-1 my-2 border-t border-slate-200" />
            <button type="button" onClick={onSignOut} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"><LogOut className="size-5 shrink-0" aria-hidden="true" /><span>ออกจากระบบ</span></button>
          </nav>
        ) : (
          <div className="flex-1 overflow-y-auto"><PasswordSecurityCard /></div>
        )}
      </aside>
    </div>
  );
}
