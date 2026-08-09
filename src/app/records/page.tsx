"use client";

import React, { useState } from "react";

export default function RecordsPage() {
  const [activeRecord, setActiveRecord] = useState<number | null>(null);

  const medicalRecords = [
    {
      id: 1,
      date: "08 ส.ค. 2026",
      type: "ตรวจสุขภาพประจำปี",
      doctor: "นพ. สมชาย รักดี",
      diagnosis: "ความดันโลหิตปกติ สุขภาพแข็งแรงดี แนะนำให้ออกกำลังกายอย่างสม่ำเสมอเพื่อคงสภาพร่างกาย",
      vitals: { temp: "36.5 °C", bp: "120/80 mmHg", weight: "68 kg", height: "175 cm" }
    },
    {
      id: 2,
      date: "25 ก.ค. 2026",
      type: "อาการไข้หวัดทั่วไป",
      doctor: "พญ. สมศรี เรียนรู้",
      diagnosis: "ไข้หวัดจากการเปลี่ยนฤดู คออักเสบเล็กน้อย พักผ่อนและทานยาลดไข้ตามสั่ง",
      vitals: { temp: "38.2 °C", bp: "118/75 mmHg", weight: "67.5 kg", height: "175 cm" }
    },
    {
      id: 3,
      date: "10 มิ.ย. 2026",
      type: "ตรวจรักษาภูมิแพ้ผิวหนัง",
      doctor: "นพ. กิตติภพ เพิ่มพูน",
      diagnosis: "มีผื่นภูมิแพ้สัมผัสสัมผัสสารเคมีหรือฝุ่นละออง ได้จ่ายยาแก้แพ้และยาทาภายนอก",
      vitals: { temp: "36.6 °C", bp: "122/82 mmHg", weight: "68.2 kg", height: "175 cm" }
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">ระบบบันทึกประวัติการรักษา</h1>
            <p className="mt-2 text-zinc-400">ประวัติการเข้าตรวจรักษา สัญญาณชีพ และข้อมูลการวินิจฉัยโรค</p>
          </div>
          <button className="self-start rounded-xl bg-purple-600/10 border border-purple-500/20 px-4 py-2.5 text-sm font-semibold text-purple-400 hover:bg-purple-600/20">
            📥 ดาวน์โหลดรายงานทั้งหมด
          </button>
        </div>

        <div className="space-y-4">
          {medicalRecords.map((record) => (
            <div 
              key={record.id}
              className={`rounded-3xl border transition-all ${
                activeRecord === record.id
                  ? "border-purple-500 bg-purple-500/[0.03]"
                  : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700"
              }`}
            >
              <div 
                onClick={() => setActiveRecord(activeRecord === record.id ? null : record.id)}
                className="flex cursor-pointer items-center justify-between p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-400 text-2xl">
                    📁
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{record.type}</h3>
                    <p className="text-xs text-zinc-500">วันที่ตรวจ: {record.date} • {record.doctor}</p>
                  </div>
                </div>
                <div className="text-zinc-500">
                  {activeRecord === record.id ? "▲" : "▼"}
                </div>
              </div>

              {activeRecord === record.id && (
                <div className="border-t border-zinc-800 p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">สัญญาณชีพ (Vitals)</h4>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800/60 text-center">
                        <span className="block text-xs text-zinc-500">อุณหภูมิร่างกาย</span>
                        <span className="mt-1 block text-lg font-bold text-white">{record.vitals.temp}</span>
                      </div>
                      <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800/60 text-center">
                        <span className="block text-xs text-zinc-500">ความดันโลหิต</span>
                        <span className="mt-1 block text-lg font-bold text-white">{record.vitals.bp}</span>
                      </div>
                      <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800/60 text-center">
                        <span className="block text-xs text-zinc-500">น้ำหนัก</span>
                        <span className="mt-1 block text-lg font-bold text-white">{record.vitals.weight}</span>
                      </div>
                      <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800/60 text-center">
                        <span className="block text-xs text-zinc-500">ส่วนสูง</span>
                        <span className="mt-1 block text-lg font-bold text-white">{record.vitals.height}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">ผลการวินิจฉัยและการรักษา</h4>
                    <p className="text-sm leading-relaxed text-zinc-300 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                      {record.diagnosis}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-center">
          <p className="text-[11px] text-zinc-500">
            📝 <span className="font-semibold text-purple-400">คนที่ 3 กำลังพัฒนา:</span> ระบบจัดเก็บและเรียกดูประวัติทางการแพทย์ ผลตรวจร่างกาย และประวัติผู้ป่วย
          </p>
        </div>
      </div>
    </div>
  );
}
