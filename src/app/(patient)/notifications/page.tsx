'use client';

export default function NotificationsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">ศูนย์แจ้งเตือน</h1>
        <p className="text-zinc-500 mt-1">ข้อความแจ้งเตือนภายในระบบ</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — In-app Notifications, Broadcast, Mark as read</p>
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700">📋 รับผิดชอบโดย: <strong>เฮิร์บ</strong></p>
        </div>
      </div>
    </div>
  );
}
