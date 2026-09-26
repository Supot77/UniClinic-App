"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import {
  THEME_PREFERENCE_EVENT,
  type ResolvedTheme,
  type ThemeChangeDetail,
} from "@/lib/appearance";
import styles from "./TeamShowcase.module.css";

const members = [
  {
    id: "feem",
    nickname: "ฟีม",
    name: "ธัญยพร ทุ่มทอง",
    image: "/images/feemsuit.png",
    lightImage: "/images/feem-รูปปั้นกรีก.png",
    shortWork: "สมาชิก / โปรไฟล์ / สิทธิ์",
    shortWorkEn: "Accounts / profiles / access",
    work: "สมาชิก โปรไฟล์ สิทธิ์ และ session",
    workEn: "Accounts, profiles, permissions, and sessions",
  },
  {
    id: "herb",
    nickname: "เฮิร์บ",
    name: "ธนกฤต ทิพยฤกษ์",
    image: "/images/herbsuit.png",
    lightImage: "/images/เฮิร์บ-รูปปั้นกรีก.png",
    shortWork: "Broadcast / Dashboard",
    shortWorkEn: "Broadcast / dashboard",
    work: "Broadcast และ Dashboard",
    workEn: "Broadcast and dashboard",
  },
  {
    id: "klong",
    nickname: "กลอง",
    name: "วรวิริยะ นวลนก",
    image: "/images/klongsuit.png",
    lightImage: "/images/กลอง-รูปปั้นกรีก.png",
    shortWork: "รายการเตือนยา",
    shortWorkEn: "Medication reminders",
    work: "รายการเตือนยาแบบ manual",
    workEn: "Manual medication reminders",
  },
  {
    id: "kun",
    nickname: "กัญจน์",
    name: "ณัฐสิทธิ ทินวงค์",
    image: "/images/kunsuit.png",
    lightImage: "/images/สกรีนช็อต-รูปปั้นกรีก.png",
    shortWork: "คลังยา / จ่ายยา",
    shortWorkEn: "Inventory / dispensing",
    work: "คลังยาและการจ่ายยา",
    workEn: "Medication inventory and dispensing",
  },
  {
    id: "pai",
    nickname: "ปาย",
    name: "ปวริศร์ จันทวรรณ์",
    image: "/images/paisuit.png",
    lightImage: "/images/ปาย-รูปปั้นกรีก.png",
    shortWork: "นัด / คิว / ผลตรวจ / ยา",
    shortWorkEn: "Visits / records / prescriptions",
    work: "นัดหมาย คิว ผลตรวจ และรายการยา",
    workEn: "Appointments, queues, medical records, and prescriptions",
  },
  {
    id: "shop",
    nickname: "ช้อป",
    name: "สุพจน์ บำรุง",
    image: "/images/shopsuit.png",
    lightImage: "/images/ช้อปp-รูปปั้นกรีก.png",
    shortWork: "แผนก / แพทย์ / ตารางตรวจ",
    shortWorkEn: "Departments / doctors / schedules",
    work: "แผนก แพทย์ วันลา ตารางตรวจ และรอบนัด",
    workEn: "Departments, doctors, leave, schedules, and slots",
  },
  {
    id: "mallika",
    nickname: "อาจารย์",
    name: "อาจารย์มัลลิกา",
    image: "/images/mallikasuit.png",
    lightImage: "/images/จารย์เน็ก-รูปปั้นกรีก.png",
    shortWork: "อาจารย์ที่ปรึกษา",
    shortWorkEn: "Faculty advisor",
    work: "อาจารย์ที่ปรึกษาโครงการ WU Clinic",
    workEn: "Faculty advisor for the WU Clinic project",
  },
] as const;

