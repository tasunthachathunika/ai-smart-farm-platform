'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { SupportedLocale, TranslationDictionary } from './types';
import { en } from './dictionaries/en';
import { si } from './dictionaries/si';
import { ta } from './dictionaries/ta';

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  en,
  si,
  ta,
};

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setLanguageCookie(locale: SupportedLocale) {
  if (typeof document === 'undefined') return;
  // Non-sensitive cookie: goviya_lang=en|si|ta; path=/; max-age=31536000; SameSite=Lax
  document.cookie = `goviya_lang=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

function applyLocaleFont(locale: SupportedLocale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;

  const fontClasses = ['font-english', 'font-sinhala', 'font-tamil'];
  const activeClass =
    locale === 'si' ? 'font-sinhala' : locale === 'ta' ? 'font-tamil' : 'font-english';

  document.documentElement.classList.remove(...fontClasses);
  document.documentElement.classList.add(activeClass);

  if (document.body) {
    document.body.classList.remove(...fontClasses);
    document.body.classList.add(activeClass);
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  // Initialize from cookie on mount
  useEffect(() => {
    const saved = getCookie('goviya_lang');
    if (saved === 'en' || saved === 'si' || saved === 'ta') {
      setLocaleState(saved);
      applyLocaleFont(saved);
    } else {
      applyLocaleFont('en');
    }
  }, []);

  const handleSetLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    setLanguageCookie(newLocale);
    applyLocaleFont(newLocale);
  }, []);

  const dictionary = useMemo(() => dictionaries[locale] || dictionaries.en, [locale]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let current: unknown = dictionary;

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          current = undefined;
          break;
        }
      }

      // Fallback to English dictionary if key missing in current locale
      if (typeof current !== 'string') {
        let fallback: unknown = dictionaries.en;
        for (const key of keys) {
          if (fallback && typeof fallback === 'object' && key in fallback) {
            fallback = (fallback as Record<string, unknown>)[key];
          } else {
            fallback = undefined;
            break;
          }
        }
        if (typeof fallback === 'string') {
          current = fallback;
        }
      }

      if (typeof current !== 'string') {
        return path;
      }

      if (!params) {
        return current;
      }

      return current.replace(/\{(\w+)\}/g, (_, key) => {
        return params[key] !== undefined ? String(params[key]) : `{${key}}`;
      });
    },
    [dictionary]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale: handleSetLocale,
      t,
      dictionary,
    }),
    [locale, handleSetLocale, t, dictionary]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
