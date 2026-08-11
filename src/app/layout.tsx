import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WU Clinic Booking - ระบบจองคิวและบริการงานคลินิก",
  description: "ระบบจองคิวตรวจรักษา บันทึกประวัติการรักษา ใบสั่งยา และระบบคลังยาสำหรับคลินิกมหาวิทยาลัยวลัยลักษณ์",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${inter.variable} h-full scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-sans antialiased">
        {/* Global Navigation (Apple style global-nav) */}
        <nav className="h-11 w-full text-zinc-300 text-xs fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4" style={{background:"#0a2540"}}>
          <div className="w-full max-w-[1100px] flex items-center justify-between font-normal tracking-tight">
            {/* Logo */}
            <a href="/" className="text-white font-bold flex items-center gap-2 hover:opacity-90 transition text-sm">
              <span className="text-base">🏥</span>
              <span>WU Clinic</span>
            </a>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-7 text-[11px]" style={{color:"rgba(255,255,255,0.6)"}}>
              <a href="/feem-auth" className="hover:text-white transition">สิทธิ์ผู้ใช้งาน</a>
              <a href="/shop-schedules" className="hover:text-white transition">ตารางเวรแพทย์</a>
              <a href="/pai-appointments" className="hover:text-white transition">จองคิวแพทย์</a>
              <a href="/glong-reminders" className="hover:text-white transition">แจ้งเตือนยา</a>
              <a href="/gun-inventory" className="hover:text-white transition">คลังเวชภัณฑ์</a>
              <a href="/herb-dashboard" className="hover:text-white transition">แดชบอร์ด</a>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <a href="/feem-auth" className="font-semibold text-white hover:opacity-80 transition">เข้าสู่ระบบ</a>
            </div>
          </div>
        </nav>

        {/* Sub Nav */}
        <nav className="h-[52px] w-full frosted-glass border-b fixed top-11 left-0 right-0 z-40 flex items-center justify-center px-4" style={{borderColor:"#e5e7eb"}}>
          <div className="w-full max-w-[1100px] flex items-center justify-between">
            <a href="/" className="text-base font-bold tracking-tight hover:opacity-75 transition" style={{color:"#0a2540"}}>
              WU Clinic Booking
            </a>
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-5 text-xs" style={{color:"#6b7280"}}>
                <a href="/shop-schedules" className="hover:text-sky-600 transition">ตารางแพทย์</a>
                <a href="/gun-inventory" className="hover:text-sky-600 transition">คลังยา</a>
              </div>
              <a
                href="/pai-appointments"
                className="text-xs font-bold px-4 py-1.5 rounded-full transition-all shadow-sm"
                style={{background:"linear-gradient(135deg,#0a2540,#0d3b6e)",color:"#fff"}}
              >
                จองคิวตอนนี้
              </a>
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 pt-[96px]" style={{background:"#f8fafb"}}>
          {children}
        </main>

        {/* Footer */}
        <footer className="w-full border-t py-16 px-6 flex flex-col items-center" style={{background:"#0a2540",borderColor:"rgba(255,255,255,0.08)"}}>
          <div className="w-full max-w-[1100px] space-y-8">
            {/* Disclaimer */}
            <div className="text-[11px] leading-relaxed space-y-2 pb-8 border-b" style={{color:"rgba(255,255,255,0.4)",borderColor:"rgba(255,255,255,0.1)"}}>
              <p>* ระบบ WU Clinic Booking เป็นระบบจำลองเพื่อการเรียนการสอนเท่านั้น ข้อมูลทั้งหมดเป็นข้อมูลสมมติ ไม่สามารถใช้เป็นคำแนะนำทางการแพทย์ได้</p>
            </div>

            {/* Footer Columns */}
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-xs">
              {[
                { head: "บริการผู้ป่วย", links: [{l:"นัดหมายออนไลน์",h:"/pai-appointments"},{l:"ตารางเวรแพทย์",h:"/shop-schedules"},{l:"แจ้งเตือนทานยา",h:"/glong-reminders"},{l:"แดชบอร์ดสุขภาพ",h:"/herb-dashboard"}] },
                { head: "สำหรับเจ้าหน้าที่", links: [{l:"จัดการคลังยา",h:"/gun-inventory"},{l:"ตารางเวลาแพทย์",h:"/shop-schedules"},{l:"ศูนย์ควบคุมแดชบอร์ด",h:"/herb-dashboard"},{l:"จัดการสิทธิ์การใช้งาน",h:"/feem-auth"}] },
                { head: "ข้อมูลสุขภาพ", links: [{l:"คู่มือใช้ยา",h:"#"},{l:"บทความสุขภาพ",h:"#"},{l:"สถิติการใช้บริการ",h:"#"},{l:"ข่าวสาร",h:"#"}] },
                { head: "เกี่ยวกับเรา", links: [{l:"ติดต่อคลินิก",h:"#"},{l:"นโยบายความเป็นส่วนตัว",h:"#"},{l:"ทีมผู้พัฒนา",h:"#"},{l:"แผนผังเว็บ",h:"#"}] },
              ].map(col => (
                <div key={col.head} className="space-y-4">
                  <h4 className="font-bold text-[13px]" style={{color:"#38bdf8"}}>{col.head}</h4>
                  <ul className="space-y-2.5 font-medium" style={{color:"rgba(255,255,255,0.5)"}}>
                    {col.links.map(lk => <li key={lk.l}><a href={lk.h} className="hover:text-white transition">{lk.l}</a></li>)}
                  </ul>
                </div>
              ))}
            </div>

            {/* Copyright */}
            <div className="text-[11px] flex flex-col md:flex-row justify-between gap-4 pt-8 border-t" style={{color:"rgba(255,255,255,0.35)",borderColor:"rgba(255,255,255,0.1)"}}>
              <div>Copyright © 2026 WU Clinic Inc. สงวนลิขสิทธิ์ทั้งหมด.</div>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition">นโยบายความเป็นส่วนตัว</a>
                <span>|</span>
                <a href="#" className="hover:text-white transition">แผนผังเว็บไซต์</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
