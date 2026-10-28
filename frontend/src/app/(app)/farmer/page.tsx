'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, CloudSun, Sparkles, Share2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function FarmerDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-card bg-green-50 border border-green-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-green-700">
            Farmer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-1">
            Ayubowan, {user?.fullName || 'Farmer'}!
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Manage your crop cycles, field logs, encrypted GPS plots, and extension officer shares.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/farmer/plots">
            <Button variant="primary" leftIcon={<MapPin className="w-4 h-4" />}>
              Manage Plots
            </Button>
          </Link>
          <Link href="/farmer/ai">
            <Button variant="secondary" leftIcon={<Sparkles className="w-4 h-4" />}>
              AI Advisory
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/farmer/plots" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              Plots &amp; Fields
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              AES-256-GCM encrypted GPS coordinates and crop cycles.
            </p>
          </Card>
        </Link>

        <Link href="/farmer/weather" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-sand-200 text-gold-700 flex items-center justify-center mb-3">
              <CloudSun className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              District Weather
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              Rainfall, temperature, and wind forecasts for your district.
            </p>
          </Card>
        </Link>

        <Link href="/farmer/sharing" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center mb-3">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
              Officer Shares
            </h3>
            <p className="text-xs text-ink-600 mt-1">
              Grant view access to verified officers. Revoke anytime atomically.
            </p>
          </Card>
        </Link>

        <Link href="/farmer/ai" className="group">
          <Card className="h-full hover:border-ai-600 transition-colors border-ai-300 bg-ai-50/40">
            <div className="w-10 h-10 rounded-full bg-ai-50 text-ai-600 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-ai-800 group-hover:text-ai-600 transition-colors">
              AI Record Summary
            </h3>
            <p className="text-xs text-ai-800/80 mt-1">
              Non-prescriptive synthesis and discussion questions for your officer.
            </p>
          </Card>
        </Link>
      </div>

      {/* Security & Audit Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-green-700" />
            <CardTitle>Tamper-Evident Security &amp; Privacy</CardTitle>
          </div>
          <CardDescription>
            Audit log of all actions taken on your farm records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-ink-600 leading-relaxed">
            Every time an officer views your shared plot, a <code className="text-xs font-mono bg-sand-200 px-1 py-0.5 rounded">plot_viewed_by_officer</code> event is permanently recorded in your audit journal. Officers never receive exact GPS coordinates.
          </p>
          <div className="mt-4">
            <Link href="/farmer/audit">
              <Button variant="secondary" size="sm">
                View My Audit Journal
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
