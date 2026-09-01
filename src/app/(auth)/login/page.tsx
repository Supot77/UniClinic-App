'use client';

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-zinc-100">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">เข้าสู่ระบบ</h1>
        <p className="text-zinc-500 mt-2">ระบบคลินิกสุขภาพมหาวิทยาลัย</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
          <input type="email" placeholder="example@wu.ac.th" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
          <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition" />
        </div>
        <button className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition">
          เข้าสู่ระบบ
        </button>
        <p className="text-center text-sm text-zinc-500">
          ยังไม่มีบัญชี? <a href="/register" className="text-sky-500 font-medium hover:underline">สมัครสมาชิก</a>
        </p>
      </div>
    </div>
  );
}
