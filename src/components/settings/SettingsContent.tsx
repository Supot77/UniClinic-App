"use client";

import { useEffect, useState } from "react";
import { Check, Languages, Laptop, Moon, Sun, Text } from "lucide-react";

type Theme = "light" | "dark" | "system";
type Language = "th" | "en";
type FontSize = "normal" | "large";

const THEME_KEY = "wu-clinic-theme";
const LANGUAGE_KEY = "wu-clinic-language";
const FONT_SIZE_KEY = "wu-clinic-font-size";

const copy = {
  th: {
    pageTitle: "การตั้งค่า",
    pageDescription: "ปรับภาษาและรูปแบบการแสดงผลให้เหมาะกับการใช้งานของคุณ",
    sectionTitle: "ภาษาและการแสดงผล",
    sectionDescription: "การตั้งค่าจะถูกบันทึกไว้ในอุปกรณ์นี้",
    languageTitle: "ภาษา",
    languageDescription: "เลือกภาษาที่ใช้แสดงผลในระบบ",
    thai: "ไทย",
    english: "English",
    themeTitle: "ธีม",
    themeDescription: "เลือกรูปแบบสีของหน้าจอ",
    light: "สว่าง",
    dark: "มืด",
    system: "ตามอุปกรณ์",
    fontTitle: "ขนาดตัวอักษร",
    fontDescription: "ปรับขนาดข้อความให้อ่านได้สะดวก",
    normal: "ปกติ",
    large: "ใหญ่",
    saved: "บันทึกการตั้งค่าแล้ว",
  },
  en: {
    pageTitle: "Settings",
    pageDescription: "Adjust the language and appearance for your preferences.",
    sectionTitle: "Language and appearance",
    sectionDescription: "Your preferences are saved on this device.",
    languageTitle: "Language",
    languageDescription: "Choose the language used on this settings page.",
    thai: "ไทย",
    english: "English",
    themeTitle: "Theme",
    themeDescription: "Choose how the interface looks.",
    light: "Light",
    dark: "Dark",
    system: "Use device setting",
    fontTitle: "Text size",
    fontDescription: "Adjust text size for comfortable reading.",
    normal: "Normal",
    large: "Large",
    saved: "Settings saved",
  },
} as const;

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

function OptionButton({ selected, onClick, icon, label }: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${selected ? "border-brand-strong bg-brand-soft text-brand-strong shadow-sm" : "border-[var(--settings-border)] bg-[var(--settings-option)] text-[var(--settings-muted)] hover:border-brand-border hover:text-[var(--settings-page-text)]"}`}
    >
      {icon}
      <span>{label}</span>
      {selected && (
        <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-brand-strong text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

export default function SettingsContent() {
  const [theme, setTheme] = useState<Theme>("system");
  const [language, setLanguage] = useState<Language>("th");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [ready, setReady] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const text = copy[language];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
    const savedFontSize = window.localStorage.getItem(FONT_SIZE_KEY);
    const nextTheme: Theme = savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
    const nextLanguage: Language = savedLanguage === "en" ? "en" : "th";
    const nextFontSize: FontSize = savedFontSize === "large" ? "large" : "normal";

    setTheme(nextTheme);
    setLanguage(nextLanguage);
    setFontSize(nextFontSize);
    applyTheme(nextTheme);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.fontSize = nextFontSize;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [ready, theme]);

  function flashSaved() {
    setShowSaved(true);
    window.setTimeout(() => setShowSaved(false), 1800);
  }

  function changeTheme(value: Theme) {
    setTheme(value);
    applyTheme(value);
    window.localStorage.setItem(THEME_KEY, value);
    flashSaved();
  }

  function changeLanguage(value: Language) {
    setLanguage(value);
    document.documentElement.lang = value;
    window.localStorage.setItem(LANGUAGE_KEY, value);
    flashSaved();
  }

  function changeFontSize(value: FontSize) {
    setFontSize(value);
    document.documentElement.dataset.fontSize = value;
    window.localStorage.setItem(FONT_SIZE_KEY, value);
    flashSaved();
  }

  return (
    <main className="min-h-[calc(100vh-80px)] w-full bg-[var(--settings-page-bg)] text-[var(--settings-page-text)] transition-colors">
      <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-7 border-b border-[var(--settings-border)] pb-6">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-brand-strong" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{text.pageTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--settings-muted)]">{text.pageDescription}</p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-card)] shadow-[0_6px_24px_rgba(16,47,61,0.06)]">
          <div className="flex items-center gap-3 border-b border-[var(--settings-border)] px-5 py-5 sm:px-7">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              <Languages className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{text.sectionTitle}</h2>
              <p className="mt-0.5 text-xs text-[var(--settings-muted)]">{text.sectionDescription}</p>
            </div>
          </div>

          <div className="divide-y divide-[var(--settings-border)] px-5 sm:px-7">
            <div className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(300px,1.1fr)] md:items-center">
              <div className="flex items-start gap-3">
                <Languages className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div><h3 className="text-sm font-bold">{text.languageTitle}</h3><p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">{text.languageDescription}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={text.languageTitle}>
                <OptionButton selected={language === "th"} onClick={() => changeLanguage("th")} label={text.thai} />
                <OptionButton selected={language === "en"} onClick={() => changeLanguage("en")} label={text.english} />
              </div>
            </div>

            <div className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(300px,1.1fr)] md:items-center">
              <div className="flex items-start gap-3">
                <Sun className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div><h3 className="text-sm font-bold">{text.themeTitle}</h3><p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">{text.themeDescription}</p></div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={text.themeTitle}>
                <OptionButton selected={theme === "light"} onClick={() => changeTheme("light")} icon={<Sun className="size-4" />} label={text.light} />
                <OptionButton selected={theme === "dark"} onClick={() => changeTheme("dark")} icon={<Moon className="size-4" />} label={text.dark} />
                <OptionButton selected={theme === "system"} onClick={() => changeTheme("system")} icon={<Laptop className="size-4" />} label={text.system} />
              </div>
            </div>

            <div className="grid gap-4 py-6 md:grid-cols-[minmax(0,1fr)_minmax(300px,1.1fr)] md:items-center">
              <div className="flex items-start gap-3">
                <Text className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div><h3 className="text-sm font-bold">{text.fontTitle}</h3><p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">{text.fontDescription}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={text.fontTitle}>
                <OptionButton selected={fontSize === "normal"} onClick={() => changeFontSize("normal")} label={text.normal} />
                <OptionButton selected={fontSize === "large"} onClick={() => changeFontSize("large")} label={text.large} />
              </div>
            </div>
          </div>
        </section>

        <p aria-live="polite" className={`mt-4 flex min-h-6 items-center justify-end gap-2 text-xs font-medium text-brand-strong transition-opacity ${showSaved ? "opacity-100" : "opacity-0"}`}>
          <Check className="size-4" aria-hidden="true" />{text.saved}
        </p>
      </div>
    </main>
  );
}
