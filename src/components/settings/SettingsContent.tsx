"use client";

import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Palette, Sun, Text } from "lucide-react";

type Theme = "light" | "dark" | "system";
type FontSize = "normal" | "large";

const THEME_KEY = "wu-clinic-theme";
const FONT_SIZE_KEY = "wu-clinic-font-size";

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

export default function SettingsContent() {
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [ready, setReady] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const savedFontSize = window.localStorage.getItem(FONT_SIZE_KEY);
      const nextTheme: Theme =
        savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
          ? savedTheme
          : "system";
      const nextFontSize: FontSize = savedFontSize === "large" ? "large" : "normal";

      setTheme(nextTheme);
      setFontSize(nextFontSize);
      applyTheme(nextTheme);
      document.documentElement.dataset.fontSize = nextFontSize;
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
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
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">การตั้งค่า</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--settings-muted)]">
                ปรับรูปแบบการแสดงผลให้เหมาะกับการใช้งานของคุณ
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
              <h2 className="text-lg font-bold">การแสดงผล</h2>
              <p className="mt-0.5 text-xs text-[var(--settings-muted)]">การตั้งค่าจะถูกบันทึกไว้ในอุปกรณ์นี้</p>
            </div>
          </div>

          <div className="grid divide-y divide-[var(--settings-border)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <Sun className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold">ธีม</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">เลือกรูปแบบสีของหน้าจอ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
                <OptionCard
                  selected={theme === "light"}
                  onClick={() => changeTheme("light")}
                  icon={<Sun className="size-7 sm:size-8" />}
                  title="สว่าง"
                  description="เหมาะสำหรับการใช้งานในที่สว่าง"
                />

                <OptionCard
                  selected={theme === "dark"}
                  onClick={() => changeTheme("dark")}
                  icon={<Moon className="size-7 sm:size-8" />}
                  title="มืด"
                  description="เหมาะสำหรับการใช้งานในที่แสงน้อย"
                />

                <OptionCard
                  selected={theme === "system"}
                  onClick={() => changeTheme("system")}
                  icon={<Laptop className="size-7 sm:size-8" />}
                  title="ตามอุปกรณ์"
                  description="ใช้การตั้งค่าของอุปกรณ์"
                />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <Text className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold">ขนาดตัวอักษร</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--settings-muted)]">ปรับขนาดข้อความให้อ่านได้สะดวก</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="ขนาดตัวอักษร">
                <OptionButton selected={fontSize === "normal"} onClick={() => changeFontSize("normal")} label="ปกติ" />
                <OptionButton selected={fontSize === "large"} onClick={() => changeFontSize("large")} label="ใหญ่" />
              </div>
            </div>
          </div>
        </section>

        <p aria-live="polite" className={`mt-4 flex min-h-6 items-center justify-end gap-2 text-xs font-medium text-brand-strong transition-opacity ${showSaved ? "opacity-100" : "opacity-0"}`}>
          <Check className="size-4" aria-hidden="true" />บันทึกการตั้งค่าแล้ว
        </p>
      </div>
    </main>
  );
}
