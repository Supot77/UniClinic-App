"use client";

import Link from "next/link";
import { Clock3, Hospital, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/context/LocaleContext";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const guestSections: FooterSection[] = [
  {
    title: "สำหรับผู้ใช้ทั่วไป",
    links: [
      { label: "ตารางตรวจแพทย์", href: "/schedules" },
      { label: "เข้าสู่ระบบ", href: "/login" },
      { label: "สมัครสมาชิก", href: "/register" },
    ],
  },
];

const patientSections: FooterSection[] = [
  {
    title: "สำหรับผู้ป่วย",
    links: [
      { label: "นัดหมายของฉัน", href: "/appointments" },
      { label: "ตารางตรวจแพทย์", href: "/schedules" },
      { label: "ประวัติการรักษา", href: "/records" },
      { label: "แจ้งเตือนยา", href: "/reminders" },
      { label: "โปรไฟล์", href: "/profile" },
    ],
  },
];

const medicalSections: FooterSection[] = [
  {
    title: "สำหรับบุคลากรทางการแพทย์",
    links: [
      { label: "ภาพรวม", href: "/dashboard" },
      { label: "ตารางตรวจแพทย์", href: "/schedules" },
      { label: "ค้นหาผู้ป่วย", href: "/patients/search" },
      { label: "คลังยา", href: "/pharmacy" },
      { label: "นัดหมายผู้ป่วย", href: "/appointments" },
    ],
  },
];

const staffAdminSections: FooterSection[] = [
  {
    title: "สำหรับเจ้าหน้าที่",
    links: [
      { label: "ภาพรวม", href: "/dashboard" },
      { label: "จัดการผู้ใช้งาน", href: "/staff/accounts" },
      { label: "จัดการแผนก", href: "/departments" },
      { label: "คลังยา", href: "/pharmacy" },
      { label: "ตารางตรวจแพทย์", href: "/schedules" },
    ],
  },
];

export default function Footer() {
  const { isAuthenticated, role } = useAuth();
  const { text } = useLocale();

  const englishLabels: Record<string, string> = {
    "สำหรับผู้ใช้ทั่วไป": "VISITORS", "สำหรับผู้ป่วย": "PATIENTS",
    "สำหรับบุคลากรทางการแพทย์": "MEDICAL STAFF", "สำหรับเจ้าหน้าที่": "CLINIC ADMIN",
    "ตารางตรวจแพทย์": "Doctor schedules", "เข้าสู่ระบบ": "Sign in", "สมัครสมาชิก": "Create an account",
    "นัดหมายของฉัน": "My appointments", "ประวัติการรักษา": "Medical records", "แจ้งเตือนยา": "Medication reminders",
    "โปรไฟล์": "Profile", "ภาพรวม": "Overview", "ค้นหาผู้ป่วย": "Find patients", "คลังยา": "Pharmacy inventory",
    "นัดหมายผู้ป่วย": "Patient appointments", "จัดการผู้ใช้งาน": "Manage accounts", "จัดการแผนก": "Manage departments",
  };

  const sections: FooterSection[] = (() => {
    if (!isAuthenticated || !role) {
      return guestSections;
    }
    switch (role) {
      case "patient":
        return patientSections;
      case "medical":
        return medicalSections;
      case "staff_admin":
        return staffAdminSections;
      default:
        return guestSections;
    }
  })();

  return (
    <footer className="w-full bg-brand-ink px-5 py-[60px] text-white sm:px-8 lg:min-h-[413px] lg:px-[51px]">
      <div className="w-full">
        <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link
              href={isAuthenticated ? "/dashboard" : "/"}
              className="inline-flex items-center gap-3 rounded-brand-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-brand-button bg-brand-accent text-brand-ink">
                <Hospital className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-[19px] font-semibold tracking-[-0.02em]">WU Clinic</span>
            </Link>
            <p className="mt-5 text-[15px] leading-7 text-brand-footer-text">
              {text("คลินิกสุขภาพมหาวิทยาลัยวลัยลักษณ์ สำหรับนัดหมายและจัดการบริการสุขภาพ", "Walailak University clinic for appointments and health services.")}
            </p>
            <div className="mt-6 space-y-3 text-[13px] text-brand-footer-text">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-accent" aria-hidden="true" />
                {text("มหาวิทยาลัยวลัยลักษณ์", "Walailak University")}
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brand-accent" aria-hidden="true" />
                {text("จันทร์–ศุกร์ 08:30–16:30 น.", "Monday–Friday, 08:30–16:30")}
              </div>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-brand-accent">
                {text(section.title, englishLabels[section.title] ?? section.title)}
              </h2>
              <ul className="mt-5 space-y-3 text-[15px] text-brand-footer-text">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-accent"
                    >
                      {text(link.label, englishLabels[link.label] ?? link.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-brand-accent">
              {text("ข้อมูลสำคัญ", "IMPORTANT INFORMATION")}
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-brand-footer-text">
              {text("กรณีฉุกเฉิน ให้ติดต่อหน่วยฉุกเฉินใกล้บ้านทันที ระบบนี้ใช้สำหรับนัดหมายและจัดการข้อมูลคลินิก", "For emergencies, contact your local emergency services. This system is for clinic appointments and clinic information.")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-[13px] text-brand-footer-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{text("© 2026 WU Clinic · มหาวิทยาลัยวลัยลักษณ์", "© 2026 WU Clinic · Walailak University")}</p>
          <p>{text("ระบบสำหรับการเรียนการสอน ข้อมูลเป็นข้อมูลสาธิต", "Educational system · Demonstration data")}</p>
        </div>
      </div>
    </footer>
  );
}
