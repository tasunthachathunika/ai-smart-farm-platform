'use client';

import React from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FarmerPlotsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">My Farm Plots</h1>
          <p className="text-sm text-ink-600 mt-1">
            Exact GPS coordinates are encrypted using AES-256-GCM.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          Register New Plot
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={MapPin}
            title="No Plots Registered Yet"
            description="Register your first agricultural plot with boundaries and crop varieties to start logging activities and receiving weather advisories."
            action={{
              label: 'Add First Plot',
              icon: <Plus className="w-4 h-4" />,
              onClick: () => {},
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
