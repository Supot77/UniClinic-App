"use client";

import { useEffect } from "react";

const THEME_KEY = "wu-clinic-theme";
const FONT_SIZE_KEY = "wu-clinic-font-size";

export default function AppearanceInitializer() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applySavedPreferences = () => {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "system";
      root.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.dataset.fontSize = window.localStorage.getItem(FONT_SIZE_KEY) === "large" ? "large" : "normal";
    };

    applySavedPreferences();
    const handleSystemThemeChange = () => {
      if ((window.localStorage.getItem(THEME_KEY) ?? "system") === "system") {
        root.dataset.theme = media.matches ? "dark" : "light";
      }
    };
    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  return null;
}
