"use client";

import React from "react";

export default function PrescriptionsPage() {
  const activePrescriptions = [
    {
      id: 1,
      medicineName: "Amoxicillin 500mg",
      category: "ยาปฏิชีวนะ (Antibiotics)",
      dosage: "1 เม็ด วันละ 3 ครั้ง หลังอาหาร",
      timing: { morning: true, afternoon: true, evening: true, beforeBed: false },
      quantity: "15 เม็ด",
      instructions: "รับประทานติดต่อกันจนหมดตามแพทย์สั่งเพื่อหลีกเลี่ยงการดื้อยา",
      doctor: "พญ. สมศรี เรียนรู้"
    },
    {
      id: 2,
      medicineName: "Paracetamol 500mg",
      category: "ยาลดไข้ บรรเทาปวด",
      dosage: "1-2 เม็ด ทุก 4-6 ชั่วโมง เมื่อมีอาการไข้หรือปวด",
      timing: { morning: true, afternoon: true, evening: true, beforeBed: true },
      quantity: "20 เม็ด",
      instructions: "ไม่ควรทานติดต่อกันเกิน 5 วัน และระวังห้ามดื่มเครื่องดื่มแอลกอฮอล์",
      doctor: "นพ. สมชาย รักดี"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ระบบใบสั่งยาและการสั่งจ่ายยา</h1>
          <p className="mt-2 text-zinc-400">ประวัติการสั่งจ่ายยา ข้อมูลการทานยา และวิธีการใช้ยาอย่างปลอดภัย</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-teal-400 flex items-center gap-2">
            <span>💊</span> ยาที่กำลังรับประทานอยู่ในปัจจุบัน
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {activePrescriptions.map((prescription) => (
              <div 
                key={prescription.id} 
                className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-5 backdrop-blur-xl hover:border-teal-500/20 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full mb-2">
                      {prescription.category}
                    </span>
                    <h3 className="text-xl font-bold text-white">{prescription.medicineName}</h3>
                  </div>
                  <span className="text-xs text-zinc-500">จำนวน: {prescription.quantity}</span>
                </div>

                <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800/60 text-sm">
                  <div>
                    <span className="text-zinc-500 text-xs">คำแนะนำการทานยา:</span>
                    <p className="text-zinc-200 mt-0.5">{prescription.dosage}</p>
                  </div>
                  
                  <div>
                    <span className="text-zinc-500 text-xs block mb-1">ช่วงเวลาที่ต้องทาน:</span>
                    <div className="flex gap-2">
                      {Object.entries(prescription.timing).map(([key, val]) => (
                        <span 
                          key={key} 
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            val 
                              ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
                              : "bg-zinc-800/40 text-zinc-600 border border-zinc-800/50"
                          }`}
                        >
                          {key === "morning" && "เช้า"}
                          {key === "afternoon" && "กลางวัน"}
                          {key === "evening" && "เย็น"}
                          {key === "beforeBed" && "ก่อนนอน"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 space-y-1">
                  <p><span className="font-semibold text-zinc-500">หมายเหตุแพทย์:</span> {prescription.instructions}</p>
                  <p className="text-[11px] text-zinc-500">สั่งจ่ายโดย: {prescription.doctor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 text-center">
          <p className="text-[11px] text-zinc-500">
            💊 <span className="font-semibold text-teal-400">คนที่ 4 กำลังพัฒนา:</span> ระบบแพทย์ออกใบสั่งยาอิเล็กทรอนิกส์ วิธีใช้งานยา และประวัติรับประทานยา
          </p>
        </div>
      </div>
    </div>
  );
}
