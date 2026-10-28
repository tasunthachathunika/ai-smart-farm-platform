'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sparkles,
  Plus,
  FileText,
  Layers,
  Package,
  Tractor,
  Camera,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { officerService } from '@/services/officerService';
import { aiService } from '@/services/aiService';
import {
  OfficerPlotItem,
  CropCycle,
  ActivityLog,
  InputApplication,
  Harvest,
  Photo,
  OfficerAdvisoryNote,
  VisitPrepOutput,
  AIServiceResponse,
} from '@/types/farm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { AIResultCard } from '@/components/ui/AIResultCard';

function SharedPlotDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const plotId = params.id as string;
  const initialTab = searchParams.get('tab') || 'overview';

  // Core State
  const [plot, setPlot] = useState<OfficerPlotItem | null>(null);
  const [isLoadingPlot, setIsLoadingPlot] = useState<boolean>(true);
  const [isAccessWithdrawn, setIsAccessWithdrawn] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [scopeForbidden, setScopeForbidden] = useState<Record<string, boolean>>({});

  // Scoped Data State
  const [cropCycles, setCropCycles] = useState<CropCycle[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [inputApplications, setInputApplications] = useState<InputApplication[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [advisoryNotes, setAdvisoryNotes] = useState<OfficerAdvisoryNote[]>([]);
  const [isLoadingTabContent, setIsLoadingTabContent] = useState<boolean>(false);

  // AI Visit Prep State
  const [isVisitPrepLoading, setIsVisitPrepLoading] = useState<boolean>(false);
  const [visitPrepResult, setVisitPrepResult] = useState<AIServiceResponse<VisitPrepOutput> | null>(null);
  const [visitPrepError, setVisitPrepError] = useState<string | null>(null);

  // Advisory Note Form Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [noteVisitDate, setNoteVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [noteObservations, setNoteObservations] = useState<string>('');
  const [noteRecommendations, setNoteRecommendations] = useState<string>('');
  const [noteOutcome, setNoteOutcome] = useState<string>('');
  const [noteFollowUpDate, setNoteFollowUpDate] = useState<string>('');
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteFormError, setNoteFormError] = useState<string | null>(null);

  // 1. Fetch Plot Metadata & Check Revocation Status
  const loadPlotMetadata = useCallback(async () => {
    setIsLoadingPlot(true);
    setGeneralError(null);

    try {
      const plotData = await officerService.getOfficerPlotById(plotId);
      setPlot(plotData);
      setIsAccessWithdrawn(false);
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
      // Requirement 5: Any 404 switches to "Access withdrawn" screen and halts further requests
      if (errObj?.response?.status === 404 || errObj?.message?.includes('404')) {
        setIsAccessWithdrawn(true);
      } else {
        setGeneralError(
          errObj?.response?.data?.error?.message ||
            errObj?.message ||
            'Unable to load shared plot details. Please check your connection.'
        );
      }
    } finally {
      setIsLoadingPlot(false);
    }
  }, [plotId]);

  useEffect(() => {
    loadPlotMetadata();
  }, [loadPlotMetadata]);

  // Derived available tabs based strictly on granted scopes
  const availableTabs = useMemo(() => {
    if (!plot) return [];

    const scopes = plot.share.scopes || [];
    const isFull = scopes.includes('full') || plot.share.scope === 'full';

    const tabs: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [];

    // Overview is always accessible if plot metadata is shared
    tabs.push({ key: 'overview', label: 'Plot Overview', icon: MapPin });

    if (isFull || scopes.includes('crop_cycles') || plot.share.scope === 'view_only' || plot.share.scope === 'advisory') {
      tabs.push({ key: 'crop_cycles', label: 'Crop Cycles', icon: Layers });
    }
    if (isFull || scopes.includes('activity_logs') || plot.share.scope === 'view_only' || plot.share.scope === 'advisory') {
      tabs.push({ key: 'activity_logs', label: 'Activity Logs', icon: FileText });
    }
    if (isFull || scopes.includes('input_applications') || plot.share.scope === 'view_only') {
      tabs.push({ key: 'input_applications', label: 'Inputs Applied', icon: Package });
    }
    if (isFull || scopes.includes('harvests') || plot.share.scope === 'view_only') {
      tabs.push({ key: 'harvests', label: 'Harvest Logs', icon: Tractor });
    }
    if (isFull || scopes.includes('photos') || plot.share.scope === 'view_only') {
      tabs.push({ key: 'photos', label: 'Field Photos', icon: Camera });
    }
    if (isFull || scopes.includes('advisory_notes') || plot.share.scope === 'advisory') {
      tabs.push({ key: 'advisory_notes', label: 'Advisory Notes', icon: MessageSquare });
    }

    return tabs;
  }, [plot]);

  // Sync tab change with URL & validation
  const handleTabChange = (tabKey: string) => {
    setActiveTab(tabKey);
    router.replace(`/officer/shared-plots/${plotId}?tab=${tabKey}`, { scroll: false });
  };

  // If active tab is not among available tabs, default to first available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some((t) => t.key === activeTab)) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  // 2. Fetch data for the active tab (halted if access is withdrawn)
  const loadTabContent = useCallback(async () => {
    if (isAccessWithdrawn || !plot) return;

    setIsLoadingTabContent(true);
    try {
      if (activeTab === 'crop_cycles') {
        const res = await officerService.getPlotCropCycles(plotId, { limit: 50 });
        setCropCycles(res.data);
      } else if (activeTab === 'activity_logs') {
        const res = await officerService.getPlotActivityLogs(plotId, { limit: 50 });
        setActivityLogs(res.data);
      } else if (activeTab === 'input_applications') {
        const res = await officerService.getPlotInputApplications(plotId, { limit: 50 });
        setInputApplications(res.data);
      } else if (activeTab === 'harvests') {
        const res = await officerService.getPlotHarvests(plotId, { limit: 50 });
        setHarvests(res.data);
      } else if (activeTab === 'photos') {
        const res = await officerService.getPlotPhotos(plotId, { limit: 50 });
        setPhotos(res.data);
      } else if (activeTab === 'advisory_notes') {
        const res = await officerService.getPlotAdvisoryNotes(plotId, { limit: 50 });
        setAdvisoryNotes(res.data);
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number }; message?: string };
      if (errObj?.response?.status === 404 || errObj?.message?.includes('404')) {
        // Individual scope forbidden or overall share revoked
        setScopeForbidden((prev) => ({ ...prev, [activeTab]: true }));
      }
    } finally {
      setIsLoadingTabContent(false);
    }
  }, [activeTab, plotId, isAccessWithdrawn, plot]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabContent();
    }
  }, [activeTab, loadTabContent]);

  // 3. AI Visit Briefing Generator (POST /api/ai/visit-prep)
  const handleGenerateVisitPrep = async () => {
    setIsVisitPrepLoading(true);
    setVisitPrepError(null);
    setVisitPrepResult(null);

    try {
      const result = await aiService.generateVisitPrep({ plotId });
      setVisitPrepResult(result);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setVisitPrepError(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to generate visit briefing. Please verify your connection.'
      );
    } finally {
      setIsVisitPrepLoading(false);
    }
  };

  // 4. Submit Advisory Note
  const handleSubmitAdvisoryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteFormError(null);

    if (noteObservations.trim().length < 5) {
      setNoteFormError('Observations must be at least 5 characters long.');
      return;
    }

    // Combine form fields into structured notes body satisfying Zod schema
    const notesParts: string[] = [
      `Field Visit Date: ${noteVisitDate}`,
      `Observations:\n${noteObservations.trim()}`,
    ];

    if (noteOutcome.trim()) {
      notesParts.push(`Agreed Outcome / Action Plan:\n${noteOutcome.trim()}`);
    }

    if (noteFollowUpDate) {
      notesParts.push(`Recommended Follow-up Date: ${noteFollowUpDate}`);
    }

    setIsSubmittingNote(true);
    try {
      await officerService.createAdvisoryNote(plotId, {
        title: `Field Visit — ${noteVisitDate}`,
        notes: notesParts.join('\n\n'),
        recommendations: noteRecommendations.trim() || undefined,
      });

      setIsNoteModalOpen(false);
      setNoteObservations('');
      setNoteRecommendations('');
      setNoteOutcome('');
      setNoteFollowUpDate('');
      setSuccessToast('Advisory note recorded successfully.');

      // Refresh advisory notes list
      const updatedNotes = await officerService.getPlotAdvisoryNotes(plotId, { limit: 50 });
      setAdvisoryNotes(updatedNotes.data);
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
      if (errObj?.response?.status === 404) {
        setIsAccessWithdrawn(true);
        setIsNoteModalOpen(false);
      } else {
        setNoteFormError(
          errObj?.response?.data?.error?.message ||
            errObj?.message ||
            'Failed to save advisory note. Please try again.'
        );
      }
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // ---------------- REVOCATION SCREEN (Requirement 5) ----------------
  if (isAccessWithdrawn) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4" role="alert">
        <Card className="border-status-danger/30 bg-status-danger-bg/20 p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-status-danger-bg text-status-danger mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-status-danger text-white">
              <ShieldAlert className="w-3.5 h-3.5" />
              Access Withdrawn
            </span>
            <h1 className="text-2xl font-extrabold text-ink-900">
              Plot Sharing Terminated or Expired
            </h1>
            <p className="text-sm text-ink-600 max-w-lg mx-auto leading-relaxed">
              The farmer has revoked access to this plot, or the sharing duration has reached its expiry date.
              In accordance with the <strong>Goviya Plus Privacy Boundary</strong>, you can no longer view this plot&apos;s records.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-card border border-sand-200 text-xs text-ink-600 max-w-md mx-auto text-left">
            <p className="font-semibold text-ink-900">Security Enforcement Active:</p>
            <p className="mt-0.5">
              All further background API requests for this plot have been immediately halted to ensure complete data isolation.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Link href="/officer/shared-plots">
              <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Return to Shared Plots Directory
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Loading Skeleton
  if (isLoadingPlot) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (generalError || !plot) {
    return (
      <div className="space-y-4">
        <Link href="/officer/shared-plots" className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Shared Plots
        </Link>
        <Alert variant="error" title="Error Loading Plot">
          {generalError || 'Plot details could not be retrieved.'}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/officer/shared-plots"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-green-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shared Plots Directory
        </Link>
      </div>

      {/* Requirement 2: Mandatory Farmer Sharing Banner */}
      <div className="p-4 bg-sand-100/90 border border-sand-300 rounded-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-ink-900 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
          <div>
            <p className="font-bold text-sm text-green-950">
              Shared by {plot.farmer.fullName}
            </p>
            <p className="text-ink-600 text-xs">
              Contact: {plot.farmer.email} {plot.farmer.phone ? `• ${plot.farmer.phone}` : ''} •{' '}
              <span className="text-status-warning font-semibold">Access may be withdrawn by the farmer at any time.</span>
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-100 text-green-800 font-semibold text-xs shrink-0 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
          Active Read Share
        </span>
      </div>

      {/* Success Notification */}
      {successToast && (
        <Alert
          variant="success"
          title="Success"
          onDismiss={() => setSuccessToast(null)}
        >
          {successToast}
        </Alert>
      )}

      {/* Plot Metadata Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">
                  {plot.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-sand-200 text-ink-900">
                  <MapPin className="w-3.5 h-3.5 text-green-700" />
                  District: {plot.district}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-sand-100 text-ink-600 border border-sand-300">
                  Exact GPS: Confidential (Owner Only)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 text-ink-600">
                <div>
                  <span>Cultivated Area:</span>
                  <p className="font-bold text-ink-900 text-sm">{plot.areaHa} ha</p>
                </div>
                <div>
                  <span>Soil Classification:</span>
                  <p className="font-bold text-ink-900 text-sm">{plot.soilType || 'Unspecified'}</p>
                </div>
                <div>
                  <span>Water / Irrigation:</span>
                  <p className="font-bold text-ink-900 text-sm">{plot.irrigationSource || 'Rainfed'}</p>
                </div>
                <div>
                  <span>Share Granted:</span>
                  <p className="font-bold text-ink-900 text-sm">
                    {new Date(plot.share.grantedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirement 3: Generate Visit Briefing CTA */}
            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-2 pt-2 md:pt-0">
              <Button
                variant="primary"
                onClick={handleGenerateVisitPrep}
                isLoading={isVisitPrepLoading}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Generate Visit Briefing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Visit Briefing Result State (Requirement 3: In AIResultCard) */}
      {visitPrepError && (
        <Alert
          variant="error"
          title="Visit Briefing Error"
          onDismiss={() => setVisitPrepError(null)}
        >
          {visitPrepError}
        </Alert>
      )}

      {visitPrepResult && (
        <div className="space-y-2">
          <AIResultCard
            title="Agronomic Extension Visit Briefing"
            analysisType="visit_prep"
            summary={visitPrepResult.data.timelineSummary}
            overview={visitPrepResult.data.purpose}
            discussionQuestions={visitPrepResult.data.discussionQuestions}
            inspectionsRecommended={visitPrepResult.data.inspectionsRecommended}
            keyIssues={visitPrepResult.data.keyIssues?.map((issue) => ({
              text: issue.issue,
              action: issue.suggestedAction,
              sourceRecordIds: issue.sourceRecordIds,
            }))}
            isFallback={visitPrepResult.isFallback}
          />
        </div>
      )}

      {/* Requirement 2: Scoped Navigation Tabs (Show ONLY granted scopes) */}
      <div className="border-b border-sand-200">
        <nav className="flex space-x-2 overflow-x-auto pb-1" aria-label="Permitted Plot Scopes">
          {availableTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-colors min-h-touch ${
                  isActive
                    ? 'border-green-600 text-green-700 bg-green-50/50'
                    : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-sand-400'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <TabIcon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Scoped Content Area */}
      <div>
        {/* If category returned 404: Render "Not shared with you" panel */}
        {scopeForbidden[activeTab] ? (
          <Card className="border-dashed border-sand-400 bg-sand-50/50">
            <CardContent className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sand-200 text-ink-600 mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-ink-900">Category Not Shared with You</h3>
              <p className="text-xs text-ink-600 max-w-md mx-auto leading-relaxed">
                The farmer has not granted access to this data scope category. Farmers maintain granular control and can update their sharing preferences at any time.
              </p>
            </CardContent>
          </Card>
        ) : isLoadingTabContent ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        ) : (
          <>
            {/* TAB: Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Plot Characteristics</CardTitle>
                    <CardDescription>Basic field dimensions and regional context</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">Plot Name:</span>
                      <strong className="text-ink-900">{plot.name}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">District:</span>
                      <strong className="text-ink-900">{plot.district}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">Calculated Area:</span>
                      <strong className="text-ink-900">{plot.areaHa} ha</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">Soil Structure:</span>
                      <strong className="text-ink-900">{plot.soilType || 'Not specified'}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-ink-600">Water Source:</span>
                      <strong className="text-ink-900">{plot.irrigationSource || 'Rainfed'}</strong>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Farmer Ownership &amp; Share Scope</CardTitle>
                    <CardDescription>Grant boundaries defined by the producer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">Farmer:</span>
                      <strong className="text-ink-900">{plot.farmer.fullName}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">Farmer Email:</span>
                      <strong className="text-ink-900 font-mono text-xs">{plot.farmer.email}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-sand-200">
                      <span className="text-ink-600">Phone:</span>
                      <strong className="text-ink-900">{plot.farmer.phone || 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-ink-600">Share Expiry:</span>
                      <strong className="text-ink-900">
                        {plot.share.expiresAt ? new Date(plot.share.expiresAt).toLocaleDateString() : 'Continuous (No Expiry)'}
                      </strong>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB: Crop Cycles */}
            {activeTab === 'crop_cycles' && (
              <Card>
                <CardHeader>
                  <CardTitle>Crop Cycles &amp; Planting History</CardTitle>
                  <CardDescription>Seasonal stages, varieties, and target harvest dates</CardDescription>
                </CardHeader>
                <CardContent>
                  {cropCycles.length === 0 ? (
                    <EmptyState
                      icon={Layers}
                      title="No Crop Cycles Recorded"
                      description="The farmer has not logged any crop cycles for this plot yet."
                    />
                  ) : (
                    <Table
                      data={cropCycles}
                      keyExtractor={(c) => c.id}
                      columns={[
                        { key: 'cropName', header: 'Crop' },
                        { key: 'variety', header: 'Variety', render: (c) => c.variety || 'Standard' },
                        { key: 'startDate', header: 'Planting Date' },
                        { key: 'status', header: 'Status', render: (c) => (
                          <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                            {c.status}
                          </span>
                        )},
                        { key: 'estimatedYieldKg', header: 'Est. Yield', render: (c) => c.estimatedYieldKg ? `${c.estimatedYieldKg} kg` : '—' },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB: Activity Logs */}
            {activeTab === 'activity_logs' && (
              <Card>
                <CardHeader>
                  <CardTitle>Field Activity Logs</CardTitle>
                  <CardDescription>Farmer field notes, irrigation, and weather observations</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLogs.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No Activity Logs"
                      description="No field activities have been logged for this plot."
                    />
                  ) : (
                    <Table
                      data={activityLogs}
                      keyExtractor={(l) => l.id}
                      columns={[
                        { key: 'logDate', header: 'Date' },
                        { key: 'logType', header: 'Category', render: (l) => (
                          <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-sand-200 text-ink-900">
                            {l.logType.replace(/_/g, ' ')}
                          </span>
                        )},
                        { key: 'notes', header: 'Field Observation / Notes' },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB: Input Applications */}
            {activeTab === 'input_applications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Input Applications</CardTitle>
                  <CardDescription>Fertilizers, organic matter, and field applications recorded by the farmer</CardDescription>
                </CardHeader>
                <CardContent>
                  {inputApplications.length === 0 ? (
                    <EmptyState
                      icon={Package}
                      title="No Inputs Recorded"
                      description="No fertilizer or input applications have been recorded."
                    />
                  ) : (
                    <Table
                      data={inputApplications}
                      keyExtractor={(i) => i.id}
                      columns={[
                        { key: 'applicationDate', header: 'Date' },
                        { key: 'name', header: 'Input Name' },
                        { key: 'inputType', header: 'Type', render: (i) => (
                          <span className="capitalize px-2 py-0.5 rounded text-xs font-semibold bg-sand-200 text-ink-900">
                            {i.inputType.replace(/_/g, ' ')}
                          </span>
                        )},
                        { key: 'quantity', header: 'Quantity', render: (i) => `${i.quantity} ${i.unit}` },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB: Harvests */}
            {activeTab === 'harvests' && (
              <Card>
                <CardHeader>
                  <CardTitle>Harvest History</CardTitle>
                  <CardDescription>Collected yields, quality grades, and harvest timing</CardDescription>
                </CardHeader>
                <CardContent>
                  {harvests.length === 0 ? (
                    <EmptyState
                      icon={Tractor}
                      title="No Harvests Recorded"
                      description="No harvest yields have been recorded for this plot."
                    />
                  ) : (
                    <Table
                      data={harvests}
                      keyExtractor={(h) => h.id}
                      columns={[
                        { key: 'harvestDate', header: 'Date' },
                        { key: 'quantity', header: 'Yield Amount', render: (h) => `${h.quantity} ${h.unit}` },
                        { key: 'qualityGrade', header: 'Grade', render: (h) => h.qualityGrade || 'Standard' },
                        { key: 'notes', header: 'Notes', render: (h) => h.notes || '—' },
                      ]}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB: Photos */}
            {activeTab === 'photos' && (
              <Card>
                <CardHeader>
                  <CardTitle>Field Inspection Photos</CardTitle>
                  <CardDescription>Crop observations and foliage health imagery</CardDescription>
                </CardHeader>
                <CardContent>
                  {photos.length === 0 ? (
                    <EmptyState
                      icon={Camera}
                      title="No Photos Available"
                      description="The farmer has not uploaded any plot photos."
                    />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {photos.map((photo) => (
                        <div key={photo.id} className="rounded-card border border-sand-200 overflow-hidden bg-sand-50">
                          <div className="aspect-square bg-sand-200 flex items-center justify-center text-ink-600">
                            <Camera className="w-8 h-8 opacity-40" />
                          </div>
                          <div className="p-2 text-xs">
                            <p className="font-semibold text-ink-900 truncate">{photo.originalName || 'Photo'}</p>
                            <p className="text-[10px] text-ink-600">{new Date(photo.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* TAB: Advisory Notes (Requirement 4) */}
            {activeTab === 'advisory_notes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-ink-900">Officer Field Advisories</h2>
                    <p className="text-xs text-ink-600">
                      Human agronomic recommendations provided to the farmer.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNoteModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Draft Advisory Note
                  </Button>
                </div>

                {advisoryNotes.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No Advisory Notes Yet"
                    description="You have not left any agronomic guidance or visit notes for this plot yet."
                    action={{
                      label: 'Draft Advisory Note',
                      onClick: () => setIsNoteModalOpen(true),
                      icon: <Plus className="w-4 h-4" />,
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {advisoryNotes.map((note) => (
                      <Card key={note.id} className="border-l-4 border-l-green-600">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-ink-900">{note.title}</h3>
                              {/* Mandatory Requirement 4 Label */}
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                                Written by officer
                              </span>
                            </div>
                            <time className="text-xs text-ink-600">
                              {new Date(note.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </time>
                          </div>

                          {/* Officer contact */}
                          <p className="text-xs text-ink-600">
                            Officer: <strong className="text-ink-900">{note.officerName}</strong> ({note.officerEmail})
                          </p>

                          {/* Note text / observations */}
                          <div className="text-xs sm:text-sm text-ink-900 whitespace-pre-line leading-relaxed p-3 bg-sand-50 rounded-lg border border-sand-200">
                            {note.notes}
                          </div>

                          {/* Recommendations section */}
                          {note.recommendations && (
                            <div className="text-xs sm:text-sm p-3 bg-green-50 rounded-lg border border-green-200 text-green-950">
                              <p className="font-bold text-xs uppercase tracking-wide text-green-800 mb-1">
                                Recommendations:
                              </p>
                              <p className="whitespace-pre-line leading-relaxed">{note.recommendations}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Advisory Note Drafting Modal (Requirement 4) */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Draft Agronomic Advisory Note"
        description="Provide verified field observations and cultural recommendations to the farmer. This note is signed with your officer credentials."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitAdvisoryNote} className="space-y-4">
          {/* Label Requirement: Written by officer, never AI */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-card flex items-start gap-2.5 text-xs text-ink-900">
            <ShieldCheck className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-green-900">Human Extension Advisory Notice</p>
              <p className="text-green-800 text-[11px] mt-0.5 leading-normal">
                This note is <strong>written by you as a certified officer</strong> (never AI). Never prescribe ungrounded chemical pesticides or hazardous dosages.
              </p>
            </div>
          </div>

          {noteFormError && (
            <Alert variant="error" title="Validation Error">
              {noteFormError}
            </Alert>
          )}

          {/* Form Field 1: Visit Date */}
          <DatePicker
            label="Field Visit Date"
            required
            value={noteVisitDate}
            onChange={(e) => setNoteVisitDate(e.target.value)}
          />

          {/* Form Field 2: Observations */}
          <Textarea
            label="Field Observations"
            required
            placeholder="Document crop foliage, pest presence, soil condition, water availability, growth stage..."
            value={noteObservations}
            onChange={(e) => setNoteObservations(e.target.value)}
            helperText="Minimum 5 characters. Treat all agronomic findings objectively."
            rows={3}
          />

          {/* Form Field 3: Recommendations */}
          <Textarea
            label="Agronomic Recommendations"
            placeholder="Suggest cultural management, organic composting, weeding intervals, irrigation schedules..."
            value={noteRecommendations}
            onChange={(e) => setNoteRecommendations(e.target.value)}
            helperText="Focus on safe management techniques and certified practices."
            rows={3}
          />

          {/* Form Field 4: Outcome / Action Plan */}
          <Input
            label="Agreed Outcome / Action Plan"
            placeholder="e.g. Farmer will adjust irrigation timing to early morning"
            value={noteOutcome}
            onChange={(e) => setNoteOutcome(e.target.value)}
          />

          {/* Form Field 5: Follow-up Date */}
          <DatePicker
            label="Recommended Follow-up Date"
            value={noteFollowUpDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setNoteFollowUpDate(e.target.value)}
            helperText="Optional target date for subsequent field inspection."
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-200">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              disabled={isSubmittingNote}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isSubmittingNote}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Save Advisory Note
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SharedPlotDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-4">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-40 w-full rounded-card" />
        </div>
      }
    >
      <SharedPlotDetailContent />
    </Suspense>
  );
}
