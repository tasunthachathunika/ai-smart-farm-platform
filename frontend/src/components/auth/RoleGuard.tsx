'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { UserRole } from '@/types/auth';
import { Skeleton } from '@/components/ui';

export interface RoleGuardProps {
  role: UserRole;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ role, children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, isInitialized, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      fetchMe();
    }
  }, [isInitialized, fetchMe]);

  useEffect(() => {
    if (!isInitialized || isLoading) {
      return;
    }

    // 1. Not authenticated -> redirect to login
    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // 2. Officer verification status check:
    // If user is an officer but not verified, any officer dashboard route redirects to pending page
    if (user.role === 'officer' && !user.isVerified) {
      if (pathname !== '/officer/verification-pending') {
        router.replace('/officer/verification-pending');
      }
      return;
    }

    // 3. User has a different role -> redirect to their own role dashboard
    if (user.role !== role) {
      switch (user.role) {
        case 'farmer':
          router.replace('/farmer');
          break;
        case 'officer':
          router.replace(user.isVerified ? '/officer' : '/officer/verification-pending');
          break;
        case 'admin':
          router.replace('/admin');
          break;
      }
    }
  }, [user, isAuthenticated, isLoading, isInitialized, role, pathname, router]);

  // Loading state
  if (!isInitialized || isLoading || !user || user.role !== role) {
    // If officer is pending and on verification-pending, allow render
    if (user?.role === 'officer' && !user.isVerified && pathname === '/officer/verification-pending') {
      return <>{children}</>;
    }

    return (
      <div
        role="status"
        aria-label="Checking access permissions..."
        className="min-h-screen bg-sand-50 p-6 flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-full max-w-md space-y-3 p-6 bg-white rounded-card border border-sand-200 shadow-card">
          <Skeleton variant="text" width="50%" height={24} />
          <Skeleton variant="rectangular" width="100%" height={120} />
          <Skeleton variant="text" width="75%" height={16} />
        </div>
      </div>
    );
  }

  // If officer attempting to access standard officer page while unverified
  if (user.role === 'officer' && !user.isVerified && pathname !== '/officer/verification-pending') {
    return null;
  }

  return <>{children}</>;
};

RoleGuard.displayName = 'RoleGuard';
