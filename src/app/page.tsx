"use client";

import Image from "next/image";
import { Clock3, MapPin, Phone, Users } from "lucide-react";
import { LandingActions, LandingServices } from "@/components/landing/LandingContent";
import { useLocale } from "@/context/LocaleContext";

const steps = [
  ["01", "เลือกบริการและรอบว่าง", "เข้าสู่ระบบ แล้วเลือกบริการ แพทย์ และวันเวลาจากรอบที่เปิดรับจอง", "Choose a service and an available time", "Sign in, then choose a service, clinician, and an available appointment time."],
  ["02", "ส่งคำขอนัดหมาย", "ตรวจสอบรายละเอียด ส่งคำขอ แล้วติดตามสถานะที่หน้านัดหมายของฉัน", "Submit an appointment request", "Review the details, send your request, and track its status on My appointments."],
  ["03", "รอเจ้าหน้าที่ยืนยัน แล้วมาตามนัด", "เมื่อได้รับการยืนยัน ตรวจสอบวัน เวลา และรายละเอียดก่อนเดินทาง", "Wait for confirmation and arrive for your visit", "After your request is confirmed, check the date, time, and details before you travel."],
];

export default function Home() {
  const { locale, text } = useLocale();
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
              alt={text("ทีมแพทย์ประจำ WU Clinic มหาวิทยาลัยวลัยลักษณ์", "The WU Clinic care team at Walailak University")}
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
              <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">WU CLINIC / {text("มหาวิทยาลัยวลัยลักษณ์", "Walailak University")}</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.3] tracking-tight sm:text-5xl lg:text-6xl">
                {text("นัดหมายบริการสุขภาพ", "Book a healthcare visit")}<span className="block text-brand-strong">{text("กับ WU Clinic", "with WU Clinic")}</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-brand-body">
                {text("สำหรับนักศึกษาและบุคลากรมหาวิทยาลัยวลัยลักษณ์ เลือกบริการและเวลาที่สะดวก แล้วติดตามสถานะนัดหมายได้ทางออนไลน์", "Walailak University students and staff can choose a service and a convenient time, then track appointment requests online.")}
              </p>
              <LandingActions />
              <p className="mt-4 text-sm leading-6 text-brand-muted">{text("ส่งคำขอแล้ว ต้องรอเจ้าหน้าที่ยืนยันก่อนเข้ารับบริการ", "Please wait for clinic staff to confirm your request before visiting.")}</p>
            </div>
          </div>
        </div>

        {/* Visit Information Bar (อยู่นอกพื้นที่รูปภาพ ชัดเจน สะอาดตา) */}
        <div className="border-t border-brand-border/80 bg-brand-page px-5 py-10 sm:px-8 sm:py-12 lg:px-12">
          <aside aria-labelledby="visit-heading" className="mx-auto max-w-7xl">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-xs font-semibold tracking-[0.15em] text-brand-muted">{text("ข้อมูลก่อนเข้ารับบริการ", "BEFORE YOUR VISIT")}</p>
              <h2 id="visit-heading" className="text-xl font-semibold text-brand-ink sm:text-2xl">{text("ข้อมูลการเข้ารับบริการ", "Visit information")}</h2>
            </div>
            <dl className="mt-6 grid gap-6 divide-y divide-brand-border/80 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
              <div className="pt-4 sm:pt-0 sm:pr-6">
                <dt className="flex items-center gap-2 text-sm text-brand-body"><Clock3 size={18} aria-hidden="true" />{text("เวลาทำการ", "Hours")}</dt>
                <dd className="mt-2 text-lg font-semibold text-brand-ink">{text("จันทร์–ศุกร์ · 08:30–16:30 น.", "Monday–Friday · 08:30–16:30")}</dd>
                <dd className="mt-1 text-sm text-brand-muted">{text("หยุดตามวันหยุดราชการ · ข้อมูลเวลาใช้สำหรับการสาธิต", "Closed on public holidays · Hours shown are for demonstration.")}</dd>
              </div>
              <div className="pt-4 sm:pt-0 sm:px-6">
                <dt className="flex items-center gap-2 text-sm text-brand-body"><Users size={18} aria-hidden="true" />{text("ผู้ใช้บริการ", "Who can use the clinic")}</dt>
                <dd className="mt-2 font-semibold text-brand-ink">{locale === 'th' ? <>นักศึกษาและบุคลากร<br />มหาวิทยาลัยวลัยลักษณ์</> : 'Walailak University students and staff'}</dd>
              </div>
              <div className="pt-4 sm:pt-0 sm:pl-6">
                <dt className="flex items-center gap-2 text-sm text-brand-body"><Phone size={18} aria-hidden="true" />{text("ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์", "Walailak University Medical Center")}</dt>
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
        <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">{text("บริการของคลินิก", "CLINIC SERVICES")}</p>
        <h2 id="services-heading" className="mt-3 text-3xl font-semibold">{text("เลือกบริการที่ต้องการ", "Choose a service")}</h2>
        <p className="mt-3 text-brand-body">{text("เลือกบริการและรอบว่างเพื่อจองนัดหมาย", "Browse available services and appointment times.")}</p>
        <LandingServices />
      </section>

      {/* Steps Section with Full-Bleed Nurse Backdrop */}
      <section aria-labelledby="steps-heading" className="landing-steps relative overflow-hidden border-y border-brand-border bg-brand-surface px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        {/* Background Image & Directional Gradient Scrims */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/images/nurse-student.png"
            alt={text("เจ้าหน้าที่พยาบาลกำลังตรวจวัดความดันและดูแลนักศึกษาในห้องพยาบาล มหาวิทยาลัยวลัยลักษณ์", "A nurse checking a student's blood pressure at Walailak University")}
            fill
            className="object-cover object-[20%_center] sm:object-[20%_center] lg:object-[20%_center]"
          />
          {/* Desktop Left-to-Right Scrim: Solid white covering steps text on the left, fading to transparent on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-surface via-brand-surface/95 via-30% to-transparent" />
          {/* Mobile Top-to-Bottom Scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-surface via-brand-surface/85 via-60% to-transparent lg:hidden" />
          {/* Bottom & Top fades */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand-surface via-brand-surface/70 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-surface/50 to-transparent" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">{text("ขั้นตอนการนัดหมาย", "HOW IT WORKS")}</p>
            <h2 id="steps-heading" className="mt-3 text-3xl font-semibold text-brand-ink">{text("ขั้นตอนการจองนัดหมาย", "Booking an appointment")}</h2>
            <ol className="mt-8 space-y-6">
              {steps.map(([number, title, description, englishTitle, englishDescription]) => (
                <li key={number} className="border-t border-brand-border/70 pt-5">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-semibold text-brand-strong">{number}</span>
                    <h3 className="text-lg font-semibold text-brand-ink">{text(title, englishTitle)}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-brand-body pl-7">{text(description, englishDescription)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-heading" className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-brand-strong">{text("ก่อนเข้ารับบริการ", "BEFORE YOU BOOK")}</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-semibold">{text("คำถามก่อนจองนัดหมาย", "Frequently asked questions")}</h2>
        </div>
        <div className="divide-y divide-brand-border border-y border-brand-border">
          {[
            ["ใครใช้บริการได้บ้าง?", "นักศึกษาและบุคลากรมหาวิทยาลัยวลัยลักษณ์เข้าสู่ระบบเพื่อส่งคำขอนัดหมายได้", "Who can use the clinic?", "Walailak University students and staff can sign in to request an appointment."],
            ["ส่งคำขอแล้ว เข้ารับบริการได้ทันทีหรือไม่?", "รอเจ้าหน้าที่ยืนยันนัดหมาย แล้วตรวจสอบสถานะ วัน และเวลาในหน้านัดหมายของฉันก่อนเดินทาง", "Can I visit as soon as I submit a request?", "Wait for clinic staff to confirm your appointment. Check its status, date, and time in My appointments before you travel."],
            ["ต้องเตรียมเอกสารอะไรบ้าง?", "สอบถามเอกสารและการเตรียมตัวสำหรับบริการที่เลือกจากศูนย์การแพทย์ก่อนวันนัด โทร. 075-479999", "What should I bring?", "Contact Walailak University Medical Center before your appointment to ask about documents and preparation for your service. Call 075-479999."],
          ].map(([question, answer, englishQuestion, englishAnswer]) => (
            <details key={question} className="py-1">
              <summary className="cursor-pointer py-5 pr-3 font-medium focus-visible:outline-2 focus-visible:outline-brand-strong">{text(question, englishQuestion)}</summary>
              <p className="pb-5 text-sm leading-7 text-brand-body">{text(answer, englishAnswer)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section aria-labelledby="contact-heading" className="landing-contact bg-brand-ink px-5 py-12 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm text-brand-footer-text">
              <MapPin size={18} aria-hidden="true" />{text("ติดต่อและการเดินทาง", "CONTACT & DIRECTIONS")}
            </p>
            <h2 id="contact-heading" className="mt-3 text-xl font-semibold">{text("ศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์", "Walailak University Medical Center")}</h2>
            <p className="mt-2 text-sm text-brand-footer-text">{text("มหาวิทยาลัยวลัยลักษณ์ อำเภอท่าศาลา จังหวัดนครศรีธรรมราช", "Walailak University, Tha Sala District, Nakhon Si Thammarat")}</p>
          </div>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Walailak%20University%20Medical%20Center"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center border border-brand-footer-text px-6 py-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            {text("เปิดแผนที่ในแท็บใหม่", "Open map in a new tab")}
          </a>
        </div>
      </section>
    </div>
  );
}
