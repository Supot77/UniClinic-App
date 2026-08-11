"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#f5f5f7] px-6 py-16">
      <div className="w-full max-w-[400px] bg-white border border-[#e0e0e0] rounded-[18px] p-8 space-y-6">
        <div className="text-center space-y-2">
          {/* Logo / Badge */}
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc] mb-2 text-2xl">
            👤
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1d1d1f] apple-tight-headline">
            {isLogin ? "ลงชื่อเข้าใช้งาน" : "สร้างบัญชีผู้ใช้ใหม่"}
          </h1>
          <p className="text-xs text-zinc-500 font-normal">
            WU Clinic Booking Account
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 pl-1">
                ชื่อ-นามสกุล
              </label>
              <input 
                type="text" 
                placeholder="กรอกชื่อและนามสกุลของคุณ" 
                className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs text-[#1d1d1f] placeholder-zinc-400 outline-none transition focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 pl-1">
              อีเมลผู้ใช้งาน
            </label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs text-[#1d1d1f] placeholder-zinc-400 outline-none transition focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 pl-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                รหัสผ่าน
              </label>
              {isLogin && (
                <a href="#" className="text-[11px] text-[#0066cc] hover:underline font-semibold">ลืมรหัสผ่าน?</a>
              )}
            </div>
            <input 
              type="password" 
              placeholder="ป้อนรหัสผ่าน" 
              className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs text-[#1d1d1f] placeholder-zinc-400 outline-none transition focus:border-[#0066cc] focus:ring-1 focus:ring-[#0066cc]"
            />
          </div>

          <button 
            type="submit" 
            className="apple-btn-active w-full rounded-full bg-[#0066cc] py-2.5 text-xs font-semibold text-white transition hover:bg-[#0071e3]"
          >
            {isLogin ? "ลงชื่อเข้าใช้" : "ลงทะเบียน"}
          </button>
        </form>

        <div className="border-t border-zinc-100 pt-6 text-center text-xs text-zinc-500 font-normal">
          <span className="mr-1.5">
            {isLogin ? "หากคุณยังไม่มีบัญชีผู้ใช้งาน?" : "หากคุณมีบัญชีผู้ใช้งานอยู่แล้ว?"}
          </span>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="font-semibold text-[#0066cc] hover:underline"
          >
            {isLogin ? "ลงทะเบียนบัญชีใหม่" : "ลงชื่อเข้าใช้งาน"}
          </button>
        </div>

        {/* Developer Attribution Card */}
        <div className="rounded-[11px] bg-[#f5f5f7] p-3 text-center border border-zinc-150">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-normal">
            ⚙️ <span className="font-semibold text-[#0066cc]">ผู้พัฒนาคนที่ 1 (Feem):</span> ระบบจัดการสิทธิ์การเข้าใช้งาน (Authentication) และการจัดระดับบัญชีความปลอดภัย
          </p>
        </div>
      </div>
    </div>
  );
}
