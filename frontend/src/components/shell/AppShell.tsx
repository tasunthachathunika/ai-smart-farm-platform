'use client';

import React from 'react';
import { OfflineBanner } from './OfflineBanner';
import { SessionExpiredModal } from './SessionExpiredModal';
import { Sidebar } from './Sidebar';
import { MobileTopBar } from './MobileTopBar';
import { MobileBottomNav } from './MobileBottomNav';

export interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col lg:flex-row text-ink-900">
      {/* Skip to Main Content Link for Keyboard / Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-green-700 focus:text-white focus:rounded-card focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white font-bold text-sm select-none"
      >
        Skip to main content
      </a>

      {/* Network Offline Alert */}
      <OfflineBanner />

      {/* Session Expired Re-auth Dialog */}
      <SessionExpiredModal />

      {/* Desktop Sidebar (Collapsible) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <MobileTopBar />

        {/* Dynamic Page Content with bottom padding for mobile navigation */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto focus:outline-none"
        >
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
};
