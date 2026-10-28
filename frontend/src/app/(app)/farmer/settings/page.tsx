'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/store/useAuthStore';

export default function FarmerSettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Farmer Settings</h1>
        <p className="text-sm text-ink-600 mt-1">
          Account preferences, notifications, and profile details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-700" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Verified account credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-ink-600 font-medium">Full Name:</span>
              <p className="font-bold text-ink-900">{user?.fullName}</p>
            </div>
            <div>
              <span className="text-ink-600 font-medium">Email Address:</span>
              <p className="font-bold text-ink-900">{user?.email}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-sand-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-600 mb-3">
              Upcoming Preferences (No Backend Endpoint Yet)
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-card bg-sand-50 border border-sand-200 opacity-60">
                <span className="text-sm font-medium text-ink-900">SMS Critical Weather Alerts</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-sand-200 text-ink-600">
                  Coming soon
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-card bg-sand-50 border border-sand-200 opacity-60">
                <span className="text-sm font-medium text-ink-900">Multi-Factor Authentication (MFA)</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-sand-200 text-ink-600">
                  Coming soon
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
