'use client';

export default function ProfilePage() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-zinc-100 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">ข้อมูลส่วนตัว</h1>
      <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — จัดการโปรไฟล์ผู้ใช้, ประวัติแพ้ยา, โรคประจำตัว</p>
      <div className="mt-6 p-4 bg-sky-50 rounded-xl border border-sky-100">
        <p className="text-sm text-sky-700">👤 รับผิดชอบโดย: <strong>ฟีม</strong></p>
      </div>
    </div>
  );
}
