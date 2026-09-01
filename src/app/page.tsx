import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const services = [
    {
      id: 1,
      title: "ระบบล็อกอิน & สิทธิ์ผู้ใช้",
      category: "Authentication",
      desc: "จัดการสิทธิ์การเข้าใช้งานแยกตามบทบาท และหน้าประวัติข้อมูลส่วนตัว",
      developer: "Feem",
      path: "/login",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
      bgLight: "bg-zinc-100",
      textCol: "text-zinc-800",
    },
    {
      id: 2,
      title: "ตารางเวรและแผนกบริการ",
      category: "Schedules",
      desc: "ตรวจสอบวันปฏิบัติงานของแพทย์ ตารางเวร และรายละเอียดแผนกบริการ",
      developer: "Shop",
      path: "/schedules",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
      bgLight: "bg-zinc-100",
      textCol: "text-zinc-800",
    },
    {
      id: 3,
      title: "จองคิวพบแพทย์ออนไลน์",
      category: "Appointments",
      desc: "ระบบนัดหมายแพทย์ล่วงหน้าแบบดิจิทัล สะดวกและเรียลไทม์",
      developer: "Pai",
      path: "/appointments",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
      bgLight: "bg-zinc-100",
      textCol: "text-zinc-800",
    },
    {
      id: 4,
      title: "จัดการฐานข้อมูลคลังยา",
      category: "Inventory",
      desc: "บันทึกและตรวจสอบปริมาณคงเหลือ ยอดเวชภัณฑ์ และวันหมดอายุ",
      developer: "Gun",
      path: "/pharmacy",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
      bgLight: "bg-zinc-100",
      textCol: "text-zinc-800",
    },
    {
      id: 5,
      title: "ระบบแจ้งเตือนทานยา",
      category: "Reminders",
      desc: "ตั้งค่าเวลาทานยาและส่งข้อความเตือนอัตโนมัติผ่าน LINE Notify",
      developer: "Glong",
      path: "/reminders",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      ),
      bgLight: "bg-zinc-100",
      textCol: "text-zinc-800",
    },
    {
      id: 6,
      title: "แดชบอร์ด & แจ้งเตือนกลาง",
      category: "Dashboard",
      desc: "แดชบอร์ดสรุปกิจกรรมของคลินิกและศูนย์แจ้งเตือนข้อความระบบทั้งหมด",
      developer: "Herb",
      path: "/dashboard",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
      ),
      bgLight: "bg-zinc-100",
      textCol: "text-zinc-800",
    },
  ];

  const stats = [
    { value: "6", label: "ระบบย่อยที่พัฒนา", suffix: "" },
    { value: "24", label: "ชั่วโมงที่พร้อมบริการ", suffix: "/7" },
    { value: "100", label: "ความปลอดภัยของข้อมูล", suffix: "%" },
    { value: "6", label: "ทีมนักพัฒนาร่วมโครงการ", suffix: " ทีม" },
  ];

  return (
    <div className="flex flex-col w-full bg-white">
      {/* ══════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#0A1128] min-h-[85vh] flex items-center pt-24 pb-16">
        {/* Subtle texture/noise overlay for depth */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        
        {/* Soft elegant glows instead of bright blobs */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#1e3a8a] opacity-20 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0369a1] opacity-20 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Left Content */}
          <div className="flex-1 space-y-8 text-white max-w-2xl pt-10 lg:pt-0">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38bdf8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0ea5e9]"></span>
              </span>
              <span className="text-[11px] font-medium tracking-wide text-zinc-300 uppercase">ระบบบริหารคลินิกดิจิทัลยุคใหม่</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight text-white apple-tight-headline">
              ยกระดับประสบการณ์ <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e0f2fe] to-[#7dd3fc]">
                การรักษาที่ไร้รอยต่อ
              </span>
            </h1>

            <p className="text-lg text-zinc-400 leading-relaxed max-w-xl">
              ศูนย์รวมบริการสุขภาพที่ผสานเทคโนโลยีทันสมัย จัดการคิว พบแพทย์ สั่งยา และติดตามผลอย่างครบวงจร ภายใต้มาตรฐานความปลอดภัยสูงสุด
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/appointments"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white text-[#0A1128] font-semibold text-[15px] hover:bg-zinc-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                จองคิวตรวจรักษา
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-full bg-white/5 text-white font-medium text-[15px] border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                สำหรับเจ้าหน้าที่
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="flex-1 w-full max-w-[560px] relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative z-10">
              <Image
                src="/clinic_hero.jpg"
                alt="WU Clinic modern facility"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128]/80 via-transparent to-transparent"></div>
            </div>
            {/* Decorative offset card to add depth */}
            <div className="absolute -inset-4 bg-gradient-to-br from-white/5 to-transparent rounded-[32px] -z-10 border border-white/5 blur-[2px]"></div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS SECTION
      ══════════════════════════════════════════ */}
      <section className="py-16 px-6 border-b border-zinc-100 bg-zinc-50/50">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 divide-x divide-zinc-200/60">
          {stats.map((s, idx) => (
            <div key={s.label} className={`flex flex-col items-center justify-center text-center ${idx % 2 === 0 ? 'border-none md:border-solid' : 'border-none'}`}>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl md:text-5xl font-bold tracking-tight text-[#0A1128]">{s.value}</span>
                {s.suffix && <span className="text-xl font-medium text-zinc-400">{s.suffix}</span>}
              </div>
              <span className="text-sm font-medium text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          
          <div className="max-w-2xl mb-16">
            <h2 className="text-sm font-semibold tracking-widest text-[#0ea5e9] uppercase mb-3">Service Modules</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight apple-tight-headline mb-4">
              โซลูชันเพื่อการจัดการสุขภาพที่สมบูรณ์แบบ
            </h3>
            <p className="text-zinc-500 text-lg leading-relaxed">
              สถาปัตยกรรมระบบที่ถูกออกแบบให้ทำงานร่วมกันอย่างมีประสิทธิภาพ ลดความซับซ้อน และเพิ่มความแม่นยำในการให้บริการ
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <Link
                key={s.id}
                href={s.path}
                className="group block p-8 rounded-3xl bg-white border border-zinc-200 transition-all duration-300 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50 hover:-translate-y-1 relative overflow-hidden"
              >
                {/* Subtle hover background shift */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/0 to-zinc-50/100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-8">
                    <div className={`p-3 rounded-2xl ${s.bgLight} ${s.textCol} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      {s.icon}
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-full">
                      {s.category}
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-[#0A1128] mb-3">{s.title}</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed mb-6 flex-grow">{s.desc}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <span className="text-[11px] font-medium text-zinc-400">พัฒนาโดย {s.developer}</span>
                    <div className="flex items-center text-sm font-semibold text-[#0A1128] opacity-60 group-hover:opacity-100 transition-opacity">
                      เปิดระบบ
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Feature List */}
          <div className="flex-1 w-full order-2 lg:order-1">
            <div className="space-y-8">
              {[
                { 
                  title: "สถาปัตยกรรมข้อมูลที่มั่นคง", 
                  desc: "ระบบฐานข้อมูลถูกออกแบบมาเพื่อความถูกต้องแม่นยำ ป้องกันข้อมูลสูญหาย และแยกสิทธิ์การเข้าถึงอย่างชัดเจน",
                  svg: <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                },
                { 
                  title: "เชื่อมโยงไร้รอยต่อ", 
                  desc: "เมื่อมีการจองคิว ข้อมูลจะถูกซิงค์ไปยังตารางแพทย์ แดชบอร์ด และระบบคลังยาโดยอัตโนมัติแบบเรียลไทม์",
                  svg: <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                },
                { 
                  title: "ตอบโจทย์ผู้ใช้งานทุกระดับ", 
                  desc: "ส่วนติดต่อผู้ใช้ (UI) ถูกออกแบบโดยเน้นความเรียบง่าย เข้าถึงข้อมูลที่จำเป็นได้รวดเร็ว ลดขั้นตอนที่ซับซ้อน",
                  svg: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                }
              ].map((f, i) => (
                <div key={i} className="flex gap-5 group">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 group-hover:text-[#0A1128] group-hover:border-zinc-300 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                        {f.svg}
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#0A1128] mb-2">{f.title}</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Text Content */}
          <div className="flex-1 w-full order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight apple-tight-headline mb-6">
              ความลงตัวระหว่าง <br/>เทคโนโลยีและการดูแล
            </h2>
            <p className="text-zinc-500 text-lg leading-relaxed mb-8">
              โปรเจกต์นี้เป็นการรวมพลังของนักพัฒนาทั้ง 6 คน ที่มีความเชี่ยวชาญเฉพาะด้าน ทุกบรรทัดของโค้ดถูกเขียนขึ้นด้วยความใส่ใจเพื่อสร้างระบบบริหารจัดการที่มั่นคงและยั่งยืน
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 font-semibold text-[#0ea5e9] hover:text-[#0284c7] transition-colors"
            >
              ศึกษาเพิ่มเติมเกี่ยวกับโครงสร้างระบบ
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-zinc-100 flex items-center justify-center mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#0A1128]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.315 48.315 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#0A1128] tracking-tight mb-5 apple-tight-headline">
            พร้อมสัมผัสประสบการณ์ใหม่
          </h2>
          <p className="text-zinc-500 text-lg mb-10 max-w-lg mx-auto">
            เข้าสู่ระบบเพื่อจัดการข้อมูลคลินิก หรือเริ่มต้นจองคิวนัดหมายแพทย์ได้ทันทีผ่านระบบออนไลน์
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link
              href="/appointments"
              className="inline-flex justify-center items-center px-8 py-4 rounded-2xl bg-[#0A1128] text-white font-semibold text-[15px] hover:bg-[#1e3a8a] transition-colors shadow-md"
            >
              จองคิวตรวจรักษา
            </Link>
            <Link
              href="/login"
              className="inline-flex justify-center items-center px-8 py-4 rounded-2xl bg-white text-[#0A1128] font-semibold text-[15px] border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
            >
              เข้าสู่ระบบเจ้าหน้าที่
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
