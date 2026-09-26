// Shared appearance preference bridge for the Header, Settings, and app initializer.
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeChangeDetail {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

export const THEME_PREFERENCE_KEY = "wu-clinic-theme";
export const THEME_PREFERENCE_EVENT = "wu-clinic-theme-change";

export function readThemePreference(): ThemePreference {
  const savedTheme = window.localStorage.getItem(THEME_PREFERENCE_KEY);
  return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
    ? savedTheme
    : "system";
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const prefersDark =
    preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme: ResolvedTheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  document.documentElement.dataset.theme = resolvedTheme;
  window.dispatchEvent(
    new CustomEvent<ThemeChangeDetail>(THEME_PREFERENCE_EVENT, {
      detail: { preference, resolvedTheme },
    }),
  );

  return resolvedTheme;
}

export function saveThemePreference(preference: ThemePreference): ResolvedTheme {
  window.localStorage.setItem(THEME_PREFERENCE_KEY, preference);
  return applyThemePreference(preference);
}
