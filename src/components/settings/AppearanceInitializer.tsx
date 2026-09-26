"use client";

// Apply the saved appearance and publish changes so Header and Settings stay synchronized.
import { useEffect } from "react";
import { applyThemePreference, readThemePreference } from "@/lib/appearance";

const FONT_SIZE_KEY = "wu-clinic-font-size";

export default function AppearanceInitializer() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applySavedPreferences = () => {
      applyThemePreference(readThemePreference());
      root.dataset.fontSize = window.localStorage.getItem(FONT_SIZE_KEY) === "large" ? "large" : "normal";
    };

    applySavedPreferences();
    const handleSystemThemeChange = () => {
      if (readThemePreference() === "system") applyThemePreference("system");
    };
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  return null;
}
