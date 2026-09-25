"use client";

// Appearance choices here stay synchronized with the light/dark switch in the Header.
import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Palette, Sun, Text } from "lucide-react";
import { useLocale } from "@/context/LocaleContext";
import {
  applyThemePreference,
  readThemePreference,
  saveThemePreference,
  THEME_PREFERENCE_EVENT,
  type ThemeChangeDetail,
  type ThemePreference,
} from "@/lib/appearance";

type Theme = ThemePreference;
type FontSize = "normal" | "large";

const FONT_SIZE_KEY = "wu-clinic-font-size";

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
      className={`relative flex min-h-14 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${selected ? "border-brand-strong bg-brand-soft text-brand-strong shadow-sm" : "border-[var(--settings-border)] bg-[var(--settings-option)] text-[var(--settings-muted)] hover:border-brand-border hover:text-[var(--settings-page-text)]"}`}
    >
      {icon}
      <span>{label}</span>
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-brand-strong text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

function OptionCard({ selected, onClick, icon, title, description }: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border px-4 py-4 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-strong ${selected ? "border-brand-strong bg-brand-soft text-brand-strong shadow-sm" : "border-[var(--settings-border)] bg-[var(--settings-option)] text-[var(--settings-muted)] hover:border-brand-border hover:text-[var(--settings-page-text)]"}`}
    >
      {icon}
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs leading-5">{description}</span>
      {selected && (
        <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-brand-strong text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

export default function SettingsContent() {
  const { text } = useLocale();
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [ready, setReady] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const handleThemePreferenceChange = (event: Event) => {
      const { preference } = (event as CustomEvent<ThemeChangeDetail>).detail;
      setTheme(preference);
    };

    window.addEventListener(THEME_PREFERENCE_EVENT, handleThemePreferenceChange);
    return () => window.removeEventListener(THEME_PREFERENCE_EVENT, handleThemePreferenceChange);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedFontSize = window.localStorage.getItem(FONT_SIZE_KEY);
      const nextTheme = readThemePreference();
      const nextFontSize: FontSize = savedFontSize === "large" ? "large" : "normal";

      setTheme(nextTheme);
      setFontSize(nextFontSize);
      applyThemePreference(nextTheme);
      document.documentElement.dataset.fontSize = nextFontSize;
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemePreference("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [ready, theme]);

  function flashSaved() {
    setShowSaved(true);
    window.setTimeout(() => setShowSaved(false), 1800);
  }

  function changeTheme(value: Theme) {
    setTheme(value);
    saveThemePreference(value);
    flashSaved();
  }

  function changeFontSize(value: FontSize) {
    setFontSize(value);
    document.documentElement.dataset.fontSize = value;
    window.localStorage.setItem(FONT_SIZE_KEY, value);
    flashSaved();
  }

  return (
    <main className="relative left-1/2 min-h-[calc(100vh-80px)] w-screen -translate-x-1/2 bg-[var(--settings-page-bg)] text-[var(--settings-page-text)] transition-colors">
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-7 border-b border-[var(--settings-border)] pb-6">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-10 w-1 shrink-0 rounded-full bg-brand-strong" aria-hidden="true" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{text("การตั้งค่า", "Settings")}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--settings-muted)]">
                {text("ปรับรูปแบบการแสดงผลให้เหมาะกับการใช้งานของคุณ", "Adjust the display to suit your preferences.")}
              </p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-card)] shadow-[0_6px_24px_rgba(16,47,61,0.06)]">
          <div className="flex items-center gap-3 border-b border-[var(--settings-border)] px-5 py-5 sm:px-7">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
              <Palette className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{text("การแสดงผล", "Appearance")}</h2>
              <p className="mt-0.5 text-xs text-[var(--settings-muted)]">{text("การตั้งค่าจะถูกบันทึกไว้ในอุปกรณ์นี้", "Your settings are saved on this device.")}</p>
            </div>
          </div>

          <div className="grid divide-y divide-[var(--settings-border)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <Sun className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold">{text("ธีม", "Theme")}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">{text("เลือกรูปแบบสีของหน้าจอ", "Choose a color theme.")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
                <OptionCard
                  selected={theme === "light"}
                  onClick={() => changeTheme("light")}
                  icon={<Sun className="size-7 sm:size-8" />}
                  title={text("สว่าง", "Light")}
                  description={text("เหมาะสำหรับการใช้งานในที่สว่าง", "Best for bright environments.")}
                />

                <OptionCard
                  selected={theme === "dark"}
                  onClick={() => changeTheme("dark")}
                  icon={<Moon className="size-7 sm:size-8" />}
                  title={text("มืด", "Dark")}
                  description={text("เหมาะสำหรับการใช้งานในที่แสงน้อย", "Best for low-light environments.")}
                />

                <OptionCard
                  selected={theme === "system"}
                  onClick={() => changeTheme("system")}
                  icon={<Laptop className="size-7 sm:size-8" />}
                  title={text("ตามอุปกรณ์", "System")}
                  description={text("ใช้การตั้งค่าของอุปกรณ์", "Follow your device settings.")}
                />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <Text className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold">{text("ขนาดตัวอักษร", "Text size")}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">{text("ปรับขนาดข้อความให้อ่านได้สะดวก", "Choose a comfortable reading size.")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={text("ขนาดตัวอักษร", "Text size")}>
                <OptionButton selected={fontSize === "normal"} onClick={() => changeFontSize("normal")} label={text("ปกติ", "Normal")} />
                <OptionButton selected={fontSize === "large"} onClick={() => changeFontSize("large")} label={text("ใหญ่", "Large")} />
              </div>
            </div>
          </div>
        </section>

        <p aria-live="polite" className={`mt-4 flex min-h-6 items-center justify-end gap-2 text-xs font-medium text-brand-strong transition-opacity ${showSaved ? "opacity-100" : "opacity-0"}`}>
          <Check className="size-4" aria-hidden="true" />{text("บันทึกการตั้งค่าแล้ว", "Settings saved.")}
        </p>
      </div>
    </main>
  );
}
