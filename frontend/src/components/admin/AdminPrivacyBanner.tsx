'use client';

import React from 'react';
import { ShieldAlert, Lock } from 'lucide-react';

export const AdminPrivacyBanner: React.FC = () => {
  return (
    <aside
      className="p-3.5 bg-status-danger-bg border border-status-danger/30 rounded-card flex items-center justify-between gap-3 text-xs text-ink-900 shadow-sm"
      role="note"
      aria-label="Admin Privacy Boundary Policy"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-full bg-status-danger/10 text-status-danger shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <p className="font-extrabold text-status-danger text-sm tracking-tight">
            Privacy enforced: administrators cannot view farm records.
          </p>
          <p className="text-ink-600 text-[11px] mt-0.5 leading-normal">
            Per platform policy (AGENTS.md Rule 2), access is strictly restricted to user identity administration and security audit metadata.
          </p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-white/80 border border-status-danger/20 text-status-danger font-mono text-[11px] font-bold shrink-0">
        <Lock className="w-3 h-3" />
        <span>Rule 2 Enforced</span>
      </div>
    </aside>
  );
};
