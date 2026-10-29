'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  ClipboardList,
  Eye,
  Droplets,
  FlaskConical,
  Bug,
  AlertTriangle,
  CloudSun,
  Wheat,
  Camera,
  FileText,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { farmService } from '@/services/farmService';
import {
  Plot,
  CropCycle,
  ActivityLog,
  InputApplication,
  Harvest,
  AdvisoryNote,
  Photo,
  LogType,
  InputType,
} from '@/types/farm';
import { ApiError } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table } from '@/components/ui/Table';
// Dynamically import heavy PhotoManager and WeatherWidget components
const PhotoManager = dynamic(
  () => import('@/components/farmer/PhotoManager').then((mod) => mod.PhotoManager),
  {
    loading: () => <Skeleton className="h-64 w-full rounded-card" />,
    ssr: false,
  }
);

const WeatherWidget = dynamic(
  () => import('@/components/farmer/WeatherWidget').then((mod) => mod.WeatherWidget),
  {
    loading: () => <Skeleton className="h-48 w-full rounded-card" />,
    ssr: false,
  }
);

type TabKey = 'overview' | 'logs' | 'inputs' | 'harvests' | 'photos' | 'officer-notes';

const LOG_TYPE_CONFIG: Record<
  LogType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  general: { label: 'General Work', icon: ClipboardList, color: 'text-ink-600 bg-sand-200' },
  observation: { label: 'Field Observation', icon: Eye, color: 'text-status-info bg-status-info-bg' },
  irrigation: { label: 'Irrigation & Water', icon: Droplets, color: 'text-green-700 bg-green-100' },
  fertilizer: { label: 'Fertilizer Application', icon: FlaskConical, color: 'text-earth-800 bg-earth-100' },
  pest_control: { label: 'Pest Scouting', icon: Bug, color: 'text-status-warning bg-status-warning-bg' },
  disease: { label: 'Disease Symptoms', icon: AlertTriangle, color: 'text-status-danger bg-status-danger-bg' },
  weather: { label: 'Weather Impact', icon: CloudSun, color: 'text-gold-700 bg-gold-100' },
};

function PlotDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const plotId = params.id as string;
  const initialTab = (searchParams.get('tab') as TabKey) || 'overview';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [plot, setPlot] = useState<Plot | null>(null);
  const [activeCycle, setActiveCycle] = useState<CropCycle | null>(null);
  const [allCycles, setAllCycles] = useState<CropCycle[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [inputs, setInputs] = useState<InputApplication[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notes, setNotes] = useState<AdvisoryNote[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync tab with URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    router.replace(`/farmer/plots/${plotId}?tab=${tab}`, { scroll: false });
  };

  // --- Modals State ---
  const [isCropCycleModalOpen, setIsCropCycleModalOpen] = useState(false);
  const [cropName, setCropName] = useState('Samba Rice');
  const [cropVariety, setCropVariety] = useState('BG 352');
  const [cycleStartDate, setCycleStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLogType, setSelectedLogType] = useState<LogType>('general');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logNotes, setLogNotes] = useState('');

  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [inputType, setInputType] = useState<InputType>('fertilizer');
  const [inputProductName, setInputProductName] = useState('');
  const [inputQuantity, setInputQuantity] = useState('50');
  const [inputUnit, setInputUnit] = useState('kg');
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputCost, setInputCost] = useState('');

  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState(false);
  const [harvestQuantity, setHarvestQuantity] = useState('1200');
  const [harvestUnit, setHarvestUnit] = useState('kg');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [harvestGrade, setHarvestGrade] = useState('Grade A (Standard Moisture)');
  const [harvestRevenue, setHarvestRevenue] = useState('');
  const [harvestNotes, setHarvestNotes] = useState('');

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load Plot Data & Sub-resources
  const loadPlotDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Plot details
      const plotData = await farmService.getPlotById(plotId);
      setPlot(plotData);

      // 2. Fetch Crop Cycles for this plot
      const cyclesRes = await farmService.getCropCycles({ plotId });
      const cyclesList = cyclesRes.data || [];
      setAllCycles(cyclesList);
      const active = cyclesList.find((c) => c.status === 'active') || cyclesList[0] || null;
      setActiveCycle(active);

      // 3. If there is an active cycle, fetch cycle-dependent sub-resources
      if (active) {
        try {
          const [logsRes, inputsRes, harvestsRes] = await Promise.all([
            farmService.getActivityLogs({ cycleId: active.id }),
            farmService.getInputApplications({ cycleId: active.id }),
            farmService.getHarvests({ cycleId: active.id }),
          ]);
          setLogs(logsRes.data || []);
          setInputs(inputsRes.data || []);
          setHarvests(harvestsRes.data || []);
        } catch {
          // Allow individual subresource graceful fallback
        }
      }

      // 4. Photos & Advisory Notes
      try {
        const [photosRes, notesList] = await Promise.all([
          farmService.getPlotPhotos(plotId),
          farmService.getPlotAdvisoryNotes(plotId),
        ]);
        setPhotos(photosRes.data || []);
        setNotes(notesList || []);
      } catch {
        // graceful fallback
      }
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Failed to load plot journal.');
    } finally {
      setIsLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    loadPlotDetails();
  }, [loadPlotDetails]);

  // --- Handlers ---
  const handleCreateCropCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);
    try {
      const newCycle = await farmService.createCropCycle({
        plotId,
        cropName: cropName.trim(),
        variety: cropVariety.trim() || undefined,
        startDate: cycleStartDate,
        status: 'active',
      });
      setActiveCycle(newCycle);
      setIsCropCycleModalOpen(false);
      setSuccessToast(`Crop cycle "${newCycle.cropName}" created.`);
      loadPlotDetails();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setModalError(apiErr?.message || 'Failed to start crop cycle.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) {
      setModalError('Please create an active crop cycle first.');
      return;
    }
    if (logNotes.trim().length < 2) {
      setModalError('Notes must be at least 2 characters.');
      return;
    }

    setModalError(null);
    setModalSubmitting(true);
    try {
      await farmService.createActivityLog({
        cycleId: activeCycle.id,
        logType: selectedLogType,
        logDate,
        notes: logNotes.trim(),
      });
      setIsLogModalOpen(false);
      setLogNotes('');
      setSuccessToast('Activity log recorded successfully.');
      // Refresh logs
      const logsRes = await farmService.getActivityLogs({ cycleId: activeCycle.id });
      setLogs(logsRes.data || []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setModalError(apiErr?.message || 'Failed to record log.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await farmService.deleteActivityLog(id);
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setSuccessToast('Activity log deleted.');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Failed to delete log.');
    }
  };

  const handleCreateInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) {
      setModalError('Please start a crop cycle before recording input applications.');
      return;
    }
    if (!inputProductName.trim()) {
      setModalError('Product name is required.');
      return;
    }
    const qty = parseFloat(inputQuantity);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Quantity must be a positive number.');
      return;
    }

    setModalError(null);
    setModalSubmitting(true);
    try {
      await farmService.createInputApplication({
        cycleId: activeCycle.id,
        inputType,
        name: inputProductName.trim(),
        quantity: qty,
        unit: inputUnit.trim(),
        applicationDate: inputDate,
        cost: inputCost ? parseFloat(inputCost) : null,
      });
      setIsInputModalOpen(false);
      setInputProductName('');
      setInputCost('');
      setSuccessToast('Input application recorded.');
      const res = await farmService.getInputApplications({ cycleId: activeCycle.id });
      setInputs(res.data || []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setModalError(apiErr?.message || 'Failed to record input.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteInput = async (id: string) => {
    try {
      await farmService.deleteInputApplication(id);
      setInputs((prev) => prev.filter((i) => i.id !== id));
      setSuccessToast('Input record deleted.');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Failed to delete input application.');
    }
  };

  const handleCreateHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCycle) {
      setModalError('An active crop cycle is required.');
      return;
    }
    const qty = parseFloat(harvestQuantity);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Harvest quantity must be a positive number.');
      return;
    }

    setModalError(null);
    setModalSubmitting(true);
    try {
      await farmService.createHarvest({
        cycleId: activeCycle.id,
        harvestDate,
        quantity: qty,
        unit: harvestUnit.trim(),
        qualityGrade: harvestGrade.trim() || null,
        revenue: harvestRevenue ? parseFloat(harvestRevenue) : null,
        notes: harvestNotes.trim() || null,
      });
      setIsHarvestModalOpen(false);
      setHarvestNotes('');
      setHarvestRevenue('');
      setSuccessToast('Harvest recorded successfully.');
      const res = await farmService.getHarvests({ cycleId: activeCycle.id });
      setHarvests(res.data || []);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setModalError(apiErr?.message || 'Failed to record harvest.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteHarvest = async (id: string) => {
    try {
      await farmService.deleteHarvest(id);
      setHarvests((prev) => prev.filter((h) => h.id !== id));
      setSuccessToast('Harvest record deleted.');
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setError(apiErr?.message || 'Failed to delete harvest.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton variant="text" width={140} height={24} />
        <div className="p-6 rounded-card bg-white border border-sand-200 shadow-card space-y-4">
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="text" width={280} height={36} />
          <Skeleton variant="text" width={320} height={20} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width={100} height={44} />
          <Skeleton variant="rectangular" width={100} height={44} />
          <Skeleton variant="rectangular" width={100} height={44} />
        </div>
        <Skeleton variant="rectangular" height={320} className="w-full" />
      </div>
    );
  }

  if (!plot) {
    return (
      <div className="space-y-4">
        <Link
          href="/farmer/plots"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Plots</span>
        </Link>
        <EmptyState
          title="Plot Not Found"
          description="The requested plot does not exist, or you do not have permission to view it."
          icon={AlertTriangle}
          action={{
            label: 'Return to Plots',
            onClick: () => router.push('/farmer/plots'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Back Link */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/farmer/plots"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Plots</span>
        </Link>

        {plot?.isShared ? (
          <Badge variant="shared" label="Shared with Extension Officer" />
        ) : (
          <Badge variant="private" label="Private Plot (Only You)" />
        )}
      </div>

      {successToast && (
        <Alert variant="success" onDismiss={() => setSuccessToast(null)}>
          {successToast}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          <div className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <button type="button" onClick={loadPlotDetails} className="text-xs font-bold underline">
              Retry
            </button>
          </div>
        </Alert>
      )}

      {/* Plot Header Banner */}
      <div className="p-6 rounded-card bg-white border border-sand-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-green-700">
            Plot Journal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-0.5">
            {plot?.name || <Skeleton variant="text" width={220} height={32} />}
          </h1>
          <p className="text-xs sm:text-sm text-ink-600 mt-1">
            District: <strong>{plot?.district}</strong> • Area: <strong>{plot?.areaHa} ha</strong> • Soil: <strong>{plot?.soilType || 'Unspecified'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!activeCycle ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCropCycleModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Start Crop Cycle
            </Button>
          ) : (
            <div className="p-2.5 rounded bg-green-50 border border-green-200 text-xs text-ink-900">
              <span className="text-ink-600 block">Active Crop Cycle:</span>
              <span className="font-bold text-green-800 text-sm">{activeCycle.cropName} ({activeCycle.variety || 'Standard'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-sand-200 overflow-x-auto">
        <nav aria-label="Plot detail tabs" className="flex space-x-2 sm:space-x-4 min-w-max">
          {(
            [
              { key: 'overview', label: 'Overview', icon: MapPin },
              { key: 'logs', label: `Activity Logs (${logs.length})`, icon: ClipboardList },
              { key: 'inputs', label: `Inputs Applied (${inputs.length})`, icon: FlaskConical },
              { key: 'harvests', label: `Harvests (${harvests.length})`, icon: Wheat },
              { key: 'photos', label: `Photos (${photos.length})`, icon: Camera },
              { key: 'officer-notes', label: `Officer Notes (${notes.length})`, icon: FileText },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-3 border-b-2 font-semibold text-sm transition-colors min-h-touch ${
                  isActive
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-sand-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW
      ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plot Characteristics &amp; Location Boundary</CardTitle>
              <CardDescription>
                Detailed agronomic metadata and encrypted boundary coordinates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded bg-sand-50 border border-sand-200">
                  <span className="text-xs text-ink-600 font-semibold block">Hectares (ha)</span>
                  <span className="text-lg font-bold text-ink-900">{plot?.areaHa} ha</span>
                </div>
                <div className="p-3 rounded bg-sand-50 border border-sand-200">
                  <span className="text-xs text-ink-600 font-semibold block">District</span>
                  <span className="text-lg font-bold text-ink-900">{plot?.district}</span>
                </div>
                <div className="p-3 rounded bg-sand-50 border border-sand-200">
                  <span className="text-xs text-ink-600 font-semibold block">Irrigation Source</span>
                  <span className="text-lg font-bold text-ink-900">{plot?.irrigationSource || 'Rainfed'}</span>
                </div>
              </div>

              {/* GPS Security Guarantee */}
              <div className="p-4 rounded-card bg-green-50 border border-green-200 text-sm space-y-2">
                <div className="flex items-center gap-2 text-green-900 font-bold">
                  <ShieldCheck className="w-5 h-5 text-green-700" />
                  <span>Hardware-Encrypted GPS (AES-256-GCM)</span>
                </div>
                <p className="text-xs text-green-800 leading-relaxed">
                  Exact coordinates are returned exclusively to you as the verified owner. Extension officers only receive blurred district-level coordinates to ensure privacy.
                </p>
                {plot?.gps && (
                  <div className="pt-2 text-xs font-mono text-green-900 flex gap-4">
                    <span>Latitude: {plot.gps.latitude}</span>
                    <span>Longitude: {plot.gps.longitude}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* District Agro-Weather Widget */}
          <WeatherWidget
            plotId={plotId}
            plotName={plot?.name}
            district={plot?.district}
          />

          {/* Active Cycle Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Crop Cycles ({allCycles.length})</CardTitle>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCropCycleModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  New Crop Cycle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allCycles.length === 0 ? (
                <EmptyState
                  icon={Wheat}
                  title="No Crop Cycles Started"
                  description="Start your first crop cycle for this plot to begin recording activities, inputs, and harvests."
                  action={{
                    label: 'Start Crop Cycle',
                    onClick: () => setIsCropCycleModalOpen(true),
                  }}
                />
              ) : (
                <Table
                  data={allCycles}
                  keyExtractor={(c) => c.id}
                  columns={[
                    { key: 'cropName', header: 'Crop' },
                    { key: 'variety', header: 'Variety', render: (c) => c.variety || 'Standard' },
                    { key: 'startDate', header: 'Start Date' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (c) => (
                        <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                          {c.status}
                        </span>
                      ),
                    },
                    {
                      key: 'estimatedYieldKg',
                      header: 'Est. Yield',
                      render: (c) => (c.estimatedYieldKg ? `${c.estimatedYieldKg} kg` : '—'),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================
          TAB 2: ACTIVITY LOGS
      ======================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink-900">Field Activity Timeline</h2>
              <p className="text-xs text-ink-600">Observations, weeding, canal openings, and scouting.</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsLogModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Activity Log
            </Button>
          </div>

          {logs.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={ClipboardList}
                title="No Activity Logs Recorded"
                description="Log your daily fieldwork observations and irrigation events to build a verifiable crop timeline."
                action={{
                  label: 'Add First Log',
                  onClick: () => setIsLogModalOpen(true),
                }}
              />
            </Card>
          ) : (
            <Card className="p-6">
              <div className="space-y-6">
                {logs.map((log, idx) => {
                  const cfg = LOG_TYPE_CONFIG[log.logType] || LOG_TYPE_CONFIG.general;
                  const Icon = cfg.icon;
                  return (
                    <div key={log.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {idx !== logs.length - 1 && (
                        <span className="absolute left-5 top-10 -bottom-2 w-0.5 bg-sand-200" aria-hidden="true" />
                      )}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${cfg.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 bg-sand-50/60 p-4 rounded-card border border-sand-200">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-sm text-ink-900">{cfg.label}</span>
                          <span className="text-xs text-ink-600 font-medium">{log.logDate}</span>
                        </div>
                        <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-line">{log.notes}</p>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-xs text-status-danger hover:underline min-h-[32px] px-2 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: INPUT APPLICATIONS
      ======================================================== */}
      {activeTab === 'inputs' && (
        <div className="space-y-6">
          {/* Mandatory Non-Prescriptive Safety Banner */}
          <div role="note" className="p-4 rounded-card bg-amber-50 border-2 border-gold-500/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-ink-900 leading-relaxed">
              <strong>REQUIRED REGULATORY NOTICE:</strong> Record what <strong>YOU</strong> applied. This app does not recommend products or doses. Free-text product names only. Never use AI to prescribe chemicals.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink-900">Input Applications Journal</h2>
              <p className="text-xs text-ink-600">Past fertilizer, organic matter, and pesticide applications.</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsInputModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Record Input Application
            </Button>
          </div>

          {inputs.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FlaskConical}
                title="No Input Applications Recorded"
                description="Keep a factual record of fertilizers, seeds, and inputs applied during this crop cycle."
                action={{
                  label: 'Record First Input',
                  onClick: () => setIsInputModalOpen(true),
                }}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table
                  data={inputs}
                  keyExtractor={(i) => i.id}
                  columns={[
                    { key: 'name', header: 'Product Name (Free-Text)' },
                    {
                      key: 'inputType',
                      header: 'Type',
                      render: (i) => <span className="capitalize">{i.inputType.replace('_', ' ')}</span>,
                    },
                    {
                      key: 'quantity',
                      header: 'Quantity Applied',
                      render: (i) => `${i.quantity} ${i.unit}`,
                    },
                    { key: 'applicationDate', header: 'Application Date' },
                    {
                      key: 'cost',
                      header: 'Cost (LKR)',
                      render: (i) => (i.cost ? `LKR ${i.cost.toLocaleString()}` : '—'),
                    },
                    {
                      key: 'actions',
                      header: '',
                      render: (i) => (
                        <button
                          type="button"
                          onClick={() => handleDeleteInput(i.id)}
                          aria-label={`Delete record for ${i.name}`}
                          className="p-1.5 text-status-danger hover:bg-status-danger-bg rounded min-h-touch min-w-touch flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 4: HARVESTS
      ======================================================== */}
      {activeTab === 'harvests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ink-900">Yield &amp; Harvest Log</h2>
              <p className="text-xs text-ink-600">Gathered quantity, quality grades, and seasonal revenue.</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setIsHarvestModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Log Harvest
            </Button>
          </div>

          {harvests.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Wheat}
                title="No Harvests Recorded Yet"
                description="Record your crop yield at the end of the harvest cycle with moisture grades and total quantity."
                action={{
                  label: 'Log Harvest Yield',
                  onClick: () => setIsHarvestModalOpen(true),
                }}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table
                  data={harvests}
                  keyExtractor={(h) => h.id}
                  columns={[
                    { key: 'harvestDate', header: 'Harvest Date' },
                    {
                      key: 'quantity',
                      header: 'Quantity',
                      render: (h) => <strong>{h.quantity} {h.unit}</strong>,
                    },
                    { key: 'qualityGrade', header: 'Quality Grade', render: (h) => h.qualityGrade || 'Standard' },
                    {
                      key: 'revenue',
                      header: 'Revenue (LKR)',
                      render: (h) => (h.revenue ? `LKR ${h.revenue.toLocaleString()}` : '—'),
                    },
                    { key: 'notes', header: 'Field Notes', render: (h) => h.notes || '—' },
                    {
                      key: 'actions',
                      header: '',
                      render: (h) => (
                        <button
                          type="button"
                          onClick={() => handleDeleteHarvest(h.id)}
                          aria-label="Delete harvest record"
                          className="p-1.5 text-status-danger hover:bg-status-danger-bg rounded min-h-touch min-w-touch flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 5: PHOTOS
      ======================================================== */}
      {activeTab === 'photos' && (
        <PhotoManager
          plotId={plotId}
          isPlotShared={plot.isShared}
          onPhotoUploaded={() => {
            farmService.getPlotPhotos(plotId).then((res) => setPhotos(res.data || []));
          }}
        />
      )}

      {/* ========================================================
          TAB 6: OFFICER NOTES
      ======================================================== */}
      {activeTab === 'officer-notes' && (
        <div className="space-y-6">
          <div className="p-4 rounded-card bg-status-info-bg border border-status-info/30 flex items-start gap-3">
            <FileText className="w-5 h-5 text-status-info shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-ink-900 leading-relaxed">
              <strong>Official Extension Notes:</strong> Verified agricultural extension officers can view your shared plot and record agronomic guidance here. Officers cannot edit your primary logs.
            </div>
          </div>

          {notes.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No Advisory Notes Yet"
                description="When your assigned extension officer reviews your shared plot, their certified recommendations will appear here."
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-ink-900">
                        Officer: {note.officerName || `ID #${note.officerId}`}
                      </span>
                      <span className="text-xs text-ink-600 font-medium">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-line">{note.notes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: START CROP CYCLE
      ======================================================== */}
      <Modal
        isOpen={isCropCycleModalOpen}
        onClose={() => setIsCropCycleModalOpen(false)}
        title="Start New Crop Cycle"
        description="Initialize a new seasonal cycle for this plot."
      >
        <form onSubmit={handleCreateCropCycle} className="space-y-4 py-2">
          {modalError && <Alert variant="error">{modalError}</Alert>}
          <Input
            label="Crop Name"
            required
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            placeholder="e.g. Samba Rice"
          />
          <Input
            label="Variety / Hybrid (Optional)"
            value={cropVariety}
            onChange={(e) => setCropVariety(e.target.value)}
            placeholder="e.g. BG 352"
          />
          <DatePicker
            label="Sowing / Start Date"
            required
            value={cycleStartDate}
            onChange={(e) => setCycleStartDate(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-sand-200">
            <Button variant="ghost" type="button" onClick={() => setIsCropCycleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Start Cycle
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: ADD ACTIVITY LOG
      ======================================================== */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Add Activity Log"
        description="Select category and record field observations or operations."
      >
        <form onSubmit={handleCreateLog} className="space-y-4 py-2">
          {modalError && <Alert variant="error">{modalError}</Alert>}

          {/* Icon-tile type selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-ink-900 block">Activity Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(LOG_TYPE_CONFIG) as LogType[]).map((type) => {
                const item = LOG_TYPE_CONFIG[type];
                const Icon = item.icon;
                const isSelected = selectedLogType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedLogType(type)}
                    className={`p-2.5 rounded-card border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all min-h-touch ${
                      isSelected
                        ? 'border-green-600 bg-green-50 text-green-800 shadow-sm'
                        : 'border-sand-200 bg-white text-ink-600 hover:border-sand-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <DatePicker
            label="Log Date"
            required
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
          />

          <Textarea
            label="Observation Notes"
            required
            rows={3}
            value={logNotes}
            onChange={(e) => setLogNotes(e.target.value)}
            placeholder="Describe soil moisture, leaf condition, or water depth..."
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-sand-200">
            <Button variant="ghost" type="button" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Save Log
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: RECORD INPUT APPLICATION
      ======================================================== */}
      <Modal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        title="Record Input Application"
        description="Record what YOU applied. Strictly free-text entry without automatic recommendations."
      >
        <form onSubmit={handleCreateInput} className="space-y-4 py-2">
          {modalError && <Alert variant="error">{modalError}</Alert>}

          <Select
            label="Input Classification"
            required
            value={inputType}
            onChange={(e) => setInputType(e.target.value as InputType)}
            options={[
              { value: 'fertilizer', label: 'Fertilizer' },
              { value: 'pesticide', label: 'Pesticide' },
              { value: 'seed', label: 'Seed' },
              { value: 'organic_matter', label: 'Organic Compost / Manure' },
              { value: 'other', label: 'Other Input' },
            ]}
          />

          {/* Free text product name - strictly NO autocomplete per safety rules */}
          <Input
            label="Product Name (Free-Text Only)"
            required
            autoComplete="off"
            value={inputProductName}
            onChange={(e) => setInputProductName(e.target.value)}
            placeholder="Type exact product name as labeled on package..."
            helperText="No autocomplete or product suggestions are provided."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity"
              type="number"
              step="0.01"
              required
              value={inputQuantity}
              onChange={(e) => setInputQuantity(e.target.value)}
              placeholder="50"
            />
            <Select
              label="Unit"
              required
              value={inputUnit}
              onChange={(e) => setInputUnit(e.target.value)}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'litres', label: 'Litres (L)' },
                { value: 'packets', label: 'Packets' },
                { value: 'grams', label: 'Grams (g)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Application Date"
              required
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
            />
            <Input
              label="Total Cost (LKR, Optional)"
              type="number"
              value={inputCost}
              onChange={(e) => setInputCost(e.target.value)}
              placeholder="Optional cost"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-sand-200">
            <Button variant="ghost" type="button" onClick={() => setIsInputModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Record Input
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: LOG HARVEST
      ======================================================== */}
      <Modal
        isOpen={isHarvestModalOpen}
        onClose={() => setIsHarvestModalOpen(false)}
        title="Log Harvest Yield"
        description="Record gathered yield and quality parameters."
      >
        <form onSubmit={handleCreateHarvest} className="space-y-4 py-2">
          {modalError && <Alert variant="error">{modalError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity Harvested"
              type="number"
              step="0.01"
              required
              value={harvestQuantity}
              onChange={(e) => setHarvestQuantity(e.target.value)}
              placeholder="1200"
            />
            <Select
              label="Unit"
              required
              value={harvestUnit}
              onChange={(e) => setHarvestUnit(e.target.value)}
              options={[
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'sacks', label: 'Sacks / Bags' },
                { value: 'tonnes', label: 'Metric Tonnes' },
              ]}
            />
          </div>

          <DatePicker
            label="Harvest Date"
            required
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
          />

          <Input
            label="Quality Grade / Moisture Assessment"
            value={harvestGrade}
            onChange={(e) => setHarvestGrade(e.target.value)}
            placeholder="e.g. Grade A, Moisture 14%"
          />

          <Input
            label="Total Gross Revenue (LKR, Optional)"
            type="number"
            value={harvestRevenue}
            onChange={(e) => setHarvestRevenue(e.target.value)}
            placeholder="Optional revenue in LKR"
          />

          <Textarea
            label="Harvest Field Notes"
            rows={2}
            value={harvestNotes}
            onChange={(e) => setHarvestNotes(e.target.value)}
            placeholder="Weather conditions during harvesting, storage notes..."
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-sand-200">
            <Button variant="ghost" type="button" onClick={() => setIsHarvestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={modalSubmitting}>
              Save Harvest
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function PlotDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-6">
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="rectangular" width="100%" height={200} />
        </div>
      }
    >
      <PlotDetailContent />
    </Suspense>
  );
}
