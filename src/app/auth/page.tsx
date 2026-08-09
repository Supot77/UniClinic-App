"use client";

import React, { useState } from "react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-zinc-900 to-black p-6 text-zinc-100">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl transition-all hover:border-emerald-500/30">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {isLogin ? "เข้าสู่ระบบ" : "ลงทะเบียนใหม่"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            ระบบจองคิวคลินิก WU Clinic Booking
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">ชื่อ-นามสกุล</label>
              <input 
                type="text" 
                placeholder="กรอกชื่อ-นามสกุลของคุณ" 
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">อีเมลผู้ใช้งาน</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">รหัสผ่าน</label>
              {isLogin && (
                <a href="#" className="text-xs text-emerald-400 hover:underline">ลืมรหัสผ่าน?</a>
              )}
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button 
            type="submit" 
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-sm font-semibold text-white transition hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98]"
          >
            {isLogin ? "เข้าสู่ระบบ" : "สร้างบัญชีผู้ใช้"}
          </button>
        </form>

        <div className="mt-8 border-t border-zinc-800 pt-6 text-center text-xs text-zinc-500">
          <span className="mr-1">
            {isLogin ? "ยังไม่มีบัญชีผู้ใช้งาน?" : "มีบัญชีผู้ใช้งานอยู่แล้ว?"}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="font-medium text-emerald-400 hover:underline"
          >
            {isLogin ? "สมัครสมาชิกที่นี่" : "เข้าสู่ระบบที่นี่"}
          </button>
        </div>

        <div className="mt-6 rounded-xl bg-zinc-900/40 p-4 border border-zinc-800/50 text-center">
          <p className="text-[11px] text-zinc-500">
            👤 <span className="font-semibold text-emerald-400/90">คนที่ 1 กำลังพัฒนา:</span> ระบบ Authentication & User Access Control
          </p>
        </div>
      </div>
    </div>
  );
}
