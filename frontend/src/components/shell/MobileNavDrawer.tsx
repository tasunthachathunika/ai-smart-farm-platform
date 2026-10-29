'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, Sprout, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { navItemsByRole } from './navConfig';
import { Badge } from '@/components/ui/Badge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '@/i18n';

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Automatically close drawer when route changes
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trap focus inside drawer and return focus on close
  useEffect(() => {
    if (isOpen) {
      // Focus the close button on open
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [isOpen, triggerRef]);

  const handleKeyDownTrap = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

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
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden transition-visibility duration-300',
        isOpen ? 'visible' : 'invisible pointer-events-none'
      )}
      aria-hidden={!isOpen}
    >
      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-ink-900/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Dialog */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onKeyDown={handleKeyDownTrap}
        className={cn(
          'fixed inset-y-0 left-0 w-full max-w-xs sm:max-w-sm bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out motion-reduce:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-sand-200 bg-sand-50/70">
          <div className="flex items-center justify-between">
            <Link
              href={`/${user.role}`}
              onClick={onClose}
              className="flex items-center gap-2 group min-h-touch py-1"
            >
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

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t('common.closeMenu') || 'Close menu'}
              className="p-2.5 rounded-card text-ink-600 hover:text-ink-900 hover:bg-sand-200 min-h-touch min-w-touch flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 transition-colors"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>

          {/* User profile snippet */}
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-sand-200">
            <div
              className="w-10 h-10 rounded-full bg-green-200 text-green-800 flex items-center justify-center font-bold text-sm shrink-0 border border-green-300"
              aria-hidden="true"
            >
              {user.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink-900 truncate">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant={roleBadgeConfig.variant}
                  label={roleBadgeConfig.label}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body: Full Navigation Links */}
        <nav
          aria-label="Mobile navigation links"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
        >
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
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3 rounded-card text-base font-semibold transition-colors min-h-touch group',
                  isActive
                    ? 'bg-green-100 text-green-800 border-l-4 border-green-600 shadow-sm'
                    : 'text-ink-700 hover:text-ink-900 hover:bg-sand-100'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-green-700' : 'text-ink-600 group-hover:text-ink-900'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate flex-1">{translatedLabel}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: Language Switcher & Logout */}
        <div className="p-4 border-t border-sand-200 bg-sand-50/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-600">Language:</span>
            <LanguageSwitcher />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-card text-sm font-bold text-status-danger bg-status-danger-bg/60 hover:bg-status-danger-bg transition-colors min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-danger"
          >
            <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{t('common.signOut')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
