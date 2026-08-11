"use client";

import React, { useState } from "react";

export default function RemindersPage() {
  const [reminders, setReminders] = useState([
    { id: 1, title: "นัดหมายตรวจรักษา: นพ. สมชาย รักดี", type: "นัดหมายแพทย์", time: "วันพรุ่งนี้ เวลา 09:00 น.", enabled: true },
    { id: 2, title: "ทานยาปฏิชีวนะ Amoxicillin 500mg", type: "รับประทานยา", time: "ทุกวัน เวลา 08:00, 12:00, 18:00 น.", enabled: true },
    { id: 3, title: "ทานยาลดไข้ Paracetamol 500mg", type: "รับประทานยา", time: "ทุกๆ 4-6 ชั่วโมง เมื่อมีอาการปวดศีรษะหรือมีไข้", enabled: false },
    { id: 4, title: "นัดติดตามผื่นภูมิแพ้สัมผัสกับแพทย์เฉพาะทาง", type: "นัดหมายแพทย์", time: "วันศุกร์ที่ 14 ส.ค. 2026 เวลา 13:00 น.", enabled: true }
  ]);

  const toggleReminder = (id: number) => {
    setReminders(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  return (
    <div className="min-h-[85vh] bg-[#f5f5f7] py-16 px-6 flex flex-col items-center">
      <div className="w-full max-w-[800px] space-y-12">
        {/* Editorial Header */}
        <div className="text-left space-y-2 pb-4 border-b border-zinc-200/60">
          <p className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">ระบบเตือนทานยาและนัดหมาย</p>
          <h1 className="text-3xl md:text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1] apple-tight-headline">
            การแจ้งเตือนและการดูแลตนเอง.
          </h1>
          <p className="text-zinc-500 text-sm md:text-base font-normal max-w-xl">
            ตั้งค่าระบบการส่งข้อความแจ้งเตือนอัตโนมัติผ่าน LINE Notify หรือ SMS เพื่อเตือนเมื่อถึงกำหนดเวลาทานยา หรือเตือนเวลานัดหมายเข้าพบแพทย์ล่วงหน้า
          </p>
        </div>

        {/* Reminders Container Card (rounded.lg: 18px) */}
        <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
            <h2 className="text-[17px] font-bold text-[#1d1d1f] flex items-center gap-2">
              <span>🔔</span> ตั้งค่าและเปิดใช้งานการแจ้งเตือน
            </h2>
            <button className="apple-btn-active bg-[#fafafc] border border-zinc-200 text-[#0066cc] text-xs font-semibold px-4 py-2 rounded-full hover:bg-zinc-50 transition">
              + เพิ่มการแจ้งเตือน
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex justify-between items-center py-5 first:pt-0 last:pb-0">
                <div className="space-y-1.5 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">
                      {reminder.type}
                    </span>
                    <h3 className={`text-sm font-semibold transition-all ${
                      reminder.enabled ? "text-[#1d1d1f]" : "text-zinc-400 line-through"
                    }`}>
                      {reminder.title}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5 font-normal">
                    <span>⏰</span> {reminder.time}
                  </p>
                </div>

                {/* Elegant Apple Toggle Switch (Action Blue) */}
                <button 
                  onClick={() => toggleReminder(reminder.id)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 outline-none ${
                    reminder.enabled ? "bg-[#0066cc]" : "bg-zinc-200"
                  }`}
                >
                  <span 
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      reminder.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Attribution Card */}
        <div className="rounded-[18px] bg-white border border-[#e0e0e0] p-6 text-center">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-normal">
            🔔 <span className="font-semibold text-[#0066cc]">ผู้พัฒนาคนที่ 5 (Glong):</span> ระบบตั้งเวลากลางสำหรับการเตือนทานยา, ประสานกับระบบ LINE Notify API และระบบแจ้งเตือนนัดหมาย
          </p>
        </div>
      </div>
    </div>
  );
}
