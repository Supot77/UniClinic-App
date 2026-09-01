'use client';

export default function MedicalRecordsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">ประวัติการรักษา</h1>
        <p className="text-zinc-500 mt-1">บันทึกผลการตรวจวินิจฉัย และรายการยาที่สั่งจ่าย</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — Medical Records, Diagnosis, Prescription</p>
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-sm text-emerald-700">📋 รับผิดชอบโดย: <strong>ปาย</strong></p>
        </div>
      </div>
    </div>
  );
}
