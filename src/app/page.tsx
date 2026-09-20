import { Clock3, MapPin, Phone, Users } from "lucide-react";
import { LandingActions, LandingServices } from "@/components/landing/LandingContent";

const steps = [
  ["01", "เลือกบริการและรอบตรวจ", "เข้าสู่ระบบ เลือกบริการ แพทย์ และวันเวลาที่สะดวกจากรอบที่เปิดรับจอง"],
  ["02", "ส่งคำขอนัดหมาย", "ตรวจสอบรายละเอียดก่อนส่งคำขอ แล้วติดตามสถานะในหน้านัดหมายของฉัน"],
  ["03", "รอยืนยัน แล้วมาตามนัด", "เมื่อเจ้าหน้าที่ยืนยันแล้ว ตรวจสอบวัน เวลา และรายละเอียดก่อนเดินทาง"],
];

export default function Home() {
  return <div className="bg-brand-surface text-brand-ink">
    <section className="border-b border-brand-border bg-brand-page px-5 py-10 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">WU CLINIC / มหาวิทยาลัยวลัยลักษณ์</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.3] tracking-tight sm:text-5xl lg:text-6xl">นัดหมายบริการสุขภาพ<span className="block text-brand-strong">กับ WU Clinic</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-brand-body">สำหรับนักศึกษาและบุคลากรมหาวิทยาลัยวลัยลักษณ์ เลือกบริการและเวลาที่สะดวก พร้อมติดตามสถานะนัดหมายออนไลน์</p>
          <LandingActions />
          <p className="mt-4 text-sm leading-6 text-brand-muted">คำขอนัดหมายต้องได้รับการยืนยันจากเจ้าหน้าที่</p>
        </div>
        <aside aria-labelledby="visit-heading" className="border-l-2 border-brand-strong pl-6 sm:pl-8">
          <p className="text-xs font-semibold tracking-[0.15em] text-brand-muted">วางแผนก่อนมา</p>
          <h2 id="visit-heading" className="mt-3 text-2xl font-semibold">ข้อมูลการเข้ารับบริการ</h2>
          <dl className="mt-6 divide-y divide-brand-border">
            <div className="py-5"><dt className="flex items-center gap-2 text-sm text-brand-body"><Clock3 size={18} aria-hidden="true" />เวลาเปิดบริการ</dt><dd className="mt-2 text-lg font-semibold">จันทร์–ศุกร์ · 08:30–16:30 น.</dd><dd className="mt-1 text-sm text-brand-muted">เว้นวันหยุดราชการ · เวลาจำลองสำหรับการสาธิต</dd></div>
            <div className="py-5"><dt className="flex items-center gap-2 text-sm text-brand-body"><Users size={18} aria-hidden="true" />ผู้มีสิทธิ์รับบริการ</dt><dd className="mt-2 font-semibold">นักศึกษาและบุคลากร<br />มหาวิทยาลัยวลัยลักษณ์</dd></div>
            <div className="py-5"><dt className="flex items-center gap-2 text-sm text-brand-body"><Phone size={18} aria-hidden="true" />ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์</dt><dd><a href="tel:075479999" className="mt-1 inline-flex min-h-11 items-center text-2xl font-semibold text-brand-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">075-479999</a></dd></div>
          </dl>
        </aside>
      </div>
    </section>
    <section aria-labelledby="services-heading" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">บริการของคลินิก</p>
      <h2 id="services-heading" className="mt-3 text-3xl font-semibold">เริ่มจากบริการที่คุณต้องการ</h2>
      <p className="mt-3 text-brand-body">ดูบริการของคลินิก แล้วเลือกบริการและรอบว่างในหน้าจองนัดหมาย</p>
      <LandingServices />
    </section>
    <section aria-labelledby="steps-heading" className="border-y border-brand-border bg-white px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <div className="mx-auto max-w-7xl"><h2 id="steps-heading" className="text-3xl font-semibold">จากคำขอ สู่วันนัดหมาย</h2>
        <ol className="mt-9 grid gap-8 md:grid-cols-3">{steps.map(([number, title, description]) => <li key={number} className="border-t border-brand-border pt-5"><span className="text-sm font-semibold text-brand-strong">{number}</span><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-brand-body">{description}</p></li>)}</ol>
      </div>
    </section>
    <section aria-labelledby="faq-heading" className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
      <div><p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">ก่อนเข้ารับบริการ</p><h2 id="faq-heading" className="mt-3 text-3xl font-semibold">เรื่องที่ควรรู้ก่อนจอง</h2></div>
      <div className="divide-y divide-brand-border border-y border-brand-border">{[
        ["ใครใช้บริการได้บ้าง?", "นักศึกษาและบุคลากรมหาวิทยาลัยวลัยลักษณ์ สามารถเข้าสู่ระบบเพื่อส่งคำขอนัดหมายได้"],
        ["ส่งคำขอแล้ว เข้ารับบริการได้เลยหรือไม่?", "กรุณารอเจ้าหน้าที่ยืนยันนัดหมาย ตรวจสอบสถานะ วัน และเวลาในหน้านัดหมายของฉันก่อนเดินทาง"],
        ["ต้องเตรียมเอกสารอะไรบ้าง?", "โปรดสอบถามเอกสารและการเตรียมตัวสำหรับบริการที่เลือกกับศูนย์การแพทย์ก่อนวันนัด โทร. 075-479999"],
      ].map(([question, answer]) => <details key={question} className="py-1"><summary className="cursor-pointer py-5 pr-3 font-medium focus-visible:outline-2 focus-visible:outline-brand-strong">{question}</summary><p className="pb-5 text-sm leading-7 text-brand-body">{answer}</p></details>)}</div>
    </section>
    <section aria-labelledby="contact-heading" className="bg-brand-ink px-5 py-12 text-white sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center"><div><p className="flex items-center gap-2 text-sm text-brand-footer-text"><MapPin size={18} aria-hidden="true" />ติดต่อและการเดินทาง</p><h2 id="contact-heading" className="mt-3 text-xl font-semibold">ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์</h2><p className="mt-2 text-sm text-brand-footer-text">มหาวิทยาลัยวลัยลักษณ์ อำเภอท่าศาลา จังหวัดนครศรีธรรมราช</p></div><a href="https://www.google.com/maps/search/?api=1&query=ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center border border-brand-footer-text px-6 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4">เปิดแผนที่ (แท็บใหม่)</a></div>
    </section>
  </div>;
}
