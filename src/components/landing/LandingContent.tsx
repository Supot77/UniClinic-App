"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathForRole } from "@/features/dashboard/roles";
import { fetchLandingServices } from "@/services/landingService";
import type { ScheduleService } from "@/types/schedule";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-strong";

export function LandingActions() {
  const { isAuthenticated, isLoading, role } = useAuth();
  if (isLoading) return <p role="status" className="mt-7 min-h-12 text-sm text-brand-muted">กำลังตรวจสอบสถานะการเข้าสู่ระบบ…</p>;
  const staff = isAuthenticated && (role === "medical" || role === "staff_admin");
  return <div className="mt-7 flex flex-wrap items-center gap-3">
    <Link href={staff ? dashboardPathForRole(role) : isAuthenticated ? "/appointments" : "/login?redirect=%2Fappointments"} className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-brand-button bg-brand-ink px-6 py-3 text-sm font-semibold text-white hover:bg-brand-hover ${focus}`}>
      {staff ? "ไปยังแดชบอร์ด" : "จองนัดหมาย"}<ArrowRight size={18} aria-hidden="true" />
    </Link>
    <Link href={isAuthenticated ? "/schedules" : "/login?redirect=%2Fschedules"} className={`inline-flex min-h-12 items-center justify-center rounded-brand-button border border-brand-border-strong px-5 py-3 text-sm font-semibold hover:bg-white ${focus}`}>ดูตารางตรวจแพทย์</Link>
    {isAuthenticated && role === "patient" && <Link href="/appointments" className={`inline-flex min-h-11 items-center text-sm font-medium text-brand-strong underline underline-offset-4 ${focus}`}>นัดหมายของฉัน</Link>}
  </div>;
}

export function LandingServices() {
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
  if (status === "loading") return <p role="status" className="mt-8 border-t border-brand-border py-8 text-brand-muted">กำลังโหลดรายการบริการ…</p>;
  if (status === "error" || services.length === 0) return <div className="mt-8 border-t border-brand-border py-6"><p role="status" className="text-brand-body">{status === "error" ? "โหลดบริการไม่สำเร็จ" : "ยังไม่มีบริการที่เปิดใช้งานในขณะนี้"}</p><button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className={`mt-3 min-h-11 text-sm font-semibold text-brand-strong underline underline-offset-4 ${focus}`}>ลองใหม่</button></div>;
  return <ul className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{services.map((service, index) => <li key={service.id} className="border-t border-brand-border py-6"><span className="text-xs font-semibold text-brand-muted">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-3 text-lg font-semibold">{service.name}</h3>{service.description && <p className="mt-2 text-sm leading-7 text-brand-body">{service.description}</p>}</li>)}</ul>;
}
