'use client';

import React from 'react';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BackButton } from '@/components/ui/BackButton';

export default function OfficerVerificationPendingPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mb-4 flex justify-start">
        <BackButton fallbackHref="/officer" />
      </div>
      <Card className="max-w-lg w-full text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-status-warning-bg text-status-warning mx-auto flex items-center justify-center">
          <Clock className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-status-warning-bg text-status-warning border border-gold-500/30 mb-2">
            Verification Pending
          </span>
          <h1 className="text-2xl font-extrabold text-ink-900">
            Account Under Administrative Review
          </h1>
          <p className="text-sm text-ink-600 mt-2 leading-relaxed">
            Hello, <strong>{user?.fullName}</strong>. Agricultural Extension Officer accounts
            require verification by Department of Agriculture administrators before accessing
            farmer records or receiving plot shares.
          </p>
        </div>

        <div className="p-4 rounded-card bg-sand-50 border border-sand-200 text-xs text-ink-600 text-left space-y-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
            <span>
              <strong>AGENTS.md Security Boundary:</strong> Unverified officers cannot receive or
              use plot shares. Any attempt to read farmer records returns a strict 404 response.
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => logout()}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
