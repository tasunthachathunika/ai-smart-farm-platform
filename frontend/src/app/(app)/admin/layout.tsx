'use client';

import React from 'react';
import { RoleGuard } from '@/components/auth';
import { AdminPrivacyBanner } from '@/components/admin/AdminPrivacyBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="admin">
      <div className="space-y-6">
        <AdminPrivacyBanner />
        {children}
      </div>
    </RoleGuard>
  );
}
