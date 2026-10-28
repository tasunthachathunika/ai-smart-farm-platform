'use client';

import React from 'react';
import { Droplets, Wind, Thermometer } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function FarmerWeatherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">District Weather Forecast</h1>
        <p className="text-sm text-ink-600 mt-1">
          Weather telemetry calculated from district centroid coordinates to preserve field location privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-ink-600 font-semibold uppercase">Temperature</p>
            <p className="text-2xl font-extrabold text-ink-900">29°C</p>
            <p className="text-xs text-ink-600">Daytime High 32°C</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-ink-600 font-semibold uppercase">Precipitation</p>
            <p className="text-2xl font-extrabold text-ink-900">75%</p>
            <p className="text-xs text-ink-600">Monsoon Showers Expected</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-ink-600 font-semibold uppercase">Wind Speed</p>
            <p className="text-2xl font-extrabold text-ink-900">14 km/h</p>
            <p className="text-xs text-ink-600">Moderate North-East Breeze</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
