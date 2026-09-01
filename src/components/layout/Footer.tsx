import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
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
                {col.links.map(lk => <li key={lk.l}><Link href={lk.h} className="hover:text-white transition">{lk.l}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-[11px] flex flex-col md:flex-row justify-between gap-4 pt-8 border-t" style={{color:"rgba(255,255,255,0.35)",borderColor:"rgba(255,255,255,0.1)"}}>
          <div>Copyright © 2026 WU Clinic Inc. สงวนลิขสิทธิ์ทั้งหมด.</div>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white transition">นโยบายความเป็นส่วนตัว</Link>
            <span>|</span>
            <Link href="#" className="hover:text-white transition">แผนผังเว็บไซต์</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
