"use client";

import { useEffect, useState } from "react";
import { Check, Laptop, Moon, Settings2, Sun, Type } from "lucide-react";

type Theme = "light" | "dark" | "system";
type FontSize = "normal" | "large";

const THEME_KEY = "wu-clinic-theme";
const FONT_SIZE_KEY = "wu-clinic-font-size";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  document.documentElement.dataset.theme =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

type OptionCardProps = {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex min-h-[120px] w-full flex-col items-center justify-center rounded-2xl border px-4 py-5 text-center transition-all duration-200 sm:min-h-[145px] sm:px-5 sm:py-6 lg:min-h-[155px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 ${
        selected
          ? "border-brand-strong bg-brand-soft shadow-sm"
          : "border-[var(--settings-border)] bg-[var(--settings-option)] hover:border-brand-border hover:shadow-sm"
      }`}
    >
      {selected && (
        <span
          className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-brand-strong text-white sm:right-4 sm:top-4"
          aria-hidden="true"
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}

      <div
        className={`mb-3 flex items-center justify-center ${
          selected
            ? "text-brand-strong"
            : "text-[var(--settings-muted)]"
        }`}
      >
        {icon}
      </div>

      <span
        className={`text-base font-semibold ${
          selected
            ? "text-brand-strong"
            : "text-[var(--settings-page-text)]"
        }`}
      >
        {title}
      </span>

      <span className="mt-1.5 max-w-[280px] text-xs leading-5 text-[var(--settings-muted)] sm:text-sm">
        {description}
      </span>
    </button>
  );
}

export default function SettingsContent() {
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [ready, setReady] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    const savedFontSize = window.localStorage.getItem(FONT_SIZE_KEY);

    const nextTheme: Theme =
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
        ? savedTheme
        : "system";

    const nextFontSize: FontSize =
      savedFontSize === "large" ? "large" : "normal";

    setTheme(nextTheme);
    setFontSize(nextFontSize);

    applyTheme(nextTheme);
    document.documentElement.dataset.fontSize = nextFontSize;

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      applyTheme("system");
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, [ready, theme]);

  function flashSaved() {
    setShowSaved(true);

    window.setTimeout(() => {
      setShowSaved(false);
    }, 1800);
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
    <main className="min-h-[calc(100vh-80px)] w-full bg-[var(--settings-page-bg)] text-[var(--settings-page-text)] transition-colors">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            การตั้งค่า
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--settings-muted)] sm:text-base">
            ปรับรูปแบบการแสดงผลให้เหมาะกับการใช้งานของคุณ
          </p>
        </header>

        <section className="w-full overflow-hidden rounded-2xl border border-[var(--settings-border)] bg-[var(--settings-card)] shadow-[0_8px_30px_rgba(16,47,61,0.06)] sm:rounded-3xl">
          <div className="flex items-center gap-4 border-b border-[var(--settings-border)] px-5 py-5 sm:px-7 sm:py-6 lg:px-10">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong sm:size-12 sm:rounded-2xl">
              <Settings2 className="size-5 sm:size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold sm:text-xl">
                การแสดงผล
              </h2>

              <p className="mt-1 text-xs leading-5 text-[var(--settings-muted)] sm:text-sm">
                การตั้งค่าจะถูกบันทึกไว้ในอุปกรณ์นี้
              </p>
            </div>
          </div>

          <div className="px-5 sm:px-7 lg:px-10">
            {/* Theme */}
            <section className="py-6 sm:py-8 lg:py-9">
              <div className="mb-5 flex items-start gap-3 sm:gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <Sun className="size-5" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold">
                    ธีม
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[var(--settings-muted)]">
                    เลือกรูปแบบสีของหน้าจอให้เหมาะกับการใช้งาน
                  </p>
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
                  description="ปรับอัตโนมัติตามการตั้งค่าของอุปกรณ์"
                />
              </div>
            </section>

            <div className="border-t border-[var(--settings-border)]" />

            {/* Font size */}
            <section className="py-6 sm:py-8 lg:py-9">
              <div className="mb-5 flex items-start gap-3 sm:gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
                  <Type className="size-5" aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-bold">
                    ขนาดตัวอักษร
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[var(--settings-muted)]">
                    ปรับขนาดตัวอักษรให้เหมาะกับการอ่านของคุณ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
                <OptionCard
                  selected={fontSize === "normal"}
                  onClick={() => changeFontSize("normal")}
                  icon={<span className="text-2xl font-semibold">Aa</span>}
                  title="ปกติ"
                  description="เหมาะสำหรับการใช้งานทั่วไป"
                />

                <OptionCard
                  selected={fontSize === "large"}
                  onClick={() => changeFontSize("large")}
                  icon={<span className="text-3xl font-semibold">Aa</span>}
                  title="ใหญ่"
                  description="อ่านข้อความได้ชัดเจนยิ่งขึ้น"
                />
              </div>
            </section>
          </div>
        </section>

        <div
          aria-live="polite"
          className={`mt-4 flex justify-center transition-all duration-200 sm:justify-end ${
            showSaved
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0"
          }`}
        >
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-strong sm:w-auto">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-strong text-white">
              <Check
                className="size-3"
                strokeWidth={3}
                aria-hidden="true"
              />
            </span>

            บันทึกการตั้งค่าแล้ว
          </div>
        </div>
      </div>
    </main>
  );
}