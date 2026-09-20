import Image from "next/image";
import { Clock3, MapPin, Phone, Users } from "lucide-react";
import { LandingActions, LandingServices } from "@/components/landing/LandingContent";

const steps = [
  ["01", "เลือกบริการและรอบตรวจ", "เข้าสู่ระบบ เลือกบริการ แพทย์ และวันเวลาที่สะดวกจากรอบที่เปิดรับจอง"],
  ["02", "ส่งคำขอนัดหมาย", "ตรวจสอบรายละเอียดก่อนส่งคำขอ แล้วติดตามสถานะในหน้านัดหมายของฉัน"],
  ["03", "รอยืนยัน แล้วมาตามนัด", "เมื่อเจ้าหน้าที่ยืนยันแล้ว ตรวจสอบวัน เวลา และรายละเอียดก่อนเดินทาง"],
];

export default function Home() {
  return (
    <div className="bg-brand-surface text-brand-ink">
      {/* Hero Section */}
      <section className="border-b border-brand-border bg-brand-page">
        {/* Main Hero Banner with Doctor Backdrop */}
        <div className="relative overflow-hidden px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
          {/* Background Image & Directional Gradient Scrims */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/images/test.png"
              alt="ทีมแพทย์ประจำ WU Clinic มหาวิทยาลัยวลัยลักษณ์"
              fill
              priority
              className="object-cover object-[20%_center] sm:object-[20%_center] lg:object-[20%_center]"
            />
            {/* Desktop Left-to-Right Scrim: Solid brand-page on the left covering text, fading smoothly to transparent on the right */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-page via-brand-page/90 via-10% to-transparent" />
            {/* Mobile Top-to-Bottom Scrim: Legibility over text on smaller screens */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-page via-brand-page/85 via-55% to-transparent lg:hidden" />
            {/* Bottom & Top fades */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-page via-brand-page/80 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-page/50 to-transparent" />
          </div>

          {/* Foreground Content */}
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">WU CLINIC / มหาวิทยาลัยวลัยลักษณ์</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.3] tracking-tight sm:text-5xl lg:text-6xl">
                นัดหมายบริการสุขภาพ<span className="block text-brand-strong">กับ WU Clinic</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-brand-body">
                สำหรับนักศึกษาและบุคลากรมหาวิทยาลัยวลัยลักษณ์ เลือกบริการและเวลาที่สะดวก พร้อมติดตามสถานะนัดหมายออนไลน์
              </p>
              <LandingActions />
              <p className="mt-4 text-sm leading-6 text-brand-muted">คำขอนัดหมายต้องได้รับการยืนยันจากเจ้าหน้าที่</p>
            </div>
          </div>
        </div>

        {/* Visit Information Bar (อยู่นอกพื้นที่รูปภาพ ชัดเจน สะอาดตา) */}
        <div className="border-t border-brand-border/80 bg-brand-page px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
          <aside aria-labelledby="visit-heading" className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-xs font-semibold tracking-[0.15em] text-brand-muted">วางแผนก่อนมา</p>
              <h2 id="visit-heading" className="text-xl font-semibold text-brand-ink sm:text-2xl">ข้อมูลการเข้ารับบริการ</h2>
            </div>
            <dl className="mt-6 grid gap-6 divide-y divide-brand-border/80 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
              <div className="pt-4 sm:pt-0 sm:pr-6">
                <dt className="flex items-center gap-2 text-sm text-brand-body"><Clock3 size={18} aria-hidden="true" />เวลาเปิดบริการ</dt>
                <dd className="mt-2 text-lg font-semibold text-brand-ink">จันทร์–ศุกร์ · 08:30–16:30 น.</dd>
                <dd className="mt-1 text-sm text-brand-muted">เว้นวันหยุดราชการ · เวลาจำลองสำหรับการสาธิต</dd>
              </div>
              <div className="pt-4 sm:pt-0 sm:px-6">
                <dt className="flex items-center gap-2 text-sm text-brand-body"><Users size={18} aria-hidden="true" />ผู้มีสิทธิ์รับบริการ</dt>
                <dd className="mt-2 font-semibold text-brand-ink">นักศึกษาและบุคลากร<br />มหาวิทยาลัยวลัยลักษณ์</dd>
              </div>
              <div className="pt-4 sm:pt-0 sm:pl-6">
                <dt className="flex items-center gap-2 text-sm text-brand-body"><Phone size={18} aria-hidden="true" />ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์</dt>
                <dd>
                  <a
                    href="tel:075479999"
                    className="mt-1 inline-flex min-h-11 items-center text-2xl font-semibold text-brand-strong underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    075-479999
                  </a>
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* Services Section */}
      <section aria-labelledby="services-heading" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">บริการของคลินิก</p>
        <h2 id="services-heading" className="mt-3 text-3xl font-semibold">เริ่มจากบริการที่คุณต้องการ</h2>
        <p className="mt-3 text-brand-body">ดูบริการของคลินิก แล้วเลือกบริการและรอบว่างในหน้าจองนัดหมาย</p>
        <LandingServices />
      </section>

      {/* Steps Section with Full-Bleed Nurse Backdrop */}
      <section aria-labelledby="steps-heading" className="relative overflow-hidden border-y border-brand-border bg-white px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        {/* Background Image & Directional Gradient Scrims */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/images/nurse-student.png"
            alt="เจ้าหน้าที่พยาบาลกำลังตรวจวัดความดันและดูแลนักศึกษาในห้องพยาบาล มหาวิทยาลัยวลัยลักษณ์"
            fill
            className="object-cover object-[20%_center] sm:object-[20%_center] lg:object-[20%_center]"
          />
          {/* Desktop Left-to-Right Scrim: Solid white covering steps text on the left, fading to transparent on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 via-30% to-transparent" />
          {/* Mobile Top-to-Bottom Scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/85 via-60% to-transparent lg:hidden" />
          {/* Bottom & Top fades */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/70 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/50 to-transparent" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">ขั้นตอนการรับบริการ</p>
            <h2 id="steps-heading" className="mt-3 text-3xl font-semibold text-brand-ink">จากคำขอ สู่วันนัดหมาย</h2>
            <p className="mt-3 text-brand-body">กระบวนการสะดวก รวดเร็ว พร้อมรับการดูแลอย่างใกล้ชิด</p>
            <ol className="mt-8 space-y-6">
              {steps.map(([number, title, description]) => (
                <li key={number} className="border-t border-brand-border/70 pt-5">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-semibold text-brand-strong">{number}</span>
                    <h3 className="text-lg font-semibold text-brand-ink">{title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-brand-body pl-7">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-heading" className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">ก่อนเข้ารับบริการ</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-semibold">เรื่องที่ควรรู้ก่อนจอง</h2>
        </div>
        <div className="divide-y divide-brand-border border-y border-brand-border">
          {[
            ["ใครใช้บริการได้บ้าง?", "นักศึกษาและบุคลากรมหาวิทยาลัยวลัยลักษณ์ สามารถเข้าสู่ระบบเพื่อส่งคำขอนัดหมายได้"],
            ["ส่งคำขอแล้ว เข้ารับบริการได้เลยหรือไม่?", "กรุณารอเจ้าหน้าที่ยืนยันนัดหมาย ตรวจสอบสถานะ วัน และเวลาในหน้านัดหมายของฉันก่อนเดินทาง"],
            ["ต้องเตรียมเอกสารอะไรบ้าง?", "โปรดสอบถามเอกสารและการเตรียมตัวสำหรับบริการที่เลือกกับศูนย์การแพทย์ก่อนวันนัด โทร. 075-479999"],
          ].map(([question, answer]) => (
            <details key={question} className="py-1">
              <summary className="cursor-pointer py-5 pr-3 font-medium focus-visible:outline-2 focus-visible:outline-brand-strong">{question}</summary>
              <p className="pb-5 text-sm leading-7 text-brand-body">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section aria-labelledby="contact-heading" className="bg-brand-ink px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm text-brand-footer-text">
              <MapPin size={18} aria-hidden="true" />ติดต่อและการเดินทาง
            </p>
            <h2 id="contact-heading" className="mt-3 text-xl font-semibold">ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์</h2>
            <p className="mt-2 text-sm text-brand-footer-text">มหาวิทยาลัยวลัยลักษณ์ อำเภอท่าศาลา จังหวัดนครศรีธรรมราช</p>
          </div>
          <a
            href="https://www.google.com/maps/search/?api=1&query=ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center border border-brand-footer-text px-6 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            เปิดแผนที่ (แท็บใหม่)
          </a>
        </div>
      </section>
    </div>
  );
}
