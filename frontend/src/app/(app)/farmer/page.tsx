'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Plus,
  CloudSun,
  ClipboardList,
  FlaskConical,
  Wheat,
  Camera,
  Sparkles,
  Thermometer,
  Droplets,
  Wind,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { farmService } from '@/services/farmService';
import { Plot, CropCycle, ActivityLog, WeatherData } from '@/types/farm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { TimelineItem } from '@/components/ui/TimelineItem';

export default function FarmerDashboard() {
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [plots, setPlots] = useState<Plot[]>([]);
  const [cycles, setCycles] = useState<Record<string, CropCycle>>({});
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch plots
      const plotsRes = await farmService.getPlots({ limit: 6 });
      const fetchedPlots = plotsRes.data || [];
      setPlots(fetchedPlots);

      // 2. Fetch active crop cycles for plots
      const cyclesMap: Record<string, CropCycle> = {};
      if (fetchedPlots.length > 0) {
        try {
          const cyclesRes = await farmService.getCropCycles({ status: 'active' });
          (cyclesRes.data || []).forEach((c) => {
            cyclesMap[c.plotId] = c;
          });
          setCycles(cyclesMap);
        } catch {
          // ignore cycle failures gracefully
        }

        // 3. Fetch weather for the primary plot
        try {
          const primaryPlot = fetchedPlots[0];
          const weatherData = await farmService.getPlotWeather(primaryPlot.id);
          setWeather(weatherData);
        } catch {
          setWeather(null);
        }
      }

      // 4. Fetch recent activity logs
      try {
        const logsRes = await farmService.getActivityLogs({ limit: 5 });
        setRecentLogs(logsRes.data || []);
      } catch {
        setRecentLogs([]);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load dashboard data. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Formatted date string
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const isNewFarmer = !isLoading && plots.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Greeting & Date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 sm:p-6 rounded-card bg-white border border-sand-200 shadow-card">
        <div>
          <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
            {todayFormatted}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-0.5">
            Ayubowan, {user?.fullName || 'Farmer'}!
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Review your plot conditions, recorded activities, and district telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/farmer/plots">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Add Plot
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadDashboardData}
              className="text-xs font-bold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        </Alert>
      )}

      {/* 2. Weather Card (Only shown if weather endpoint returns data) */}
      {weather && (
        <Card className="border-green-300 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3 border-b border-green-200/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <CloudSun className="w-5 h-5 text-green-700" aria-hidden="true" />
                <CardTitle className="text-base sm:text-lg">
                  District Forecast: {weather.district}
                </CardTitle>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {weather.isCached && (
                  <span className="px-2 py-0.5 rounded bg-sand-200 text-ink-900 font-semibold">
                    Cached
                  </span>
                )}
                <span className="text-ink-600">
                  Updated: {new Date(weather.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  onClick={() => farmService.getPlotWeather(weather.plotId, true).then(setWeather)}
                  className="p-1 rounded text-green-700 hover:bg-green-100 min-h-[32px] min-w-[32px] flex items-center justify-center transition-colors"
                  title="Refresh weather"
                  aria-label="Refresh weather data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <CardDescription className="text-xs text-ink-600">
              District centroid telemetry. Your exact GPS coordinates remain encrypted on disk.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-ink-600 font-semibold">Temperature</p>
                  <p className="text-xl font-bold text-ink-900">{weather.current.temperature}°C</p>
                  <p className="text-[11px] text-ink-600">{weather.current.weatherDescription}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-ink-600 font-semibold">Precipitation</p>
                  <p className="text-xl font-bold text-ink-900">{weather.current.precipitation} mm</p>
                  <p className="text-[11px] text-ink-600">Humidity: {weather.current.humidity}%</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
                  <Wind className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-ink-600 font-semibold">Wind Speed</p>
                  <p className="text-xl font-bold text-ink-900">{weather.current.windSpeed} km/h</p>
                </div>
              </div>

              {weather.daily && weather.daily.length > 0 && (
                <div className="flex flex-col justify-center">
                  <p className="text-xs text-ink-600 font-semibold">Tomorrow&apos;s Outlook</p>
                  <p className="text-sm font-bold text-ink-900">
                    {weather.daily[0]?.temperatureMax}°C / {weather.daily[0]?.temperatureMin}°C
                  </p>
                  <p className="text-[11px] text-ink-600 truncate">{weather.daily[0]?.weatherDescription}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Quick Actions Grid */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-600">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link href={plots.length > 0 ? `/farmer/plots/${plots[0].id}?tab=logs` : '/farmer/plots'} className="w-full">
            <button
              type="button"
              className="w-full min-h-touch p-3 rounded-card bg-white border border-sand-200 hover:border-green-600 hover:bg-green-50/50 shadow-card flex flex-col items-center justify-center text-center gap-1.5 transition-all text-ink-900"
            >
              <ClipboardList className="w-5 h-5 text-green-700" />
              <span className="text-xs font-bold">Add Log</span>
            </button>
          </Link>

          <Link href={plots.length > 0 ? `/farmer/plots/${plots[0].id}?tab=inputs` : '/farmer/plots'} className="w-full">
            <button
              type="button"
              className="w-full min-h-touch p-3 rounded-card bg-white border border-sand-200 hover:border-green-600 hover:bg-green-50/50 shadow-card flex flex-col items-center justify-center text-center gap-1.5 transition-all text-ink-900"
            >
              <FlaskConical className="w-5 h-5 text-earth-800" />
              <span className="text-xs font-bold">Record Input</span>
            </button>
          </Link>

          <Link href={plots.length > 0 ? `/farmer/plots/${plots[0].id}?tab=harvests` : '/farmer/plots'} className="w-full">
            <button
              type="button"
              className="w-full min-h-touch p-3 rounded-card bg-white border border-sand-200 hover:border-green-600 hover:bg-green-50/50 shadow-card flex flex-col items-center justify-center text-center gap-1.5 transition-all text-ink-900"
            >
              <Wheat className="w-5 h-5 text-gold-700" />
              <span className="text-xs font-bold">Log Harvest</span>
            </button>
          </Link>

          <Link href="/farmer/photos" className="w-full">
            <button
              type="button"
              className="w-full min-h-touch p-3 rounded-card bg-white border border-sand-200 hover:border-green-600 hover:bg-green-50/50 shadow-card flex flex-col items-center justify-center text-center gap-1.5 transition-all text-ink-900"
            >
              <Camera className="w-5 h-5 text-status-info" />
              <span className="text-xs font-bold">Upload Photo</span>
            </button>
          </Link>

          <Link href="/farmer/ai" className="w-full col-span-2 sm:col-span-1">
            <button
              type="button"
              className="w-full min-h-touch p-3 rounded-card bg-ai-50 border border-ai-300 hover:border-ai-600 hover:bg-ai-50/80 shadow-card flex flex-col items-center justify-center text-center gap-1.5 transition-all text-ai-800"
            >
              <Sparkles className="w-5 h-5 text-ai-600" />
              <span className="text-xs font-bold">Ask AI</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton variant="rectangular" width="100%" height={120} />
          <Skeleton variant="rectangular" width="100%" height={240} />
        </div>
      )}

      {/* 4. New-Farmer Empty State with Setup Checklist */}
      {isNewFarmer && (
        <Card className="p-6 md:p-8 bg-white border-2 border-dashed border-sand-300">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 mx-auto flex items-center justify-center">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ink-900">Welcome to Goviya Plus!</h3>
              <p className="text-sm text-ink-600 mt-1 leading-relaxed">
                You haven&apos;t registered any farm plots yet. Complete this quick setup checklist to start maintaining your private agricultural journal:
              </p>
            </div>

            <div className="text-left bg-sand-50 p-4 rounded-card border border-sand-200 space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div>
                  <p className="font-bold text-ink-900">Register your first plot</p>
                  <p className="text-xs text-ink-600">
                    Specify plot acreage, district, and coordinates. GPS is encrypted with AES-256.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-sand-300 text-ink-900 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div>
                  <p className="font-bold text-ink-900">Create an active crop cycle</p>
                  <p className="text-xs text-ink-600">
                    Record your crop variety (e.g. Samba rice, Big Onion) and sowing date.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-sand-300 text-ink-900 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div>
                  <p className="font-bold text-ink-900">Record daily logs &amp; inputs</p>
                  <p className="text-xs text-ink-600">
                    Log observations, inputs, and crop inspection photos as work happens.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-sand-300 text-ink-900 font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <div>
                  <p className="font-bold text-ink-900">Share with extension officer</p>
                  <p className="text-xs text-ink-600">
                    Optionally grant view-only access to certified officers for advisory guidance.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/farmer/plots">
                <Button variant="primary" size="lg" leftIcon={<Plus className="w-5 h-5" />}>
                  Register First Plot Now
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* 5. Plot Cards Section */}
      {!isLoading && plots.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Registered Plots ({plots.length})</h2>
            <Link href="/farmer/plots" className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1">
              <span>View all plots</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plots.map((plot) => {
              const activeCycle = cycles[plot.id];
              return (
                <Link key={plot.id} href={`/farmer/plots/${plot.id}`} className="group">
                  <Card className="h-full hover:border-green-600 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors truncate">
                          {plot.name}
                        </h3>
                        {plot.isShared ? (
                          <Badge variant="shared" size="sm" />
                        ) : (
                          <Badge variant="private" size="sm" />
                        )}
                      </div>

                      <p className="text-xs text-ink-600 mb-3">
                        District: <strong>{plot.district}</strong> • {plot.areaHa} ha
                      </p>

                      <div className="p-2.5 rounded bg-sand-50 border border-sand-200/80 text-xs text-ink-900 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-ink-600">Active Crop:</span>
                          <span className="font-bold">{activeCycle?.cropName || plot.activeCrop || 'None active'}</span>
                        </div>
                        {activeCycle?.status && (
                          <div className="flex justify-between">
                            <span className="text-ink-600">Cycle Status:</span>
                            <span className="font-semibold capitalize text-green-700">{activeCycle.status}</span>
                          </div>
                        )}
                        {plot.soilType && (
                          <div className="flex justify-between">
                            <span className="text-ink-600">Soil:</span>
                            <span>{plot.soilType}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-sand-200/60 flex items-center justify-between text-xs font-semibold text-green-700">
                      <span>Open plot journal</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Recent Activity Timeline */}
      {!isLoading && recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-700" />
                <CardTitle className="text-base sm:text-lg">Recent Field Activity Timeline</CardTitle>
              </div>
            </div>
            <CardDescription>Latest observations recorded across your active cycles.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {recentLogs.map((log, idx) => (
              <TimelineItem
                key={log.id}
                icon={ClipboardList}
                title={`Log Type: ${log.logType}`}
                date={log.logDate}
                notes={log.notes}
                isLast={idx === recentLogs.length - 1}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
