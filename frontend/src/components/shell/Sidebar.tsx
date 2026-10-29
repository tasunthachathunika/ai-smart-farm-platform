'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sprout,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { navItemsByRole } from './navConfig';
import { Badge } from '@/components/ui/Badge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/i18n';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user) return null;

  const items = navItemsByRole[user.role] || [];

  const roleBadgeConfig = {
    farmer: { label: 'Farmer', variant: 'officer-confirmed' as const, icon: Sprout },
    officer: {
      label: user.isVerified ? 'Officer' : 'Pending',
      variant: (user.isVerified ? 'officer-confirmed' : 'private') as 'officer-confirmed' | 'private',
      icon: ShieldCheck,
    },
    admin: { label: 'Admin', variant: 'shared' as const, icon: ShieldAlert },
  }[user.role];

  return (
    <aside
      aria-label="Desktop application sidebar"
      className={cn(
        'hidden lg:flex flex-col bg-white border-r border-sand-200 transition-all duration-300 select-none z-30 shrink-0 h-screen sticky top-0',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-sand-200 min-h-[64px]">
        {!isCollapsed && (
          <Link href={`/${user.role}`} className="flex items-center gap-2 group">
            <span className="text-2xl" aria-hidden="true">
              🌾
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-base text-green-700 tracking-tight leading-tight">
                {t('common.appName')}
              </span>
              <span className="text-[10px] text-ink-600 font-medium">{t('common.tagline')}</span>
            </div>
          </Link>
        )}

        {isCollapsed && (
          <Link
            href={`/${user.role}`}
            className="w-full flex justify-center text-2xl"
            title="Goviya Plus"
          >
            <span aria-hidden="true">🌾</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-card text-ink-600 hover:text-ink-900 hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors ml-auto min-h-touch min-w-[36px] flex items-center justify-center"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Language Switcher */}
      {!isCollapsed && (
        <div className="px-4 py-2 border-b border-sand-200 bg-sand-50/50 flex justify-center">
          <LanguageSwitcher />
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== `/${user.role}` && pathname.startsWith(item.href));
          const translatedLabel = item.i18nKey ? t(item.i18nKey) : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-card text-sm font-semibold transition-colors min-h-touch group',
                isActive
                  ? 'bg-green-100 text-green-800 border-l-4 border-green-600 shadow-sm'
                  : 'text-ink-600 hover:text-ink-900 hover:bg-sand-100'
              )}
              title={isCollapsed ? translatedLabel : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-green-700' : 'text-ink-600 group-hover:text-ink-900'
                )}
                aria-hidden="true"
              />
              {!isCollapsed && <span className="truncate">{translatedLabel}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-sand-200 bg-sand-50/60 flex flex-col gap-2">
        <div className={cn('flex items-center gap-3 px-2 py-1', isCollapsed && 'justify-center')}>
          <div
            className="w-10 h-10 rounded-full bg-green-200 text-green-800 flex items-center justify-center font-bold text-sm shrink-0 border border-green-300"
            aria-hidden="true"
          >
            {user.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900 truncate">{user.fullName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge
                  variant={roleBadgeConfig.variant}
                  label={roleBadgeConfig.label}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2.5 rounded-card text-sm font-semibold text-status-danger hover:bg-status-danger-bg transition-colors min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger',
            isCollapsed && 'justify-center'
          )}
          title={t('common.signOut')}
          aria-label={t('common.signOut')}
        >
          <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
          {!isCollapsed && <span>{t('common.signOut')}</span>}
        </button>
      </div>
    </aside>
  );
};
