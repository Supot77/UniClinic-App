"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathForRole } from "@/features/dashboard/roles";
import { fetchLandingServices } from "@/services/landingService";
import type { ScheduleService } from "@/types/schedule";
import { useLocale } from "@/context/LocaleContext";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-strong";

export function LandingActions() {
  const { text } = useLocale();
  const { isAuthenticated, isLoading, role } = useAuth();
  if (isLoading) return <p role="status" className="mt-7 min-h-12 text-sm text-brand-muted">{text("กำลังตรวจสอบสถานะการเข้าสู่ระบบ…", "Checking your sign-in status…")}</p>;
  const staff = isAuthenticated && (role === "medical" || role === "staff_admin");
  return <div className="mt-7 flex flex-wrap items-center gap-3">
    <Link href={staff ? dashboardPathForRole(role) : isAuthenticated ? "/appointments" : "/login?redirect=%2Fappointments"} className={`landing-booking-btn inline-flex min-h-12 items-center justify-center gap-3 rounded-brand-button border border-brand-border-strong px-6 py-3 text-sm font-semibold hover:bg-brand-soft ${focus}`}>
      {staff ? text("ไปยังแดชบอร์ด", "Go to dashboard") : text("จองนัดหมาย", "Book an appointment")}<ArrowRight size={18} aria-hidden="true" />
    </Link>
    <Link href={!isAuthenticated ? "/schedules" : "/login?redirect=%2Fschedules"} className={`inline-flex min-h-12 items-center justify-center rounded-brand-button border border-brand-border-strong px-5 py-3 text-sm font-semibold hover:bg-brand-soft ${focus}`}>{text("ดูตารางตรวจแพทย์", "View clinician schedules")}</Link>
    {isAuthenticated && role === "patient" && <Link href="/appointments" className={`inline-flex min-h-11 items-center text-sm font-medium text-brand-strong underline underline-offset-4 ${focus}`}>{text("นัดหมายของฉัน", "My appointments")}</Link>}
  </div>;
}

export function LandingServices() {
  const { text } = useLocale();
  const [services, setServices] = useState<ScheduleService[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    fetchLandingServices().then((items) => {
      if (active) { setServices(items.filter((item) => item.isActive)); setStatus("ready"); }
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [attempt]);
  if (status === "loading") return <p role="status" className="mt-8 border-t border-brand-border py-8 text-brand-muted">{text("กำลังโหลดรายการบริการ…", "Loading services…")}</p>;
  if (status === "error" || services.length === 0) return <div className="mt-8 border-t border-brand-border py-6"><p role="status" className="text-brand-body">{status === "error" ? text("โหลดบริการไม่สำเร็จ", "Could not load services.") : text("ยังไม่มีบริการที่เปิดใช้งานในขณะนี้", "There are no active services at the moment.")}</p><button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className={`mt-3 min-h-11 text-sm font-semibold text-brand-strong underline underline-offset-4 ${focus}`}>{text("ลองใหม่", "Try again")}</button></div>;
  return <ul className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{services.map((service, index) => <li key={service.id} className="border-t border-brand-border py-6"><span className="text-xs font-semibold text-brand-muted">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-3 text-lg font-semibold">{service.name}</h3>{service.description && <p className="mt-2 text-sm leading-7 text-brand-body">{service.description}</p>}</li>)}</ul>;
}
