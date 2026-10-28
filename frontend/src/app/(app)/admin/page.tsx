'use client';

import React from 'react';
import Link from 'next/link';
import { Users, UserCheck, Shield, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-card bg-sand-200/50 border border-sand-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-600">
            System Administration Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-1">
            Platform Administration
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Manage user accounts, verify agricultural extension officers, and inspect security audit metadata.
          </p>
        </div>
      </div>

      {/* Admin Privacy Boundary Card */}
      <div className="p-4 rounded-card bg-status-danger-bg border border-status-danger/30 flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-status-danger shrink-0 mt-0.5" />
        <div className="text-sm">
          <h4 className="font-bold text-status-danger">Strict Admin Privacy Boundary (AGENTS.md Rule 2)</h4>
          <p className="text-ink-900 mt-0.5 leading-relaxed">
            Administrators must <strong>never</strong> access or read farmer records, crop logs, or farm data payloads. System access is strictly limited to user administration and security audit metadata. Any attempt to query farm records returns an immediate 403/404 response.
          </p>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/users" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-sand-200 text-ink-900 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              User Management
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              View registered farmer and officer accounts, status, and activity dates.
            </p>
          </Card>
        </Link>

        <Link href="/admin/officers" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-status-warning-bg text-status-warning flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              Officer Verifications
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              Approve or suspend Department of Agriculture extension officers.
            </p>
          </Card>
        </Link>

        <Link href="/admin/audit" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              Security Audit Journal
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              Inspect tamper-evident authentication and consent journal metadata.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
