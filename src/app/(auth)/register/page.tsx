'use client';

export default function RegisterPage() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-zinc-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">สมัครสมาชิก</h1>
        <p className="text-zinc-500 mt-2">สร้างบัญชีเพื่อเข้าใช้งานระบบ</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">ชื่อ-นามสกุล</label>
          <input type="text" placeholder="ชื่อ นามสกุล" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">รหัสนักศึกษา/บุคลากร</label>
          <input type="text" placeholder="6XXXXXXXXX" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input type="email" placeholder="example@wu.ac.th" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">เบอร์โทรศัพท์</label>
          <input type="tel" placeholder="08X-XXX-XXXX" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
          <input type="password" placeholder="อย่างน้อย 8 ตัวอักษร" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <button className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition">
          สมัครสมาชิก
        </button>
        <p className="text-center text-sm text-zinc-500">
          มีบัญชีแล้ว? <a href="/login" className="text-sky-500 font-medium hover:underline">เข้าสู่ระบบ</a>
        </p>
      </div>
    </div>
  );
}
