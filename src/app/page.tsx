import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const services = [
    {
      id: 1,
      title: "ระบบล็อกอิน & สิทธิ์ผู้ใช้",
      category: "Authentication",
      desc: "จัดการสิทธิ์การเข้าใช้งานแยกตามบทบาท และหน้าประวัติข้อมูลส่วนตัว พัฒนาโดย Feem",
      path: "/feem-auth",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
      color: "from-violet-500 to-purple-600",
      light: "bg-violet-50",
      text: "text-violet-600",
    },
    {
      id: 2,
      title: "ตารางเวรและแผนกบริการ",
      category: "Schedules",
      desc: "ตรวจสอบวันปฏิบัติงานของแพทย์ ตารางเวร และรายละเอียดแผนกบริการ พัฒนาโดย Shop",
      path: "/shop-schedules",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
      color: "from-sky-500 to-blue-600",
      light: "bg-sky-50",
      text: "text-sky-600",
    },
    {
      id: 3,
      title: "จองคิวพบแพทย์ออนไลน์",
      category: "Appointments",
      desc: "ระบบนัดหมายแพทย์ล่วงหน้าแบบดิจิทัล สะดวกและเรียลไทม์ พัฒนาโดย Pai",
      path: "/pai-appointments",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
      color: "from-emerald-500 to-teal-600",
      light: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      id: 4,
      title: "จัดการฐานข้อมูลคลังยา",
      category: "Inventory",
      desc: "บันทึกและตรวจสอบปริมาณคงเหลือ ยอดเวชภัณฑ์ และวันหมดอายุ พัฒนาโดย Gun",
      path: "/gun-inventory",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
      color: "from-rose-500 to-pink-600",
      light: "bg-rose-50",
      text: "text-rose-600",
    },
    {
      id: 5,
      title: "ระบบแจ้งเตือนทานยา",
      category: "Medication Reminders",
      desc: "ระบบตั้งค่าเวลาทานยาและส่งข้อความเตือนอัตโนมัติผ่าน LINE Notify พัฒนาโดย Glong",
      path: "/glong-reminders",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      ),
      color: "from-amber-500 to-orange-500",
      light: "bg-amber-50",
      text: "text-amber-600",
    },
    {
      id: 6,
      title: "แดชบอร์ด & แจ้งเตือนกลาง",
      category: "Dashboard",
      desc: "แดชบอร์ดสรุปกิจกรรมของคลินิกและศูนย์แจ้งเตือนข้อความระบบทั้งหมด พัฒนาโดย Herb",
      path: "/herb-dashboard",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      ),
      color: "from-cyan-500 to-teal-500",
      light: "bg-cyan-50",
      text: "text-cyan-600",
    },
  ];

  const stats = [
    { value: "6", label: "ระบบย่อยที่พัฒนา", suffix: "" },
    { value: "24", label: "ชั่วโมงที่เปิดให้บริการออนไลน์", suffix: "/7" },
    { value: "100", label: "ความปลอดภัยของข้อมูล", suffix: "%" },
    { value: "6", label: "ทีมนักพัฒนาร่วมโครงการ", suffix: " ทีม" },
  ];

  return (
    <div className="flex flex-col w-full" style={{ fontFamily: "var(--font-inter, -apple-system, sans-serif)" }}>

      {/* ══════════════════════════════════════════
          HERO SECTION — gradient backdrop + real photo
      ══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a2540 0%, #0d3b6e 45%, #0e6b8a 100%)",
          minHeight: "88vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 70% 50%, rgba(14,107,138,0.35) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[-120px] right-[-120px] w-[520px] h-[520px] rounded-full pointer-events-none"
          aria-hidden
          style={{
            background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 md:px-10 py-24 flex flex-col md:flex-row items-center gap-14">
          {/* Left copy */}
          <div className="flex-1 space-y-7 text-white">
            {/* Pill badge */}
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              WU Clinic — ระบบบริหารคลินิกดิจิทัล
            </span>

            <h1
              className="text-4xl sm:text-5xl md:text-[3.6rem] font-bold leading-[1.08] tracking-tight"
              style={{ textShadow: "0 2px 24px rgba(0,0,0,0.25)" }}
            >
              ดูแลคุณ<br />
              <span
                style={{
                  backgroundImage: "linear-gradient(90deg, #38bdf8 0%, #a5f3fc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ทุกก้าว
              </span>{" "}
              ของการรักษา.
            </h1>

            <p className="text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.72)", maxWidth: "480px" }}>
              ระบบจองคิว บันทึกประวัติ สั่งจ่ายยา และแจ้งเตือนสมาร์ท — ออกแบบมาเพื่อประสบการณ์การดูแลสุขภาพที่ดีที่สุดที่ WU Clinic
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/pai-appointments"
                id="hero-book-btn"
                className="clinic-btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" clipRule="evenodd" />
                </svg>
                จองคิวตรวจรักษา
              </Link>
              <Link
                href="/feem-auth"
                id="hero-login-btn"
                className="clinic-btn-ghost inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm"
              >
                เข้าสู่ระบบเจ้าหน้าที่
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 pt-4" style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>
              {["ข้อมูลเข้ารหัส SSL", "ไม่แชร์ข้อมูลส่วนตัว", "รองรับทุกอุปกรณ์"].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — hero photo */}
          <div
            className="flex-1 w-full max-w-[520px] rounded-3xl overflow-hidden flex-shrink-0"
            style={{
              boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <Image
              src="/clinic_hero.jpg"
              alt="WU Clinic modern reception area"
              width={520}
              height={350}
              className="w-full h-auto object-cover"
              priority
            />
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" aria-hidden>
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "60px" }}>
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="#f8fafb" />
          </svg>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════ */}
      <section style={{ background: "#f8fafb" }} className="py-14 px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center space-y-1">
              <p className="text-4xl font-bold" style={{ color: "#0a2540" }}>
                {s.value}
                <span className="text-2xl" style={{ color: "#0ea5e9" }}>{s.suffix}</span>
              </p>
              <p className="text-sm font-medium" style={{ color: "#6b7280" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES GRID
      ══════════════════════════════════════════ */}
      <section className="py-20 px-6" style={{ background: "#fff" }}>
        <div className="max-w-[1100px] mx-auto">
          {/* Section header */}
          <div className="text-center mb-14 space-y-3">
            <span className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: "#e0f2fe", color: "#0284c7" }}>
              บริการของเรา
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#0a2540" }}>
              ครบวงจรทุกด้านของการดูแลผู้ป่วย
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "#6b7280" }}>
              ระบบย่อยทั้ง 6 โมดูลทำงานร่วมกันแบบไร้รอยต่อ เพื่อยกระดับมาตรฐานการให้บริการทางการแพทย์
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.id}
                href={s.path}
                id={`service-card-${s.id}`}
                className="clinic-service-card group relative flex flex-col rounded-2xl overflow-hidden border"
                style={{ borderColor: "#e5e7eb", background: "#fff" }}
              >
                {/* Gradient top strip */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${s.color}`} />

                <div className="p-6 flex flex-col flex-1 gap-4">
                  {/* Icon + category */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.light} ${s.text}`}>
                      {s.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: "#f3f4f6", color: "#9ca3af" }}>
                      {s.category}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <h3 className="text-[17px] font-bold" style={{ color: "#0a2540" }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{s.desc}</p>
                  </div>

                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${s.text} mt-2`}>
                    เข้าใช้งาน
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURE HIGHLIGHT — dark teal band
      ══════════════════════════════════════════ */}
      <section
        className="py-20 px-6"
        style={{ background: "linear-gradient(135deg, #0a2540 0%, #0d3b6e 100%)" }}
      >
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center gap-14">
          {/* Info cards stack */}
          <div className="flex-1 grid grid-cols-1 gap-4">
            {[
              { icon: "🔒", title: "ความปลอดภัยระดับโรงพยาบาล", desc: "ข้อมูลผู้ป่วยถูกเข้ารหัสและแยกสิทธิ์การเข้าถึงตามบทบาท" },
              { icon: "⚡", title: "เรียลไทม์ทุกอย่าง", desc: "ตารางแพทย์ สต็อกยา และสถานะนัดหมายอัปเดตสดทันที" },
              { icon: "📱", title: "รองรับทุกอุปกรณ์", desc: "ใช้งานได้บนสมาร์ทโฟน แท็บเล็ต และคอมพิวเตอร์ทุกระบบ" },
            ].map(f => (
              <div
                key={f.title}
                className="flex items-start gap-4 p-5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <span className="text-2xl flex-shrink-0">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-white text-sm">{f.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Copy */}
          <div className="flex-1 text-white space-y-6">
            <span className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest" style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" }}>
              ทำไมต้อง WU Clinic?
            </span>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">
              ระบบที่ออกแบบ<br />เพื่อแพทย์และผู้ป่วย
            </h2>
            <p style={{ color: "rgba(255,255,255,0.68)", lineHeight: "1.7" }}>
              ทีมพัฒนา 6 คนออกแบบแต่ละโมดูลให้ทำงานเป็นหนึ่งเดียว ตั้งแต่ระบบจองคิวไปถึงการจัดการคลังยา — ทุกอย่างเชื่อมกันอย่างมีประสิทธิภาพ
            </p>
            <Link
              href="/pai-appointments"
              id="feature-cta-btn"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm"
              style={{
                background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                color: "#0a2540",
                boxShadow: "0 4px 24px rgba(56,189,248,0.35)",
              }}
            >
              เริ่มต้นใช้งานเลย
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA BAND — light
      ══════════════════════════════════════════ */}
      <section className="py-20 px-6 text-center" style={{ background: "#f8fafb" }}>
        <div className="max-w-[640px] mx-auto space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "#0a2540" }}>
            พร้อมรับบริการแล้วหรือยัง?
          </h2>
          <p style={{ color: "#6b7280" }}>
            จองคิวพบแพทย์ออนไลน์ หรือเข้าสู่ระบบเพื่อดูข้อมูลการรักษาของคุณได้ทันที — ไม่มีค่าใช้จ่ายเพิ่มเติม
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/pai-appointments"
              id="bottom-cta-book"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #0a2540, #0d3b6e)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(10,37,64,0.28)",
              }}
            >
              จองคิวตรวจรักษา
            </Link>
            <Link
              href="/feem-auth"
              id="bottom-cta-login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm border"
              style={{
                borderColor: "#d1d5db",
                color: "#0a2540",
                background: "#fff",
              }}
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
