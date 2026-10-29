'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Search,
  RefreshCw,
  Clock,
  Layers,
  FileText,
  Package,
  Tractor,
  Camera,
  MessageSquare,
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  Mail,
} from 'lucide-react';
import { officerService, OfficerPlotQueryParams } from '@/services/officerService';
import { OfficerPlotItem } from '@/types/farm';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { BackButton } from '@/components/ui/BackButton';

const SCOPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  crop_cycles: { label: 'Crop Cycles', icon: Layers },
  activity_logs: { label: 'Activity Logs', icon: FileText },
  input_applications: { label: 'Inputs', icon: Package },
  harvests: { label: 'Harvests', icon: Tractor },
  photos: { label: 'Photos', icon: Camera },
  advisory_notes: { label: 'Advisory Notes', icon: MessageSquare },
  view_only: { label: 'View Only', icon: Lock },
  advisory: { label: 'Advisory', icon: MessageSquare },
  full: { label: 'Full Access', icon: ShieldCheck },
};

function formatExpiryCountdown(expiresAt: string | null) {
  if (!expiresAt) {
    return {
      label: 'No Expiration',
      badgeClass: 'bg-green-100 text-green-800 border-green-300',
    };
  }

  const expTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = expTime - now;

  if (diffMs <= 0) {
    return {
      label: 'Expired',
      badgeClass: 'bg-status-warning-bg text-status-warning border-status-warning/30',
    };
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (days > 1) {
    return {
      label: `Expires in ${days} days`,
      badgeClass: 'bg-green-100 text-green-800 border-green-300',
    };
  }

  return {
    label: `Expires in ${hours}h`,
    badgeClass: 'bg-gold-100 text-gold-700 border-gold-300',
  };
}

export default function OfficerSharedPlotsPage() {
  const [plots, setPlots] = useState<OfficerPlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  // Fetch shared plots
  const loadPlots = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    const params: OfficerPlotQueryParams = {
      limit: 100,
    };
    if (selectedDistrict) params.district = selectedDistrict;
    if (searchQuery.trim()) params.q = searchQuery.trim();

    try {
      const res = await officerService.getOfficerPlots(params);
      setPlots(res.data);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to load shared plots. Please check your verification status or connection.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDistrict, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPlots();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadPlots]);

  // Extract districts for filter dropdown
  const districtOptions = useMemo(() => {
    const districts = Array.from(new Set(plots.map((p) => p.district).filter(Boolean))).sort();
    return [
      { value: '', label: 'All Districts' },
      ...districts.map((d) => ({ value: d, label: d })),
    ];
  }, [plots]);

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/officer" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Shared Farm Plots</h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Active plot shares granted to you by farmers. Exact GPS coordinates are blurred to district-level
            locations to protect farmer data privacy.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadPlots(true)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Plots
        </Button>
      </div>

      {/* Privacy reminder banner */}
      <div className="p-3.5 bg-green-50 border border-green-200 rounded-card flex items-center justify-between gap-3 text-xs text-ink-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-700 shrink-0" />
          <span>
            <strong>AGENTS.md Scope Boundary:</strong> You can only inspect records within explicitly granted scopes. Unauthorized or revoked plot shares return 404.
          </span>
        </div>
        <span className="text-green-800 font-bold shrink-0 hidden sm:inline">
          GPS Confidential
        </span>
      </div>

      {/* Search and District Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Search Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="plot-search" className="text-sm font-semibold text-ink-900">
                Search Plots or Farmers
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
                <input
                  id="plot-search"
                  type="text"
                  placeholder="Plot name, farmer name, district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white min-h-[42px]"
                />
              </div>
            </div>

            {/* District Filter */}
            <Select
              label="Filter by District"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              options={districtOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error alert */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Directory Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      ) : plots.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No Active Shared Plots Found"
          description={
            searchQuery || selectedDistrict
              ? 'No shared plots match your search criteria. Try clearing the filter.'
              : 'You have not been granted access to any farm plots yet. Once a farmer grants sharing access, it will appear here.'
          }
          action={
            searchQuery || selectedDistrict
              ? {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedDistrict('');
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {plots.map((plot) => {
            const expiry = formatExpiryCountdown(plot.share.expiresAt);
            const scopesList =
              plot.share.scopes && plot.share.scopes.length > 0
                ? plot.share.scopes
                : [plot.share.scope];

            return (
              <Card key={plot.id} className="hover:border-green-600 transition-all hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Plot Info */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-extrabold text-lg text-ink-900">{plot.name}</h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-sand-200 text-ink-900">
                          <MapPin className="w-3 h-3 text-green-700" />
                          {plot.district}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${expiry.badgeClass}`}
                        >
                          <Clock className="w-3 h-3" />
                          {expiry.label}
                        </span>
                      </div>

                      {/* Agronomic Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-ink-600">
                        <div>
                          <span>Area: </span>
                          <strong className="text-ink-900 font-semibold">{plot.areaHa} ha</strong>
                        </div>
                        {plot.soilType && (
                          <div>
                            <span>Soil: </span>
                            <strong className="text-ink-900 font-semibold">{plot.soilType}</strong>
                          </div>
                        )}
                        {plot.irrigationSource && (
                          <div>
                            <span>Irrigation: </span>
                            <strong className="text-ink-900 font-semibold">{plot.irrigationSource}</strong>
                          </div>
                        )}
                      </div>

                      {/* Farmer Details */}
                      <div className="p-3 bg-sand-50 rounded-lg border border-sand-200 text-xs text-ink-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-green-900">
                          <User className="w-3.5 h-3.5 text-green-700" />
                          <span>Farmer: {plot.farmer.fullName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-ink-600 text-[11px] pt-0.5">
                          {plot.farmer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {plot.farmer.email}
                            </span>
                          )}
                          {plot.farmer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {plot.farmer.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Permitted Scopes */}
                      <div className="pt-1">
                        <p className="text-xs font-bold text-ink-900 mb-1.5">Granted Access Scopes:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {scopesList.map((scopeKey) => {
                            const meta = SCOPE_META[scopeKey] || {
                              label: scopeKey,
                              icon: ShieldCheck,
                            };
                            const ScopeIcon = meta.icon;
                            return (
                              <span
                                key={scopeKey}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-sand-200 text-ink-900 border border-sand-300"
                              >
                                <ScopeIcon className="w-3 h-3 text-green-700" />
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Inspect CTA */}
                    <div className="shrink-0 flex items-center md:items-start pt-2 md:pt-0">
                      <Link href={`/officer/shared-plots/${plot.id}`} className="w-full sm:w-auto">
                        <Button
                          variant="primary"
                          rightIcon={<ArrowRight className="w-4 h-4" />}
                          className="w-full sm:w-auto"
                        >
                          Inspect Plot Records
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
