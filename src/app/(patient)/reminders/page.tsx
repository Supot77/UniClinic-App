'use client';

export default function RemindersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">แจ้งเตือนทานยา</h1>
        <p className="text-zinc-500 mt-1">ตั้งเวลาเตือนกินยา บันทึกสถานะการกินยาแต่ละมื้อ</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — สร้าง/แก้ไขรอบเตือน, ประวัติการกินยา</p>
        <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-sm text-orange-700">📋 รับผิดชอบโดย: <strong>กลอง</strong></p>
        </div>
      </div>
    </div>
  );
}
