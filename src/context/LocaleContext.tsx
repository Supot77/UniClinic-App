'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/database';
import { localeTag, translate, type Locale, type MessageKey } from '@/i18n/messages';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  text: (thai: string, english: string) => string;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const PATIENT_LOCALE_COOKIE = 'wu_clinic_patient_locale';
const GUEST_LOCALE_COOKIE = 'wu_clinic_guest_locale';

function readLocaleCookie(name: string): Locale | null {
  const entry = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  const value = entry?.split('=')[1];
  return value === 'en' || value === 'th' ? value : null;
}

function saveLocaleCookie(name: string, locale: Locale) {
  document.cookie = `${name}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAuth();
  const [selectedLocale, setSelectedLocale] = useState<Locale>('th');
  const initializedFor = useRef<UserRole | 'guest' | null>(null);
  const canSwitchLanguage = role === 'patient' || (!role && !isLoading);
  const locale: Locale = canSwitchLanguage ? selectedLocale : 'th';

  useEffect(() => {
    if (isLoading) return;

    if (role === 'patient') {
      if (initializedFor.current !== 'patient') {
        const savedLocale = readLocaleCookie(PATIENT_LOCALE_COOKIE) ?? 'th';
        initializedFor.current = 'patient';
        setSelectedLocale(savedLocale);
        saveLocaleCookie(PATIENT_LOCALE_COOKIE, savedLocale);
      }
      return;
    }

    if (!role) {
      if (initializedFor.current !== 'guest') {
        const savedLocale = readLocaleCookie(GUEST_LOCALE_COOKIE) ?? 'th';
        initializedFor.current = 'guest';
        setSelectedLocale(savedLocale);
        saveLocaleCookie(GUEST_LOCALE_COOKIE, savedLocale);
      }
      return;
    }

    initializedFor.current = role;
    setSelectedLocale('th');
  }, [isLoading, role]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    if (role !== 'patient' && (role || isLoading)) return;
    setSelectedLocale(nextLocale);
    saveLocaleCookie(role === 'patient' ? PATIENT_LOCALE_COOKIE : GUEST_LOCALE_COOKIE, nextLocale);
  }, [isLoading, role]);

  const t = useCallback((key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values), [locale]);
  const text = useCallback((thai: string, english: string) => locale === 'th' ? thai : english, [locale]);
  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(localeTag(locale), { timeZone: 'Asia/Bangkok', ...options }).format(date), [locale]);
  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(localeTag(locale), options).format(value), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t, text, formatDate, formatNumber }), [locale, setLocale, t, text, formatDate, formatNumber]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
