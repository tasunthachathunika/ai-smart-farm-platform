'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  MapPin,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Users,
  Tractor,
  Layers,
  ArrowRight,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { officerService } from '@/services/officerService';
import { OfficerPlotItem } from '@/types/farm';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';

export default function OfficerDashboard() {
  const { user } = useAuthStore();
  const [plots, setPlots] = useState<OfficerPlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch officer plots from GET /api/officer/plots
  const loadOfficerData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await officerService.getOfficerPlots({ limit: 100 });
      setPlots(res.data);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to load officer dashboard data. Please try again.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOfficerData();
  }, [loadOfficerData]);

  // Derived metrics from GET /officer/plots only
  const metrics = useMemo(() => {
    const totalPlots = plots.length;
    const uniqueFarmers = new Set(plots.map((p) => p.farmer.id || p.farmer.fullName)).size;
    const uniqueDistricts = new Set(plots.map((p) => p.district)).size;
    const totalAreaHa = plots.reduce((sum, p) => sum + (Number(p.areaHa) || 0), 0);

    return {
      totalPlots,
      uniqueFarmers,
      uniqueDistricts,
      totalAreaHa: Math.round(totalAreaHa * 100) / 100,
    };
  }, [plots]);

  // Verification status banner variant
  const verificationBanner = useMemo(() => {
    if (user?.isActive === false) {
      return {
        variant: 'rejected' as const,
        icon: XCircle,
        title: 'Account Suspended or Rejected',
        badge: 'Suspended / Rejected',
        containerClass: 'bg-status-danger-bg text-status-danger border-status-danger/30',
        badgeClass: 'bg-status-danger text-white',
        description:
          'Your extension officer credentials have been suspended or rejected by administrators. Plot access is disabled.',
      };
    }

    if (!user?.isVerified) {
      return {
        variant: 'pending' as const,
        icon: Clock,
        title: 'Verification Pending Review',
        badge: 'Pending Review',
        containerClass: 'bg-status-warning-bg text-status-warning border-status-warning/40',
        badgeClass: 'bg-gold-700 text-white',
        description:
          'Your account is awaiting administrative verification from the Department of Agriculture. Plot access will unlock upon verification.',
      };
    }

    return {
      variant: 'approved' as const,
      icon: ShieldCheck,
      title: 'Verified Extension Officer',
      badge: 'Verified Officer',
      containerClass: 'bg-status-success-bg text-status-success border-status-success/30',
      badgeClass: 'bg-green-700 text-white',
      description:
        'Your credentials are certified by the Department of Agriculture. You have authorized access to view active shared farm records.',
    };
  }, [user]);

  const BannerIcon = verificationBanner.icon;

  return (
    <div className="space-y-6">
      {/* Officer Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-card bg-green-50 border border-green-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-green-700">
            Agricultural Extension Officer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-1">
            Welcome, Officer {user?.fullName || 'Colleague'}!
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Review shared farm plots, inspect crop health timelines, and issue verified agronomic notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadOfficerData(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <Link href="/officer/shared-plots">
            <Button variant="primary" leftIcon={<MapPin className="w-4 h-4" />}>
              View Shared Plots
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Verification Banner: Pending = Yellow, Approved = Green, Rejected = Red */}
      <div
        className={`p-4 rounded-card border flex items-start gap-3.5 transition-colors ${verificationBanner.containerClass}`}
        role="status"
        aria-live="polite"
      >
        <BannerIcon className="w-6 h-6 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-xs sm:text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-base">{verificationBanner.title}</h3>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${verificationBanner.badgeClass}`}
            >
              {verificationBanner.badge}
            </span>
          </div>
          <p className="mt-1 opacity-90 leading-relaxed">{verificationBanner.description}</p>
        </div>
      </div>

      {/* Security Privacy Notice Card */}
      <div className="p-4 rounded-card bg-white border border-sand-200 shadow-card flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
        <div className="text-xs text-ink-900 space-y-1">
          <h4 className="font-bold text-sm">Privacy &amp; Scope Boundary Notice</h4>
          <p className="text-ink-600 leading-relaxed">
            Exact GPS coordinates are never disclosed to officers; you receive blurred district-level locations.
            Every record view logs an immutable <code className="font-mono bg-sand-200 px-1 py-0.5 rounded text-[11px]">plot_viewed_by_officer</code> audit event visible to the farmer. Unauthorized or revoked plot shares return 404.
          </p>
        </div>
      </div>

      {errorMessage && (
        <Alert
          variant="error"
          title="Dashboard Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* 2. Summary Counts Derived from GET /officer/plots only */}
      <div>
        <h2 className="text-base font-bold text-ink-900 mb-3">Portfolio Overview</h2>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Active Shared Plots */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-ink-600">
                  <span className="font-semibold">Shared Plots</span>
                  <div className="p-1.5 rounded-full bg-green-100 text-green-700">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-ink-900 mt-2">
                  {metrics.totalPlots}
                </div>
                <p className="text-[11px] text-ink-600 mt-0.5">Active shares granted</p>
              </CardContent>
            </Card>

            {/* Farmers Supported */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-ink-600">
                  <span className="font-semibold">Farmers Supported</span>
                  <div className="p-1.5 rounded-full bg-status-info-bg text-status-info">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-ink-900 mt-2">
                  {metrics.uniqueFarmers}
                </div>
                <p className="text-[11px] text-ink-600 mt-0.5">Individual producers</p>
              </CardContent>
            </Card>

            {/* Total Area */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-ink-600">
                  <span className="font-semibold">Area under Advisory</span>
                  <div className="p-1.5 rounded-full bg-earth-100 text-earth-800">
                    <Tractor className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-ink-900 mt-2">
                  {metrics.totalAreaHa} <span className="text-sm font-normal text-ink-600">ha</span>
                </div>
                <p className="text-[11px] text-ink-600 mt-0.5">Cultivated farmland</p>
              </CardContent>
            </Card>

            {/* Districts Covered */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-xs text-ink-600">
                  <span className="font-semibold">Districts Covered</span>
                  <div className="p-1.5 rounded-full bg-gold-100 text-gold-700">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-ink-900 mt-2">
                  {metrics.uniqueDistricts}
                </div>
                <p className="text-[11px] text-ink-600 mt-0.5">Agricultural zones</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/officer/shared-plots" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
                Shared Farm Plots
              </h3>
              <p className="text-xs text-ink-600 mt-1">
                Access plots where farmers have explicitly granted an active, unexpired view share.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/officer/notes" className="group">
          <Card className="h-full hover:border-green-600 transition-colors">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-full bg-status-info-bg text-status-info flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-ink-900 group-hover:text-green-700 transition-colors">
                Advisory Notes Journal
              </h3>
              <p className="text-xs text-ink-600 mt-1">
                Provide agronomic recommendations, visit observations, and field guidance directly to farmers.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Shared Plots Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-ink-900">Recently Shared Plots</h2>
          {plots.length > 0 && (
            <Link
              href="/officer/shared-plots"
              className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1"
            >
              <span>View all ({plots.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-card" />
            <Skeleton className="h-20 w-full rounded-card" />
          </div>
        ) : plots.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No Plots Shared Yet"
            description="When farmers grant you access to inspect their fields, the plots will appear here with permitted scopes and timeline records."
          />
        ) : (
          <div className="space-y-3">
            {plots.slice(0, 3).map((plot) => (
              <Card key={plot.id} className="hover:border-green-600 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-ink-900 text-sm sm:text-base">
                        {plot.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-sand-200 text-ink-900">
                        {plot.district}
                      </span>
                    </div>
                    <p className="text-xs text-ink-600">
                      Farmer: <strong className="text-ink-900">{plot.farmer.fullName}</strong> •{' '}
                      Area: <strong>{plot.areaHa} ha</strong>
                    </p>
                  </div>

                  <Link href={`/officer/shared-plots/${plot.id}`} className="shrink-0">
                    <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Inspect Plot
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
