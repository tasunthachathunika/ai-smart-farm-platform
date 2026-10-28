'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  Droplets,
  Wind,
  Thermometer,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Compass,
} from 'lucide-react';
import { farmService } from '@/services/farmService';
import { WeatherData } from '@/types/farm';
import { normalizeError } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export interface WeatherWidgetProps {
  plotId: string;
  plotName?: string;
  district?: string;
  className?: string;
  showDailyForecast?: boolean;
  onWeatherDataLoaded?: (data: WeatherData) => void;
}

/**
 * Returns an appropriate weather icon based on WMO weather code.
 */
function getWeatherIcon(weatherCode: number, isDay = true) {
  if (weatherCode === 0 || weatherCode === 1) {
    return isDay ? Sun : CloudSun;
  }
  if (weatherCode === 2 || weatherCode === 3) {
    return CloudSun;
  }
  if (weatherCode === 45 || weatherCode === 48) {
    return CloudFog;
  }
  if (
    (weatherCode >= 51 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    return CloudRain;
  }
  if (weatherCode >= 95 && weatherCode <= 99) {
    return CloudLightning;
  }
  return Cloud;
}

/**
 * Formats ISO timestamp into a human-readable relative time string:
 * "Last updated X ago"
 */
function formatTimeAgo(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return 'Recently';

    const diffMs = Date.now() - timestamp;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));

    if (diffSec < 60) {
      return 'just now';
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } catch {
    return 'recently';
  }
}

/**
 * Converts wind direction in degrees to a cardinal compass label.
 */
