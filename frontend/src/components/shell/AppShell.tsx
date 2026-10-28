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
    <div className="min-h-screen bg-sand-50 flex flex-col md:flex-row text-ink-900">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
};
