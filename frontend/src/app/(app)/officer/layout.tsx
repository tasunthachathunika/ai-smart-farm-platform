import React from 'react';
import { RoleGuard } from '@/components/auth';

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="officer">{children}</RoleGuard>;
}
