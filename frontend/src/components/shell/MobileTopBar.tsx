'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/i18n';

export const MobileTopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-sand-200 px-4 py-2.5 flex items-center justify-between shadow-sm min-h-[56px]">
      <Link href={`/${user.role}`} className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          🌾
        </span>
        <span className="font-extrabold text-base text-green-700 tracking-tight">
          {t('common.appName')}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <button
          type="button"
          onClick={() => logout()}
          aria-label={t('common.signOut')}
          className="p-2 rounded-card text-status-danger hover:bg-status-danger-bg min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger"
          title={t('common.signOut')}
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