export default function TeamShowcase() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const { text } = useLocale();
  const selected = members.find((member) => member.id === selectedId);

  useEffect(() => {
    const syncTheme = () => {
      setResolvedTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    };
    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<ThemeChangeDetail>).detail;
      setResolvedTheme(detail.resolvedTheme);
    };

    window.addEventListener(THEME_PREFERENCE_EVENT, handleThemeChange);
    syncTheme();
    return () => window.removeEventListener(THEME_PREFERENCE_EVENT, handleThemeChange);
  }, []);

  const isLightTheme = resolvedTheme === "light";
  const displayMembers = [members[0], members[1], members[2], members[6], members[3], members[4], members[5]];

  return (
    <section
      className={`${styles.page} ${isLightTheme ? styles.lightTheme : ""}`}
      data-visual-theme={resolvedTheme}
      aria-labelledby="team-heading"
    >
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowLine} />
          WU CLINIC <span aria-hidden="true">/</span> {text("เบื้องหลังระบบ", "BEHIND THE SYSTEM")}
        </p>
        <h1 id="team-heading" className={styles.title}>
          {text("ทีมพัฒนาและอาจารย์ที่ปรึกษา", "The project team")}
          <span>{text("WU Clinic", "WU Clinic")}</span>
        </h1>
        <p className={styles.lead}>
          {text(
            "เจ็ดคน หนึ่งระบบ เลือกรูปเพื่อทำความรู้จักทีมและอาจารย์ที่ปรึกษา",
            "Seven people, one system. Select a portrait to meet the team and faculty advisor.",
          )}
        </p>
      </div>

      <div className={styles.stageShell}>
        <div className={styles.stageLights} aria-hidden="true" />
        <div className={styles.stageTopline} aria-hidden="true">
          <span>{isLightTheme ? "MARBLE PORTRAITS" : "THE TEAM"}</span>
          <span>01 — {String(members.length).padStart(2, "0")}</span>
        </div>
        <div className={`${styles.roster} ${selected ? styles.hasSelection : ""}`}>
          {displayMembers.map((member, index) => {
            const active = member.id === selectedId;
            return (
              <button
                key={member.id}
                type="button"
                className={`${styles.member} ${active ? styles.selected : ""}`}
                data-member-id={member.id}
                aria-pressed={active}
                aria-label={text(`เลือก ${member.name} งาน ${member.work}`, `Select ${member.name}, ${member.workEn}`)}
                onClick={() => setSelectedId(active ? null : member.id)}
              >
                <span className={styles.imageWrap}>
                  <Image
                    src={isLightTheme ? member.lightImage : member.image}
                    alt={text(`ภาพสมาชิกทีม ${member.name}`, `Team member ${member.name}`)}
                    fill
                    sizes={isLightTheme
                      ? "(max-width: 600px) 90vw, (max-width: 900px) 50vw, 31vw"
                      : "(max-width: 600px) 90vw, (max-width: 900px) 50vw, 31vw"}
                    className={styles.portrait}
                    fetchPriority={index < 3 || member.id === "mallika" ? "high" : "auto"}
                  />
                </span>
                <span className={styles.cardShade} aria-hidden="true" />
                <span className={styles.cardNumber}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.cardText}>
                  <span className={styles.nickname}>{member.nickname}</span>
                  <span className={styles.name}>{member.name}</span>
                  <span className={styles.shortWork}>{text(member.shortWork, member.shortWorkEn)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.profile} aria-live="polite">
        {selected ? (
          <>
            <p className={styles.profileIndex}>{text("สมาชิกที่เลือก", "SELECTED MEMBER")}</p>
            <div className={styles.profileContent}>
              <h2>{selected.name}</h2>
              <p>{text(selected.work, selected.workEn)}</p>
            </div>
            <p className={styles.profileHint}>{text("กดรูปเดิมอีกครั้งเพื่อดูทั้งทีม", "Select the same portrait again to see the whole team")}</p>
          </>
        ) : (
          <>
            <p className={styles.profileIndex}>{text("ทำความรู้จักทีม", "MEET THE TEAM")}</p>
            <div className={styles.profileContent}>
              <h2>{text("เลือกสมาชิกหนึ่งคน", "Choose a team member")}</h2>
              <p>{text("ภาพที่เลือกจะก้าวออกมาด้านหน้า พร้อมแสดงงานที่รับผิดชอบ", "The selected portrait steps forward and reveals their work.")}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
