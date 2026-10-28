import React from 'react';
import { RoleGuard } from '@/components/auth';

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="farmer">{children}</RoleGuard>;
}
