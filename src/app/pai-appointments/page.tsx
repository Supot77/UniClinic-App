"use client";

import React, { useState } from "react";

export default function AppointmentsPage() {
  const [selectedDoc, setSelectedDoc] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const doctors = [
    { id: 1, name: "นพ. สมชาย รักดี", specialty: "แพทย์ทั่วไป (General Practitioner)", image: "👨‍⚕️" },
    { id: 2, name: "พญ. สมศรี เรียนรู้", specialty: "กุมารแพทย์ (Pediatrician)", image: "👩‍⚕️" },
    { id: 3, name: "นพ. กิตติภพ เพิ่มพูน", specialty: "แพทย์ผิวหนัง (Dermatologist)", image: "👨‍⚕️" },
  ];

  const times = ["09:00 - 10:00", "10:30 - 11:30", "13:00 - 14:00", "14:30 - 15:30", "16:00 - 17:00"];

  return (
    <div className="min-h-[85vh] bg-[#f5f5f7] py-16 px-6 flex flex-col items-center">
      <div className="w-full max-w-[980px] space-y-12">
        {/* Editorial Header */}
        <div className="text-left space-y-2">
          <p className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">ขั้นตอนง่ายๆ ใน 2 ขั้นตอน</p>
          <h1 className="text-3xl md:text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1] apple-tight-headline">
            ระบบจองคิวนัดหมายออนไลน์.
          </h1>
          <p className="text-zinc-500 text-sm md:text-base font-normal max-w-xl">
            เลือกแพทย์ผู้เชี่ยวชาญเฉพาะทางที่ต้องการรับคำปรึกษา และช่วงเวลาที่คุณสะดวกในการเข้าตรวจรักษา ณ อาคารศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์
          </p>
        </div>

        {/* Main Work Area */}
        <div className="grid gap-8 md:grid-cols-3 items-start">
          <div className="md:col-span-2 space-y-6">
            
            {/* Step 1 Card (rounded.lg: 18px) */}
            <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 space-y-4">
              <h2 className="text-[17px] font-bold text-[#1d1d1f] flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc] text-[11px] font-bold">1</span>
                เลือกแพทย์ผู้ตรวจรักษา
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc.name)}
                    className={`apple-btn-active flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                      selectedDoc === doc.name
                        ? "border-[#0066cc] bg-[#0066cc]/5 text-[#1d1d1f]"
                        : "border-zinc-200 bg-[#fafafc] hover:border-zinc-300"
                    }`}
                  >
                    <span className="text-3xl">{doc.image}</span>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold text-[#1d1d1f]">{doc.name}</h3>
                      <p className="text-[11px] text-zinc-500 font-normal leading-tight">{doc.specialty}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 Card (rounded.lg: 18px) */}
            <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 space-y-4">
              <h2 className="text-[17px] font-bold text-[#1d1d1f] flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066cc]/10 text-[#0066cc] text-[11px] font-bold">2</span>
                เลือกช่วงเวลานัดหมาย
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`apple-btn-active px-4 py-2.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedTime === time
                        ? "bg-[#0066cc] border-[#0066cc] text-white"
                        : "bg-[#fafafc] border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Sticky Summary Card (rounded.lg: 18px) */}
          <div className="space-y-6">
            <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 space-y-4">
              <h2 className="text-[17px] font-bold text-[#1d1d1f]">สรุปรายการจอง</h2>
              <div className="divide-y divide-zinc-100 text-xs font-normal">
                <div className="flex justify-between py-3">
                  <span className="text-zinc-500">สถานที่ตรวจ:</span>
                  <span className="font-semibold text-[#1d1d1f]">WU Clinic ชั้น 1</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-zinc-500">แพทย์:</span>
                  <span className="font-semibold text-[#0066cc]">{selectedDoc || "ยังไม่ได้เลือก"}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-zinc-500">เวลานัด:</span>
                  <span className="font-semibold text-[#1d1d1f]">{selectedTime || "ยังไม่ได้เลือก"}</span>
                </div>
              </div>
              
              <button
                disabled={!selectedDoc || !selectedTime}
                className="apple-btn-active w-full rounded-full bg-[#0066cc] py-2.5 text-xs font-semibold text-white transition hover:bg-[#0071e3] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ยืนยันการจองคิวออนไลน์
              </button>
            </div>

            {/* Attribution Widget */}
            <div className="rounded-[11px] bg-white border border-[#e0e0e0] p-4 text-center">
              <p className="text-[10px] text-zinc-500 leading-relaxed font-normal">
                📅 <span className="font-semibold text-[#0066cc]">ผู้พัฒนาคนที่ 3 (Pai):</span> ระบบจองคิวพบแพทย์ออนไลน์ (Clinic Appointments) และการจัดการนัดหมายเข้าตรวจรักษา
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
