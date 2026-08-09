"use client";

import React, { useState } from "react";

export default function AppointmentsPage() {
  const [selectedDoc, setSelectedDoc] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const doctors = [
    { id: 1, name: "นพ. สมชาย รักดี", specialty: "หมอทั่วไป", image: "👨‍⚕️" },
    { id: 2, name: "พญ. สมศรี เรียนรู้", specialty: "กุมารแพทย์", image: "👩‍⚕️" },
    { id: 3, name: "นพ. กิตติภพ เพิ่มพูน", specialty: "แพทย์ผิวหนัง", image: "👨‍⚕️" },
  ];

  const times = ["09:00 - 10:00", "10:30 - 11:30", "13:00 - 14:00", "14:30 - 15:30", "16:00 - 17:00"];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">ระบบจองคิวตรวจรักษา</h1>
          <p className="mt-2 text-zinc-400">เลือกแพทย์และช่วงเวลาที่ต้องการเข้าตรวจรักษา ณ WU Clinic</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Step 1: Select Doctor */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">1</span>
                เลือกแพทย์เฉพาะทาง
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc.name)}
                    className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      selectedDoc === doc.name
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <span className="text-3xl">{doc.image}</span>
                    <div>
                      <h3 className="font-semibold text-white">{doc.name}</h3>
                      <p className="text-xs text-zinc-400">{doc.specialty}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Date & Time */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">2</span>
                เลือกเวลาเข้าตรวจ
              </h2>
              <div className="flex flex-wrap gap-3">
                {times.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-xl border px-4 py-2.5 text-sm transition ${
                      selectedTime === time
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white mb-4">ข้อมูลการจองของคุณ</h2>
              <div className="space-y-4 text-sm text-zinc-400">
                <div className="flex justify-between py-2 border-b border-zinc-800/80">
                  <span>แพทย์:</span>
                  <span className="font-medium text-white">{selectedDoc || "ยังไม่ได้เลือก"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/80">
                  <span>วันเข้าตรวจ:</span>
                  <span className="font-medium text-white">วันนี้ (ระบุวันได้ทีหลัง)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800/80">
                  <span>เวลา:</span>
                  <span className="font-medium text-white">{selectedTime || "ยังไม่ได้เลือก"}</span>
                </div>
              </div>
              <button
                disabled={!selectedDoc || !selectedTime}
                className="w-full mt-6 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ยืนยันการจองคิว
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-center">
              <p className="text-[11px] text-zinc-500">
                📅 <span className="font-semibold text-blue-400">คนที่ 2 กำลังพัฒนา:</span> ระบบจองคิวแพทย์, คิวว่าง และการยืนยันการนัดหมาย
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
