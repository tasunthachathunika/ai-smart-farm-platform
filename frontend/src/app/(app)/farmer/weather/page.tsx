'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus } from 'lucide-react';
import { farmService } from '@/services/farmService';
import { Plot } from '@/types/farm';
import { WeatherWidget } from '@/components/farmer/WeatherWidget';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackButton } from '@/components/ui/BackButton';

export default function FarmerWeatherPage() {
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
        // Empty state handles error
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlots();
  }, []);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/farmer" />
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">District Weather Forecast</h1>
          <p className="text-sm text-ink-600 mt-1">
            Official agro-meteorological forecast mapped to district centroids to protect exact farm GPS coordinates.
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
          <Skeleton variant="rectangular" height={100} className="w-full rounded-card" />
          <Skeleton variant="rectangular" height={260} className="w-full rounded-card" />
        </div>
      ) : plots.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No Plots Available"
          description="Register your first plot to receive district-tailored weather forecasts and rainfall estimates."
          action={{
            label: 'Register First Plot',
            onClick: () => router.push('/farmer/plots'),
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      ) : (
        selectedPlot && (
          <WeatherWidget
            plotId={selectedPlot.id}
            plotName={selectedPlot.name}
            district={selectedPlot.district}
          />
        )
      )}
    </div>
  );
}
