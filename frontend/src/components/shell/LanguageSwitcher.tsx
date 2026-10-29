'use client';

import React from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n, SupportedLocale } from '@/i18n';

interface LanguageOption {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'EN' },
  { code: 'si', label: 'Sinhala', nativeLabel: 'සිං' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'த' },
];

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={cn(
        'inline-flex items-center rounded-card bg-sand-200/80 p-0.5 border border-sand-200',
        className
      )}
    >
      <div className="pl-2 pr-1 text-ink-600 hidden sm:flex items-center" aria-hidden="true">
        <Globe className="w-3.5 h-3.5" />
      </div>
      {languages.map((lang) => {
        const isActive = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLocale(lang.code)}
            aria-pressed={isActive}
            className={cn(
              'px-2.5 py-1 text-xs font-semibold rounded-[10px] transition-all min-h-[36px] flex items-center justify-center',
              isActive
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-ink-600 hover:text-ink-900 hover:bg-white/50'
            )}
            title={lang.label}
          >
            {lang.nativeLabel}
          </button>
        );
      })}
    </div>
  );
};
