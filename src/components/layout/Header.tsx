"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';


export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, signOut, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/login', label: 'สิทธิ์ผู้ใช้งาน (Auth)', icon: '👤', roles: ['student', 'staff', 'admin'] },
    { href: '/schedules', label: 'ตารางเวรแพทย์', icon: '📅', roles: ['student', 'staff', 'admin'] },
    { href: '/appointments', label: 'จองคิวตรวจ', icon: '🩺', roles: ['student', 'staff', 'admin'] },
    { href: '/reminders', label: 'แจ้งเตือนทานยา', icon: '💊', roles: ['student', 'staff', 'admin'] },
    { href: '/pharmacy', label: 'คลังเวชภัณฑ์', icon: '📦', roles: ['staff', 'admin'] },
    { href: '/dashboard', label: 'แดชบอร์ดบริหาร', icon: '📊', roles: ['staff', 'admin'] },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Global Navigation Bar (Apple-style dark header) */}
      <nav className="h-11 w-full text-zinc-300 text-xs fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 shadow-sm" style={{ background: '#0a2540' }}>
        <div className="w-full max-w-[1200px] flex items-center justify-between font-normal tracking-tight">
          {/* Logo */}
          <Link href="/" className="text-white font-bold flex items-center gap-2 hover:opacity-90 transition text-sm">
            <span className="text-base">🏥</span>
            <span className="tracking-tight">WU Clinic</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition flex items-center gap-1.5 py-1 px-2 rounded-md ${
                    active
                      ? 'text-white font-semibold bg-white/10'
                      : 'hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Area: Demo Role Switcher & Auth status */}
          <div className="flex items-center gap-3">

            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-[11px] text-zinc-200 hover:text-white font-medium transition"
                  title="จัดการโปรไฟล์"
                >
                  โปรไฟล์
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-[10px] text-zinc-400 hover:text-rose-300 transition px-2 py-0.5 rounded border border-zinc-600/40 hover:border-rose-400/40"
                  title="ออกจากระบบ"
                >
                  ออก
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[11px] font-semibold text-white hover:opacity-80 transition bg-[#0066cc] px-3 py-1 rounded-full"
              >
                เข้าสู่ระบบ
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-white p-1 rounded-md hover:bg-white/10 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Sub Nav Bar */}
      <nav className="h-[48px] w-full bg-white/80 backdrop-blur-md border-b fixed top-11 left-0 right-0 z-40 flex items-center justify-center px-4" style={{ borderColor: '#e5e7eb' }}>
        <div className="w-full max-w-[1200px] flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-tight hover:opacity-75 transition flex items-center gap-2" style={{ color: '#0a2540' }}>
            <span>ระบบบริการสุขภาพและนัดหมายแพทย์ มหาวิทยาลัยวลัยลักษณ์</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-xs text-zinc-500">
              <Link href="/schedules" className="hover:text-sky-600 transition">ตารางแพทย์ประจำวัน</Link>
              <Link href="/pharmacy" className="hover:text-sky-600 transition">ตรวจสอบคลังยา</Link>
              <Link href="/reminders" className="hover:text-sky-600 transition">เตือนทานยา</Link>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold px-4 py-1.5 rounded-full transition-all shadow-xs hover:shadow-md active:scale-95 flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#0a2540,#0d3b6e)', color: '#fff' }}
            >
              <span>🩺</span>
              <span>จองคิวตรวจทันที</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[95px] bg-[#0a2540] text-white border-b border-zinc-700 p-4 z-50 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">
            เมนูระบบคลินิก (Role: {role})
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive(link.href) ? 'bg-white/20 text-white font-bold' : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
          <div className="pt-3 border-t border-zinc-700/80 flex items-center justify-between px-2">
            <span className="text-xs text-zinc-400">
              ผู้ใช้: <strong className="text-white">{user?.full_name}</strong>
            </span>
            <button
              onClick={() => {
                signOut();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-rose-300 hover:text-rose-200"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </>
  );
}
