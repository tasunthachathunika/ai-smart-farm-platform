'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { navItemsByRole } from './navConfig';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!user) return null;

  // Filter 4-5 key items designated for bottom nav
  const items = (navItemsByRole[user.role] || []).filter((item) => item.isBottomNav);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-sand-200 shadow-lg flex items-center justify-around px-1 py-1"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== `/${user.role}` && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-touch rounded-card transition-colors select-none',
              isActive
                ? 'text-green-700 font-bold'
                : 'text-ink-600 hover:text-ink-900 font-medium'
            )}
          >
            <div className="relative">
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform',
                  isActive ? 'text-green-700 scale-110' : 'text-ink-600'
                )}
                aria-hidden="true"
              />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-600" />
              )}
            </div>
            <span className="text-[11px] mt-1 tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
