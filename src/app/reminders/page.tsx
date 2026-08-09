"use client";

import React, { useState } from "react";

export default function RemindersPage() {
  const [reminders, setReminders] = useState([
    { id: 1, title: "จองตรวจคิวแพทย์: นพ. สมชาย รักดี", type: "นัดหมาย", time: "พรุ่งนี้ เวลา 09:00 น.", enabled: true },
    { id: 2, title: "ทานยาปฏิชีวนะ Amoxicillin 500mg", type: "รับประทานยา", time: "ทุกวัน เวลา 08:00, 12:00, 18:00 น.", enabled: true },
    { id: 3, title: "ทานยาลดไข้ Paracetamol 500mg", type: "รับประทานยา", time: "ทุกๆ 4-6 ชั่วโมง เมื่อมีอาการปวดศีรษะ", enabled: false },
    { id: 4, title: "ตรวจความดันโลหิตและสุขภาพหัวใจรายสัปดาห์", type: "ติดตามอาการ", time: "ทุกวันอาทิตย์ เวลา 07:30 น.", enabled: true }
  ]);

  const toggleReminder = (id: number) => {
    setReminders(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ระบบแจ้งเตือน (Reminders)</h1>
          <p className="mt-2 text-zinc-400">ระบบตั้งค่าการแจ้งเตือนคิวจองแพทย์ ยารักษาโรค และกำหนดการดูแลสุขภาพ</p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/20 p-6 backdrop-blur-xl">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
              <span>🔔</span> รายการแจ้งเตือนของฉัน
            </h2>
            <button className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-3.5 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/20">
              + เพิ่มการแจ้งเตือนใหม่
            </button>
          </div>

          <div className="divide-y divide-zinc-900">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                      {reminder.type}
                    </span>
                    <h3 className={`text-sm font-semibold transition ${reminder.enabled ? "text-white" : "text-zinc-500 line-through"}`}>
                      {reminder.title}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <span>⏰</span> {reminder.time}
                  </p>
                </div>

                <button 
                  onClick={() => toggleReminder(reminder.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reminder.enabled ? "bg-orange-500" : "bg-zinc-800"
                  }`}
                >
                  <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reminder.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-center">
          <p className="text-[11px] text-zinc-500">
            🔔 <span className="font-semibold text-orange-400">คนที่ 5 กำลังพัฒนา:</span> ระบบแจ้งเตือนผ่าน SMS / Line Notify, เตือนกินยา และเตือนวันนัด
          </p>
        </div>
      </div>
    </div>
  );
}
