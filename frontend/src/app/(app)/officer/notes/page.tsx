'use client';

import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function OfficerNotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Officer Advisory Notes</h1>
          <p className="text-sm text-ink-600 mt-1">
            Verified agronomic recommendations and field advisories left for farmers.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          Draft New Advisory Note
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={FileText}
            title="No Advisory Notes Issued"
            description="You have not recorded any advisory notes for farmers yet. Select a shared plot to review records and issue guidance."
          />
        </CardContent>
      </Card>
    </div>
  );
}
