import React from 'react';
import { RoleGuard } from '@/components/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="admin">{children}</RoleGuard>;
}
