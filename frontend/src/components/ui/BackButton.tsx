'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

export interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'subtle' | 'ghost' | 'outline';
}

export const BackButton: React.FC<BackButtonProps> = ({
  label,
  fallbackHref = '/',
  className,
  onClick,
  variant = 'subtle',
}) => {
  const router = useRouter();
  const { t } = useI18n();

  const displayLabel = label || t('common.back');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={displayLabel}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-card text-sm font-semibold transition-colors',
        'min-h-[48px] min-w-[48px] touch-target select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2',
        variant === 'subtle' &&
          'text-ink-700 hover:text-ink-900 bg-sand-200/60 hover:bg-sand-200 border border-sand-300/80 active:bg-sand-300/80',
        variant === 'ghost' &&
          'text-ink-600 hover:text-ink-900 hover:bg-sand-100 active:bg-sand-200',
        variant === 'outline' &&
          'text-ink-900 bg-white hover:bg-sand-50 border border-sand-300 shadow-sm active:bg-sand-100',
        className
      )}
    >
      <ArrowLeft className="w-4 h-4 shrink-0 text-ink-700" aria-hidden="true" />
      <span>{displayLabel}</span>
    </button>
  );
};

