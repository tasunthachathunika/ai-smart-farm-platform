'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function OfficerSharedPlotsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Shared Farmer Plots</h1>
        <p className="text-sm text-ink-600 mt-1">
          Active plot shares granted by farmers. Exact GPS coordinates are blurred to district level.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={MapPin}
            title="No Active Plot Shares"
            description="When farmers grant you access to their plots, they will appear here with crop cycles and activity records. Revoked shares automatically disappear."
          />
        </CardContent>
      </Card>
    </div>
  );
}
