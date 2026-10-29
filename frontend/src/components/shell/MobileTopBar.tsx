'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Menu, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNavDrawer } from './MobileNavDrawer';
import { useI18n } from '@/i18n';

export const MobileTopBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);

  if (!user) return null;

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-sand-200 px-3 sm:px-4 py-2 flex items-center justify-between shadow-sm min-h-[56px]">
        {/* Left: Hamburger menu button with visible label & 48px touch target */}
        <div className="flex items-center gap-2">
          <button
            ref={hamburgerBtnRef}
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={t('common.menu') || 'Menu'}
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-nav-drawer"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-card text-ink-700 hover:text-ink-900 hover:bg-sand-100 min-h-touch min-w-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
          >
            <Menu className="w-5 h-5 text-ink-900 shrink-0" aria-hidden="true" />
            <span className="text-sm font-bold text-ink-900">{t('common.menu') || 'Menu'}</span>
          </button>

          <Link href={`/${user.role}`} className="flex items-center gap-1.5 ml-1">
            <span className="text-xl" aria-hidden="true">
              🌾
            </span>
            <span className="font-extrabold text-base text-green-700 tracking-tight">
              {t('common.appName')}
            </span>
          </Link>
        </div>

        {/* Right: Quick actions (Language + Sign Out) */}
        <div className="flex items-center gap-1.5">
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

      {/* Slide-in Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        triggerRef={hamburgerBtnRef}
      />
    </>
  );
};
