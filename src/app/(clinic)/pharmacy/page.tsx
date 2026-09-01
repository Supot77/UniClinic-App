'use client';

export default function PharmacyPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">คลังยาและเวชภัณฑ์</h1>
        <p className="text-zinc-500 mt-1">จัดการยาในคลัง ตรวจสอบสต๊อก จ่ายยา บันทึก Inventory Logs</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — CRUD ยา, จ่ายยาตัดสต๊อก, ประวัติ Inventory Logs</p>
        <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-sm text-purple-700">📋 รับผิดชอบโดย: <strong>กัญจน์</strong></p>
        </div>
      </div>
    </div>
  );
}
