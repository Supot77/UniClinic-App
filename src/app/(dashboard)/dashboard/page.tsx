'use client';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">แดชบอร์ด</h1>
        <p className="text-zinc-500 mt-1">สรุปสถิติภาพรวมคลินิก</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'นัดหมายวันนี้', value: '—', color: 'sky' },
          { label: 'ผู้ป่วยทั้งหมด', value: '—', color: 'emerald' },
          { label: 'ยาใกล้หมดสต๊อก', value: '—', color: 'amber' },
          { label: 'แจ้งเตือนใหม่', value: '—', color: 'indigo' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6">
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-8">
        <p className="text-zinc-500">หน้านี้อยู่ระหว่างการพัฒนา — กราฟสถิติ, จำนวนนัดหมาย, สถิติผู้ป่วย</p>
        <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700">📋 รับผิดชอบโดย: <strong>เฮิร์บ</strong></p>
        </div>
      </div>
    </div>
  );
}