function formatWindDirection(deg?: number): string {
  if (deg === undefined || isNaN(deg)) return '';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  plotId,
  plotName,
  district,
  className = '',
  showDailyForecast = true,
  onWeatherDataLoaded,
}) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cachedWeather, setCachedWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch weather from backend API
  const fetchWeather = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!weather) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const data = await farmService.getPlotWeather(plotId, isManualRefresh);
        setWeather(data);
        setCachedWeather(data);
        if (onWeatherDataLoaded) {
          onWeatherDataLoaded(data);
        }
      } catch (err: unknown) {
        const apiErr = normalizeError(err);
        setError(apiErr.message || 'Unable to update weather data.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [plotId, weather, onWeatherDataLoaded]
  );

  useEffect(() => {
    fetchWeather(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId]);

  // Display data is either latest fetched weather or last cached weather
  const activeData = weather || cachedWeather;

  // Selected weather icon
  const WeatherIconComponent = useMemo(() => {
    if (!activeData?.current) return CloudSun;
    return getWeatherIcon(
      activeData.current.weatherCode,
      activeData.current.isDay ?? true
    );
  }, [activeData]);

  // Loading skeleton state
  if (isLoading && !activeData) {
    return (
      <Card className={`p-5 space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <Skeleton variant="text" width={180} height={20} />
          <Skeleton variant="rectangular" width={90} height={26} />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton variant="circular" width={56} height={56} />
          <div className="space-y-2">
            <Skeleton variant="text" width={120} height={32} />
            <Skeleton variant="text" width={160} height={16} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <Skeleton variant="rectangular" height={60} className="w-full" />
          <Skeleton variant="rectangular" height={60} className="w-full" />
          <Skeleton variant="rectangular" height={60} className="w-full" />
        </div>
      </Card>
    );
  }

  // Complete failure state (no cached data available)
  if (error && !activeData) {
    return (
      <Card className={`p-5 border-status-danger/30 bg-status-danger-bg/20 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-ink-900">Weather Telemetry Unavailable</h3>
              <p className="text-xs text-ink-600 mt-0.5">{error}</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchWeather(true)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="min-h-touch"
          >
            Retry Connection
          </Button>
        </div>
      </Card>
    );
  }

  if (!activeData) return null;

  const current = activeData.current;
  const isOfflineFallback = Boolean(error && activeData);

  return (
    <Card className={`overflow-hidden border border-sand-200 bg-white shadow-card ${className}`}>
      {/* Graceful Offline/Error Banner when showing cached copy */}
      {isOfflineFallback && (
        <div className="bg-status-warning-bg px-4 py-2.5 border-b border-status-warning/20 flex items-center justify-between gap-3 text-xs text-ink-900">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-status-warning shrink-0" />
            <span>
              <strong>Offline Mode:</strong> Showing cached forecast from{' '}
              {formatTimeAgo(activeData.lastUpdated)}. Live telemetry will resume automatically.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchWeather(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs font-bold text-ink-900 min-h-touch"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Header Bar */}
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-sand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base sm:text-lg font-bold text-ink-900">
              {plotName ? `${plotName} Weather` : 'District Agro-Weather'}
            </CardTitle>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sand-200 text-ink-700">
              {district || activeData.district}
            </span>
          </div>
          <p className="text-xs text-ink-600 mt-0.5">
            District centroid telemetry to ensure field GPS privacy
          </p>
        </div>

        {/* Live vs Cached Badge & Refresh Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {activeData.isFallback ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gold-100 text-gold-900 border border-gold-300">
              Fallback Data
            </span>
          ) : activeData.isCached ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sand-200 text-ink-800 border border-sand-400">
              Cached Forecast
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" aria-hidden="true" />
              Live Forecast
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchWeather(true)}
            isLoading={isRefreshing}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="min-h-touch px-2.5 text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
            aria-label="Refresh live weather forecast"
          >
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Main Current Conditions Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-card bg-sand-50/70 border border-sand-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sand-200 flex items-center justify-center text-green-800 shrink-0 shadow-sm">
              <WeatherIconComponent className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-ink-900 tracking-tight">
                  {Math.round(current.temperature)}°C
                </span>
                {current.apparentTemperature !== undefined && (
                  <span className="text-xs sm:text-sm font-medium text-ink-600">
                    Feels like {Math.round(current.apparentTemperature)}°C
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-green-800 capitalize mt-0.5">
                {current.weatherDescription}
              </p>
            </div>
          </div>

          {/* Last updated indicator */}
          <div className="text-xs text-ink-600 sm:text-right">
            <p className="font-semibold text-ink-700">
              Last updated {formatTimeAgo(activeData.lastUpdated)}
            </p>
            <p className="text-[11px] text-ink-600 mt-0.5" title={activeData.lastUpdated}>
              {new Date(activeData.lastUpdated).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Detailed Metrics Grid (Only fields the API actually returns) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Rainfall / Precipitation */}
          <div className="p-3.5 rounded-card border border-sand-200 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-ink-600 tracking-wider">
                Precipitation
              </span>
              <p className="text-base font-extrabold text-ink-900">
                {current.precipitation} mm
              </p>
              {current.rain !== undefined && current.rain > 0 && (
                <p className="text-[11px] text-ink-600">Rain: {current.rain} mm</p>
              )}
            </div>
          </div>

          {/* Humidity */}
          <div className="p-3.5 rounded-card border border-sand-200 bg-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sand-200 text-ink-700 flex items-center justify-center shrink-0">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-ink-600 tracking-wider">
                Rel. Humidity
              </span>
              <p className="text-base font-extrabold text-ink-900">
                {current.humidity}%
              </p>
              <p className="text-[11px] text-ink-600">
                {current.humidity > 70 ? 'High Moisture' : 'Comfortable'}
              </p>
            </div>
          </div>

          {/* Wind Speed & Direction */}
          <div className="p-3.5 rounded-card border border-sand-200 bg-white flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-full bg-sand-200 text-ink-700 flex items-center justify-center shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-ink-600 tracking-wider">
                Wind Speed
              </span>
              <p className="text-base font-extrabold text-ink-900">
                {current.windSpeed} km/h
              </p>
              {current.windDirection !== undefined && (
                <p className="text-[11px] text-ink-600 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-ink-600" />
                  <span>
                    {formatWindDirection(current.windDirection)} ({current.windDirection}°)
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Daily Forecast Strip (if daily items provided by API) */}
        {showDailyForecast && activeData.daily && activeData.daily.length > 0 && (
          <div className="pt-2">
            <h4 className="text-xs uppercase font-extrabold text-ink-700 tracking-wider mb-2.5">
              Upcoming Forecast
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {activeData.daily.slice(0, 5).map((day) => {
                const DayIcon = getWeatherIcon(day.weatherCode, true);
                const dayDate = new Date(day.date);
                const dayName = dayDate.toLocaleDateString(undefined, { weekday: 'short' });
                const dateNum = dayDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

                return (
                  <div
                    key={day.date}
                    className="p-3 rounded-card border border-sand-200 bg-sand-50/50 flex flex-col items-center text-center transition-colors hover:bg-sand-100/60"
                  >
                    <span className="text-xs font-bold text-ink-900">{dayName}</span>
                    <span className="text-[11px] text-ink-600 mb-1.5">{dateNum}</span>

                    <DayIcon className="w-6 h-6 text-green-700 my-1" />

                    <div className="mt-1 flex items-baseline gap-1 text-xs">
                      <span className="font-extrabold text-ink-900">
                        {Math.round(day.temperatureMax)}°
                      </span>
                      <span className="text-ink-600">/</span>
                      <span className="text-ink-600">
                        {Math.round(day.temperatureMin)}°
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[11px] text-status-info">
                      <Droplets className="w-3 h-3" />
                      <span>{day.precipitationSum} mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
