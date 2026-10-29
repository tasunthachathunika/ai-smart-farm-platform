'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MapPin, Plus } from 'lucide-react';
import { farmService } from '@/services/farmService';
import { Plot } from '@/types/farm';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

// Dynamically import heavy PhotoManager component (image compression, upload pipeline, lightbox)
const PhotoManager = dynamic(
  () => import('@/components/farmer/PhotoManager').then((mod) => mod.PhotoManager),
  {
    loading: () => <Skeleton className="h-64 w-full rounded-card" />,
    ssr: false,
  }
);

export default function FarmerPhotosPage() {
  const router = useRouter();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPlots() {
      try {
        const res = await farmService.getPlots({ limit: 100 });
        const list = res.data || [];
        setPlots(list);
        if (list.length > 0) {
          setSelectedPlotId(list[0].id);
        }
      } catch {
        // Handled via UI empty state
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlots();
  }, []);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Crop &amp; Field Photos</h1>
          <p className="text-sm text-ink-600 mt-1">
            Visual inspection records. All EXIF/GPS metadata is stripped on upload to safeguard location privacy.
          </p>
        </div>

        {plots.length > 1 && (
          <div className="w-full sm:w-64">
            <Select
              label="Select Plot"
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              options={plots.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.district})`,
              }))}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton variant="rectangular" height={80} className="w-full rounded-card" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton variant="rectangular" height={220} className="rounded-card" />
            <Skeleton variant="rectangular" height={220} className="rounded-card" />
            <Skeleton variant="rectangular" height={220} className="rounded-card" />
          </div>
        </div>
      ) : plots.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No Plots Registered"
          description="You need to create a plot before you can upload and organize inspection photos."
          action={{
            label: 'Register First Plot',
            onClick: () => router.push('/farmer/plots'),
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      ) : (
        selectedPlot && (
          <PhotoManager
            plotId={selectedPlot.id}
            isPlotShared={selectedPlot.isShared}
          />
        )
      )}
    </div>
  );
}
