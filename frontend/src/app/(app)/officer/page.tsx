'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, FileText, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function OfficerDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-card bg-green-50 border border-green-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-green-700">
            Extension Officer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-1">
            Welcome, Officer {user?.fullName}!
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Review shared farm plots, inspect crop health timelines, and provide verified agronomic notes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/officer/shared-plots">
            <Button variant="primary" leftIcon={<MapPin className="w-4 h-4" />}>
              View Shared Plots
            </Button>
          </Link>
        </div>
      </div>

      {/* Security Privacy Notice Card */}
      <div className="p-4 rounded-card bg-white border border-sand-200 shadow-card flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 text-green-700 shrink-0 mt-0.5" />
        <div className="text-sm">
          <h4 className="font-bold text-ink-900">Privacy &amp; Scope Boundary Notice</h4>
          <p className="text-ink-600 mt-0.5 leading-relaxed">
            Per platform policy, you only receive blurred district-level locations. Viewing any shared record logs a <code className="text-xs font-mono bg-sand-200 px-1 py-0.5 rounded">plot_viewed_by_officer</code> event visible to the farmer. Unauthorized or revoked plot shares return 404.
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/officer/shared-plots" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              Shared Plots
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              Access plots where farmers have explicitly granted an active, unexpired view share.
            </p>
          </Card>
        </Link>

        <Link href="/officer/notes" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              Advisory Notes
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              Provide agronomic recommendations and pest management guidance directly to farmers.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
