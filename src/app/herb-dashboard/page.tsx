"use client";

import React, { useState } from "react";

export default function HerbDashboardPage() {
  const [selectedFilter, setSelectedFilter] = useState("ทั้งหมด");

  const kpis = [
    { label: "คิวตรวจที่จองวันนี้", value: "14 คิว", change: "+12%", trend: "up", icon: "📅" },
    { label: "แจ้งเตือนส่งออกแล้ว", value: "184 ครั้ง", change: "ใช้งานปกติ", trend: "stable", icon: "🔔" },
    { label: "ยาใกล้หมดในคลัง", value: "2 รายการ", change: "ควรสั่งเพิ่ม", trend: "down", icon: "📦" },
    { label: "สถานะระบบหลัก", value: "ออนไลน์", change: "100% Uptime", trend: "stable", icon: "⚡" },
  ];

  const notifications = [
    {
      id: 1,
      title: "ส่งการแจ้งเตือนเตือนทานยาสำเร็จ",
      desc: "ส่ง SMS ไปยังคนไข้หมายเลข 081-xxx-5678 สำหรับยา Amoxicillin 500mg",
      type: "การแจ้งเตือน",
      time: "5 นาทีที่แล้ว",
      status: "สำเร็จ",
    },
    {
      id: 2,
      title: "ระบบสต็อกเวชภัณฑ์แจ้งเตือน",
      desc: "ยา Ibuprofen 400mg อยู่ในระดับสต็อกวิกฤต (คงเหลือ 80 เม็ด, ขั้นต่ำ 200 เม็ด)",
      type: "ระบบสต็อก",
      time: "20 นาทีที่แล้ว",
      status: "เตือนภัย",
    },
    {
      id: 3,
      title: "ยืนยันคิวจองพบแพทย์สำเร็จ",
      desc: "ส่ง LINE Notify ไปยังคุณจิรเดช ยืนยันนัดพบ พญ. สมศรี เวลา 09:00 น.",
      type: "การแจ้งเตือน",
      time: "1 ชั่วโมงที่แล้ว",
      status: "สำเร็จ",
    },
    {
      id: 4,
      title: "สำรองฐานข้อมูลระบบเสร็จสิ้น",
      desc: "ระบบทำการ Backup ฐานข้อมูลประวัติการรักษาและบัญชีอัตโนมัติสำเร็จ",
      type: "ระบบหลัก",
      time: "02:00 น. วันนี้",
      status: "สำเร็จ",
    },
  ];

  const filteredAlerts = selectedFilter === "ทั้งหมด"
    ? notifications
    : notifications.filter((n) => n.type === selectedFilter);

  return (
    <div className="min-h-[85vh] bg-[#f5f5f7] py-16 px-6 flex flex-col items-center">
      <div className="w-full max-w-[980px] space-y-12">
        {/* Editorial Header */}
        <div className="text-left space-y-2 pb-4 border-b border-zinc-200/60">
          <p className="text-[12px] font-bold uppercase tracking-wider text-zinc-500">ระบบแดชบอร์ดและศูนย์แจ้งเตือน</p>
          <h1 className="text-3xl md:text-[40px] font-semibold text-[#1d1d1f] tracking-tight leading-[1.1] apple-tight-headline">
            แดชบอร์ดและการแจ้งเตือนกลาง.
          </h1>
          <p className="text-zinc-500 text-sm md:text-base font-normal max-w-xl">
            แสดงสถานะภาพรวมการจองคิว สต็อกเวชภัณฑ์ และประวัติการทำงานของระบบแจ้งเตือนแบบเรียลไทม์ที่ WU Clinic
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white border border-[#e0e0e0] rounded-2xl p-5 space-y-3.5 hover:scale-[1.01] transition-transform duration-300">
              <div className="flex justify-between items-center text-xl">
                <span>{k.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  k.trend === "up" ? "bg-emerald-50 text-emerald-600" :
                  k.trend === "down" ? "bg-rose-50 text-rose-600" : "bg-zinc-50 text-zinc-500"
                }`}>
                  {k.change}
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-wide">{k.label}</p>
                <p className="text-2xl font-bold text-[#1d1d1f] tracking-tight font-sans">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Logs Card */}
        <div className="bg-white border border-[#e0e0e0] rounded-[18px] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-zinc-100">
            <h2 className="text-[17px] font-bold text-[#1d1d1f] flex items-center gap-2">
              <span>📊</span> กิจกรรมของระบบล่าสุด
            </h2>
            <div className="flex gap-1.5">
              {["ทั้งหมด", "การแจ้งเตือน", "ระบบสต็อก", "ระบบหลัก"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                    selectedFilter === filter
                      ? "bg-[#0a2540] border-[#0a2540] text-white"
                      : "bg-[#fafafc] border-zinc-200 text-zinc-650 hover:border-zinc-300"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-zinc-100 font-normal">
            {filteredAlerts.map((item) => (
              <div key={item.id} className="flex justify-between items-start py-4 first:pt-0 last:pb-0">
                <div className="space-y-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-500">
                      {item.type}
                    </span>
                    <h3 className="text-xs font-semibold text-[#1d1d1f]">{item.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 font-light">{item.desc}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    item.status === "สำเร็จ" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                  }`}>
                    {item.status}
                  </span>
                  <p className="text-[9px] text-zinc-400 font-mono">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Attribution Card */}
        <div className="rounded-[18px] bg-white border border-[#e0e0e0] p-6 text-center">
          <p className="text-[10px] text-zinc-500 leading-relaxed font-normal">
            ⚙️ <span className="font-semibold text-[#0066cc]">ผู้พัฒนาคนที่ 6 (Herb):</span> ระบบแดชบอร์ดหลักสำหรับวิเคราะห์และสรุปผลการดำเนินงาน ร่วมกับระบบประสานศูนย์กลางการแจ้งเตือน (Notification Center & Dashboard)
          </p>
        </div>
      </div>
    </div>
  );
}
