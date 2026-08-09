import Link from "next/link";

export default function Home() {
  const teamMembers = [
    {
      id: 1,
      role: "คนที่ 1: ระบบ Authentication",
      desc: "ระบบยืนยันตัวตน, ล็อกอิน, สมัครสมาชิก และสิทธิ์ผู้ใช้งาน",
      path: "/auth",
      icon: "👤",
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-500"
    },
    {
      id: 2,
      role: "คนที่ 2: ระบบจองคิว",
      desc: "การเลือกวัน เวลา แพทย์เฉพาะทาง และการนัดหมายรักษา",
      path: "/appointments",
      icon: "📅",
      color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400 hover:border-blue-500"
    },
    {
      id: 3,
      role: "คนที่ 3: ระบบบันทึกประวัติ",
      desc: "ประวัติการรักษา, สัญญาณชีพ และผลการวินิจฉัยโรคของผู้ป่วย",
      path: "/records",
      icon: "📝",
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400 hover:border-purple-500"
    },
    {
      id: 4,
      role: "คนที่ 4: ระบบสั่งจ่ายยา",
      desc: "ใบสั่งยาอิเล็กทรอนิกส์, วิธีใช้ยา และการจัดการรับประทานยา",
      path: "/prescriptions",
      icon: "💊",
      color: "from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400 hover:border-teal-500"
    },
    {
      id: 5,
      role: "คนที่ 5: ระบบแจ้งเตือน",
      desc: "แจ้งเตือนวันนัดพบแพทย์, กินยา และการตั้งค่าการเตือน",
      path: "/reminders",
      icon: "🔔",
      color: "from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-400 hover:border-orange-500"
    },
    {
      id: 6,
      role: "คนที่ 6: ระบบจัดการคลังยา",
      desc: "เช็คสต็อกยา, บันทึกการตัดยอด และการควบคุมยอดขั้นต่ำ",
      path: "/inventory",
      icon: "📦",
      color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400 hover:border-cyan-500"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-12">
      <div className="mx-auto max-w-5xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            🏥 ระบบบริหารจัดการ WU Clinic Booking
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            ระบบจองคิวและบริหารงานคลินิก
          </h1>
          <p className="mx-auto max-w-2xl text-zinc-400 text-sm md:text-base leading-relaxed">
            ยินดีต้อนรับทีมงานผู้พัฒนา 6 ท่าน! โครงสร้างโฟลเดอร์สำหรับทำงานแบบแยกฟีเจอร์ถูกสร้างขึ้นแล้ว 
            ทุกคนสามารถเข้าพัฒนาต่อยอดไฟล์ <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">page.tsx</code> ในโฟลเดอร์ของตัวเองได้ทันที
          </p>
        </div>

        {/* Developer Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <Link 
              key={member.id} 
              href={member.path}
              className={`group relative rounded-3xl border bg-gradient-to-br p-6 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between ${member.color}`}
            >
              <div className="space-y-4">
                <div className="text-3xl">{member.icon}</div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-white transition">
                    {member.role}
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                    {member.desc}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between text-xs font-semibold">
                <span className="opacity-70 group-hover:opacity-100 transition">คลิกเพื่อเข้าส่องฟีเจอร์ →</span>
                <span className="font-mono bg-white/5 px-2.5 py-1 rounded-md text-[10px] text-zinc-300">
                  /app{member.path}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Project Info Footer */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <div>
            📂 โฟลเดอร์หลักอยู่ที่: <code className="text-zinc-400 font-mono">src/app/</code>
          </div>
          <div>
            ✨ พัฒนาด้วย Next.js 16 + React 19 + Tailwind CSS 4
          </div>
        </div>

      </div>
    </div>
  );
}
