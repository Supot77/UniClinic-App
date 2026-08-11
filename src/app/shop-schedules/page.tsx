"use client";

import React, { useState } from "react";

export default function ShopSchedulesPage() {
  const [selectedDept, setSelectedDept] = useState("ทั้งหมด");

  const depts = ["ทั้งหมด", "อายุรกรรมทั่วไป", "กุมารเวชกรรม", "ผิวหนังและภูมิแพ้"];

  const schedules = [
    {
      id: 1,
      doctor: "นพ. สมชาย รักดี",
      specialty: "อายุรกรรมทั่วไป (General Medicine)",
      dept: "อายุรกรรมทั่วไป",
      days: ["จันทร์", "พุธ", "ศุกร์"],
      hours: "09:00 - 16:00 น.",
      room: "ห้องตรวจ 1",
      status: "ปฏิบัติงานตามปกติ",
    },
    {
      id: 2,
      doctor: "พญ. สมศรี เรียนรู้",
      specialty: "กุมารเวชกรรม (Pediatrics)",
      dept: "กุมารเวชกรรม",
      days: ["อังคาร", "พฤหัสบดี"],
      hours: "09:00 - 15:00 น.",
      room: "ห้องตรวจ 3",
      status: "ปฏิบัติงานตามปกติ",
    },
    {
      id: 3,
      doctor: "นพ. กิตติภพ เพิ่มพูน",
      specialty: "ตจวิทยา (Dermatology)",
      dept: "ผิวหนังและภูมิแพ้",
      days: ["จันทร์", "อังคาร", "พฤหัสบดี"],
      hours: "13:00 - 17:00 น.",
      room: "ห้องตรวจ 4",
      status: "ปฏิบัติงานตามปกติ",
    },
    {
      id: 4,
      doctor: "พญ. นลินี ทวีสุข",
      specialty: "อายุรกรรมทั่วไป (General Medicine)",
      dept: "อายุรกรรมทั่วไป",
      days: ["อังคาร", "พุธ", "พฤหัสบดี"],
      hours: "08:30 - 12:00 น.",
      room: "ห้องตรวจ 2",
      status: "ลาพักร้อน (มีแพทย์เวรแทน)",
    },
  ];

  const filteredSchedules = selectedDept === "ทั้งหมด"
    ? schedules
    : schedules.filter((s) => s.dept === selectedDept);

  return (
    <div className="min-h-[85vh] bg-[#f5f5f7] py-16 px-6 flex flex-col items-center">
      <div className="w-full max-w-[980px] space-y-12">
        {/* Editorial Header */}
        <div className="text-left space-y-2 pb-4 border-b border-zinc-200/60">
          <p className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">ตารางเวรและแผนกบริการ</p>
          <h1 className="text-3xl md:text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1] apple-tight-headline">
            ตารางเวลาปฏิบัติงานของแพทย์.
          </h1>
          <p className="text-zinc-500 text-sm md:text-base font-normal max-w-xl">
            ตรวจสอบวันเวลาทำการและแผนกบริการของแพทย์เฉพาะทางแต่ละท่านที่ห้องตรวจอาคารศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`apple-btn-active px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                selectedDept === d
                  ? "bg-[#0a2540] border-[#0a2540] text-white"
                  : "bg-white border-zinc-200 text-zinc-650 hover:border-zinc-350"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Schedule Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredSchedules.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 flex flex-col justify-between hover:scale-[1.01] transition-all duration-300 space-y-6"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-[#0066cc] bg-[#0066cc]/5 px-2.5 py-1 rounded-full mb-2">
                      {item.dept}
                    </span>
                    <h3 className="text-lg font-bold text-[#1d1d1f]">{item.doctor}</h3>
                    <p className="text-xs text-zinc-500 font-normal mt-0.5">{item.specialty}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.status.includes("ปกติ") ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="bg-[#fafafc] border border-zinc-200/60 p-4 rounded-xl space-y-3.5 text-xs font-normal">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">วันปฏิบัติงาน:</span>
                    <div className="flex gap-1.5">
                      {item.days.map((day) => (
                        <span key={day} className="font-bold text-[#1d1d1f] bg-zinc-100 px-2 py-0.5 rounded">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">เวลาทำการ:</span>
                    <span className="font-bold text-[#1d1d1f]">{item.hours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">ห้องตรวจ:</span>
                    <span className="font-bold text-[#0066cc]">{item.room}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-4 flex justify-between items-center text-[11px] text-zinc-500">
                <span>ตารางประจำเดือน สิงหาคม 2026</span>
                <a
                  href="/pai-appointments"
                  className="font-semibold text-[#0066cc] hover:underline flex items-center gap-1"
                >
                  จองคิวตรวจ
                  <span>→</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Developer Attribution Card */}
        <div className="rounded-[18px] bg-white border border-[#e0e0e0] p-6 text-center">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-normal">
            📅 <span className="font-semibold text-[#0066cc]">ผู้พัฒนาคนที่ 2 (Shop):</span> ระบบจัดการตารางเวรแพทย์ ข้อมูลแผนกบริการทางการแพทย์ และการประสานเวลาทำงาน (Doctor Schedule & Departments)
          </p>
        </div>
      </div>
    </div>
  );
}
