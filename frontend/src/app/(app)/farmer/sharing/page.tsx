'use client';

import React from 'react';
import { Lock, EyeOff, FileText } from 'lucide-react';
import { ActiveSharesManager } from '@/components/farmer/ActiveSharesManager';
import { BackButton } from '@/components/ui/BackButton';

export default function FarmerSharingPage() {
  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/farmer" />
      {/* Page Title & Context */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Officer Record Sharing</h1>
        <p className="text-sm text-ink-600 mt-1 max-w-2xl">
          Grant temporary, revocable access to certified agricultural extension officers.
          You retain full ownership of your data and can stop sharing at any moment.
        </p>
      </div>

      {/* Privacy & Security Guarantees Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-sand-100/70 border border-sand-200 rounded-card text-xs text-ink-900">
        <div className="flex items-start gap-2.5">
          <EyeOff className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-ink-900">GPS Privacy Protected</p>
            <p className="text-ink-600 text-[11px] mt-0.5 leading-normal">
              Officers only see your district. Exact GPS coordinates are never disclosed.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-ink-900">Instant Revocation</p>
            <p className="text-ink-600 text-[11px] mt-0.5 leading-normal">
              Revoking a share cuts access immediately on the officer&apos;s very next request.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-ink-900">Immutable Audit Trail</p>
            <p className="text-ink-600 text-[11px] mt-0.5 leading-normal">
              Every officer view and share action is permanently recorded in your audit log.
            </p>
          </div>
        </div>
      </div>

      {/* Active Shares Manager */}
      <ActiveSharesManager />
    </div>
  );
}
