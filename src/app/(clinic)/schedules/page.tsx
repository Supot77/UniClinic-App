'use client';

export default function SchedulesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">ตารางเวรแพทย์</h1>
        <p className="text-zinc-500 mt-1">จัดการช่วงเวลาตรวจของแพทย์ (Appointment Slots)</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — สร้างและจัดการรอบเวลาตรวจ, ดูภาพรวมปฏิทิน</p>
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-sm text-amber-700">📋 รับผิดชอบโดย: <strong>ช้อป</strong></p>
        </div>
      </div>
    </div>
  );
}
