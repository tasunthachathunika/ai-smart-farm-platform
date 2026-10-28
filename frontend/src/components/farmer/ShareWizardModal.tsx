'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Layers,
  FileText,
  Package,
  Tractor,
  Camera,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { DatePicker } from '@/components/ui/DatePicker';
import { farmService } from '@/services/farmService';
import { shareService } from '@/services/shareService';
import { Plot, ShareScope } from '@/types/farm';

export interface ShareWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPlotId?: string;
}

// Preset certified agricultural extension officers
const VERIFIED_OFFICERS = [
  {
    id: 'b1a2c3d4-e5f6-7890-abcd-111111111111',
    fullName: 'Aruna Wickramasinghe',
    email: 'aruna.officer@goviya.lk',
    department: 'Department of Agriculture — Field Advisory Div.',
    district: 'Kurunegala / North Western',
    specialty: 'Paddy & Grain Legumes',
    isVerified: true,
  },
  {
    id: 'b1a2c3d4-e5f6-7890-abcd-222222222222',
    fullName: 'Chathuri Jayasuriya',
    email: 'chathuri.officer@goviya.lk',
    department: 'Department of Agrarian Development',
    district: 'Kandy / Central Province',
    specialty: 'Horticulture & Organic Farming',
    isVerified: true,
  },
  {
    id: 'b1a2c3d4-e5f6-7890-abcd-333333333333',
    fullName: 'Dr. Suminda Perera',
    email: 'suminda.officer@goviya.lk',
    department: 'Rice Research & Development Institute',
    district: 'Anuradhapura / North Central',
    specialty: 'Integrated Pest Management',
    isVerified: true,
  },
];

const SCOPE_DEFINITIONS: Array<{
  scope: ShareScope;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    scope: 'crop_cycles',
    title: 'Crop Cycles',
    description: 'Planting dates, varieties, crop growth stages, and yield targets.',
    icon: Layers,
  },
  {
    scope: 'activity_logs',
    title: 'Activity Logs',
    description: 'Daily field entries, weather notes, irrigation, and field tasks.',
    icon: FileText,
  },
  {
    scope: 'input_applications',
    title: 'Input Applications',
    description: 'Fertilizer types, application rates, organic amendments, and materials.',
    icon: Package,
  },
  {
    scope: 'harvests',
    title: 'Harvest Records',
    description: 'Harvest dates, collected weights, quality grades, and yield history.',
    icon: Tractor,
  },
  {
    scope: 'photos',
    title: 'Inspection Photos',
    description: 'Field photos showing crop progress, foliage health, and soil condition.',
    icon: Camera,
  },
  {
    scope: 'advisory_notes',
    title: 'Advisory Notes',
    description: 'Allow officer to view past advisory recommendations and write new notes.',
    icon: MessageSquare,
  },
];

type Step = 1 | 2 | 3;
type ExpiryPreset = '7' | '30' | '90' | 'custom';

export const ShareWizardModal: React.FC<ShareWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPlotId,
}) => {
  // Step navigation
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Form State
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [officerSearch, setOfficerSearch] = useState<string>('');
  const [customOfficerId, setCustomOfficerId] = useState<string>('');
  const [isUsingCustomOfficer, setIsUsingCustomOfficer] = useState<boolean>(false);

  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoadingPlots, setIsLoadingPlots] = useState<boolean>(false);
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);

  const [selectedScopes, setSelectedScopes] = useState<ShareScope[]>([
    'crop_cycles',
    'activity_logs',
    'input_applications',
    'harvests',
    'photos',
    'advisory_notes',
  ]);

  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>('30');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset or initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage(null);
      setIsSubmitting(false);
      setOfficerSearch('');
      setIsUsingCustomOfficer(false);
      setCustomOfficerId('');
      setExpiryPreset('30');

      // Default custom date to 30 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setCustomExpiryDate(defaultDate.toISOString().split('T')[0]);

      // Set initial officer if empty
      setSelectedOfficerId((current) => current || (VERIFIED_OFFICERS.length > 0 ? VERIFIED_OFFICERS[0].id : ''));

      // Fetch farmer's plots
      setIsLoadingPlots(true);
      farmService
        .getPlots({ limit: 100 })
        .then((res) => {
          setPlots(res.data);
          if (initialPlotId) {
            setSelectedPlotIds([initialPlotId]);
          } else if (res.data.length > 0) {
            setSelectedPlotIds(res.data.map((p) => p.id));
          }
        })
        .catch(() => {
          setErrorMessage('Unable to load plots. Please ensure your session is active.');
        })
        .finally(() => {
          setIsLoadingPlots(false);
        });
    }
  }, [isOpen, initialPlotId]);

  // Filter officers
  const filteredOfficers = useMemo(() => {
    const q = officerSearch.trim().toLowerCase();
    if (!q) return VERIFIED_OFFICERS;
    return VERIFIED_OFFICERS.filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        o.district.toLowerCase().includes(q) ||
        o.department.toLowerCase().includes(q) ||
        o.specialty.toLowerCase().includes(q)
    );
  }, [officerSearch]);

  const selectedOfficer = useMemo(() => {
    if (isUsingCustomOfficer) {
      return {
        id: customOfficerId,
        fullName: 'Custom Verified Officer',
        email: customOfficerId ? `${customOfficerId.slice(0, 8)}...` : '',
        department: 'Verified Extension Officer',
        district: 'Authorized Jurisdiction',
        specialty: 'Agricultural Extension',
        isVerified: true,
      };
    }
    return VERIFIED_OFFICERS.find((o) => o.id === selectedOfficerId) || null;
  }, [isUsingCustomOfficer, customOfficerId, selectedOfficerId]);

  // Calculate expiry date ISO string
  const computedExpiryDate = useMemo(() => {
    const d = new Date();
    if (expiryPreset === '7') {
      d.setDate(d.getDate() + 7);
      return d;
    }
    if (expiryPreset === '30') {
      d.setDate(d.getDate() + 30);
      return d;
    }
    if (expiryPreset === '90') {
      d.setDate(d.getDate() + 90);
      return d;
    }
    if (expiryPreset === 'custom' && customExpiryDate) {
      const custom = new Date(`${customExpiryDate}T23:59:59Z`);
      return isNaN(custom.getTime()) ? null : custom;
    }
    return null;
  }, [expiryPreset, customExpiryDate]);

  // Step 2 scope toggling
  const toggleScope = (scope: ShareScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const selectAllScopes = () => {
    setSelectedScopes(SCOPE_DEFINITIONS.map((s) => s.scope));
  };

  const clearAllScopes = () => {
    setSelectedScopes([]);
  };

  // Step 2 plot toggling
  const togglePlot = (plotId: string) => {
    setSelectedPlotIds((prev) =>
      prev.includes(plotId) ? prev.filter((id) => id !== plotId) : [...prev, plotId]
    );
  };

  const toggleAllPlots = () => {
    if (selectedPlotIds.length === plots.length) {
      setSelectedPlotIds([]);
    } else {
      setSelectedPlotIds(plots.map((p) => p.id));
    }
  };

  // Navigation handlers
  const handleNext = () => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (isUsingCustomOfficer) {
        if (!customOfficerId.trim()) {
          setErrorMessage('Please enter an officer UUID.');
          return;
        }
      } else if (!selectedOfficerId) {
        setErrorMessage('Please select a verified agricultural extension officer to continue.');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (selectedPlotIds.length === 0) {
        setErrorMessage('Please select at least one plot to share.');
        return;
      }
      if (selectedScopes.length === 0) {
        setErrorMessage('Please select at least one scope category to share.');
        return;
      }
      setCurrentStep(3);
      return;
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
  };

  // Final submission
  const handleSubmit = async () => {
    setErrorMessage(null);

    const officerId = isUsingCustomOfficer ? customOfficerId.trim() : selectedOfficerId;
    if (!officerId) {
      setErrorMessage('A verified officer must be specified.');
      return;
    }

    if (selectedPlotIds.length === 0) {
      setErrorMessage('Please select at least one plot to share.');
      return;
    }

    if (selectedScopes.length === 0) {
      setErrorMessage('Please select at least one data scope category.');
      return;
    }

    if (!computedExpiryDate || computedExpiryDate.getTime() <= Date.now()) {
      setErrorMessage('Expiry date must be in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      await shareService.createShares({
        officerId,
        plotIds: selectedPlotIds,
        scopes: selectedScopes,
        expiresAt: computedExpiryDate.toISOString(),
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { error?: { message?: string } } };
        message?: string;
      };
      const message =
        errorObj?.response?.data?.error?.message ||
        errorObj?.message ||
        'Failed to grant plot share. Please verify that the extension officer is active.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Plain-language summary text for Step 3
  const summaryScopeNames = useMemo(() => {
    return selectedScopes
      .map((s) => {
        const item = SCOPE_DEFINITIONS.find((def) => def.scope === s);
        return item ? item.title.toLowerCase() : s;
      })
      .join(', ');
  }, [selectedScopes]);

  const summaryDateString = useMemo(() => {
    if (!computedExpiryDate) return 'valid future date';
    return computedExpiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [computedExpiryDate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Plot Records with Officer"
      description="Grant temporary, granular access to certified extension officers. You retain full control and can stop sharing at any time."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Step Indicator Header */}
        <nav aria-label="Share Wizard Progress" className="w-full">
          <ol className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: '1. Select Officer' },
              { num: 2, label: '2. Plots & Scopes' },
              { num: 3, label: '3. Expiry & Consent' },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <li
                  key={step.num}
                  className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs sm:text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-green-100 border-green-600 text-green-900 ring-2 ring-green-600/20'
                      : isPast
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-sand-50 border-sand-200 text-ink-600'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="truncate">{step.label}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        {errorMessage && (
          <Alert variant="error" title="Sharing Error">
            {errorMessage}
          </Alert>
        )}

        {/* ---------------- STEP 1: Select Verified Officer ---------------- */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-ink-900">Choose a Verified Extension Officer</h3>
              <p className="text-xs text-ink-600 mt-0.5">
                Only officers certified by the Department of Agriculture can access shared farm records.
              </p>
            </div>

            {/* Officer Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search by officer name, district, or department..."
                value={officerSearch}
                onChange={(e) => setOfficerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              />
            </div>

            {/* Officer Cards List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredOfficers.map((officer) => {
                const isSelected = !isUsingCustomOfficer && selectedOfficerId === officer.id;
                return (
                  <button
                    key={officer.id}
                    type="button"
                    onClick={() => {
                      setIsUsingCustomOfficer(false);
                      setSelectedOfficerId(officer.id);
                    }}
                    className={`w-full text-left p-3.5 rounded-card border transition-all flex items-start gap-3 min-h-touch ${
                      isSelected
                        ? 'border-green-600 bg-green-50/70 shadow-sm ring-1 ring-green-600'
                        : 'border-sand-200 hover:border-green-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-sand-400 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-ink-900">{officer.fullName}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                          Verified Officer
                        </span>
                      </div>
                      <p className="text-xs text-ink-600 mt-1">{officer.department}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-ink-600">
                        <span>Zone: <strong className="text-ink-900">{officer.district}</strong></span>
                        <span>•</span>
                        <span>Specialty: <strong className="text-ink-900">{officer.specialty}</strong></span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredOfficers.length === 0 && (
                <div className="p-4 text-center border border-dashed border-sand-300 rounded-card text-ink-600 text-sm">
                  No verified officers match &quot;{officerSearch}&quot;.
                </div>
              )}
            </div>

            {/* Custom Officer UUID Option */}
            <div className="pt-2 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setIsUsingCustomOfficer(!isUsingCustomOfficer)}
                className="text-xs font-semibold text-green-700 hover:text-green-800 underline flex items-center gap-1"
              >
                {isUsingCustomOfficer ? '← Choose from certified officers' : 'Have an officer UUID or direct invite code?'}
              </button>

              {isUsingCustomOfficer && (
                <div className="mt-3 p-3 bg-sand-50 rounded-card border border-sand-200 space-y-2">
                  <label htmlFor="custom-officer-id" className="text-xs font-bold text-ink-900 block">
                    Officer UUID
                  </label>
                  <input
                    id="custom-officer-id"
                    type="text"
                    value={customOfficerId}
                    onChange={(e) => setCustomOfficerId(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full px-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
                  />
                  <p className="text-xs text-ink-600">
                    The officer must have an active, verified officer account in the system.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- STEP 2: Choose Plots & Scopes ---------------- */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* Mandatory GPS Privacy Banner (Rule 4) */}
            <div className="p-3.5 bg-green-50 border border-green-300 rounded-card flex items-start gap-3 shadow-sm">
              <div className="p-1.5 rounded-full bg-green-100 text-green-800 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-green-900 flex items-center gap-1.5">
                  <span>GPS Privacy Guarantee</span>
                  <span className="px-1.5 py-0.2 rounded bg-green-200 text-green-900 text-[10px] uppercase tracking-wide">
                    Strict Boundary
                  </span>
                </div>
                <p className="text-green-800 mt-0.5 leading-relaxed">
                  <strong>Exact GPS coordinates are NEVER shared.</strong> Extension officers only see your district-level location data to protect your farm privacy.
                </p>
              </div>
            </div>

            {/* Plot Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-ink-900">
                  Select Plot(s) to Share ({selectedPlotIds.length}/{plots.length})
                </label>
                {plots.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllPlots}
                    className="text-xs font-semibold text-green-700 hover:text-green-800 underline"
                  >
                    {selectedPlotIds.length === plots.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {isLoadingPlots ? (
                <div className="p-6 text-center text-sm text-ink-600">Loading your registered plots...</div>
              ) : plots.length === 0 ? (
                <div className="p-4 text-center border border-dashed border-sand-300 rounded-card text-ink-600 text-sm">
                  No plots found. Create a plot before setting up sharing.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                  {plots.map((plot) => {
                    const isSelected = selectedPlotIds.includes(plot.id);
                    return (
                      <button
                        key={plot.id}
                        type="button"
                        onClick={() => togglePlot(plot.id)}
                        className={`text-left p-2.5 rounded-card border transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-green-600 bg-green-50/60 ring-1 ring-green-600'
                            : 'border-sand-200 hover:border-green-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-green-600 rounded border-sand-400 focus:ring-green-600"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink-900 truncate">{plot.name}</p>
                          <p className="text-[11px] text-ink-600">
                            {plot.district} • {plot.areaHa} ha
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-ink-900">
                  Select Data Categories to Share ({selectedScopes.length}/6)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllScopes}
                    className="text-xs font-semibold text-green-700 hover:text-green-800 underline"
                  >
                    Select all
                  </button>
                  <span className="text-sand-400 text-xs">|</span>
                  <button
                    type="button"
                    onClick={clearAllScopes}
                    className="text-xs font-semibold text-ink-600 hover:text-ink-900 underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {SCOPE_DEFINITIONS.map((scopeDef) => {
                  const isChecked = selectedScopes.includes(scopeDef.scope);
                  const Icon = scopeDef.icon;
                  return (
                    <button
                      key={scopeDef.scope}
                      type="button"
                      onClick={() => toggleScope(scopeDef.scope)}
                      className={`text-left p-2.5 rounded-card border transition-all flex items-start gap-2.5 min-h-[58px] ${
                        isChecked
                          ? 'border-green-600 bg-green-50/60 ring-1 ring-green-600'
                          : 'border-sand-200 hover:border-green-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 mt-0.5 text-green-600 rounded border-sand-400 focus:ring-green-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-green-700 shrink-0" />
                          <span className="text-xs font-bold text-ink-900">{scopeDef.title}</span>
                        </div>
                        <p className="text-[11px] text-ink-600 mt-0.5 line-clamp-2 leading-tight">
                          {scopeDef.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 3: Expiry & Consent ---------------- */}
        {currentStep === 3 && (
          <div className="space-y-5">
            {/* Expiry Selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-green-700" />
                Select Share Duration
              </label>
              <p className="text-xs text-ink-600">
                Access automatically expires after this period. You can also revoke access anytime before expiry.
              </p>

              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { value: '7', label: '7 Days' },
                  { value: '30', label: '30 Days', badge: 'Standard' },
                  { value: '90', label: '90 Days', badge: 'Season' },
                  { value: 'custom', label: 'Custom' },
                ].map((preset) => {
                  const isSelected = expiryPreset === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setExpiryPreset(preset.value as ExpiryPreset)}
                      className={`py-2 px-3 rounded-card border text-xs font-bold flex flex-col items-center justify-center transition-all min-h-touch ${
                        isSelected
                          ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-600/20'
                          : 'border-sand-200 bg-white hover:border-green-300 text-ink-900'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {preset.badge && (
                        <span className="text-[10px] text-green-700 font-normal">
                          {preset.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {expiryPreset === 'custom' && (
                <div className="pt-2">
                  <DatePicker
                    label="Custom Expiry Date"
                    value={customExpiryDate}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    onChange={(e) => setCustomExpiryDate(e.target.value)}
                    helperText="Specify a future date when access should automatically end."
                  />
                </div>
              )}
            </div>

            {/* Plain-Language Consent Summary */}
            <div className="p-4 bg-sand-50 rounded-card border border-sand-300 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-green-700" />
                <h4 className="text-xs font-extrabold text-ink-900 uppercase tracking-wide">
                  Plain-Language Consent Summary
                </h4>
              </div>

              <div className="p-3 bg-white rounded-lg border border-sand-200 text-xs text-ink-900 space-y-2 leading-relaxed">
                <p>
                  You are giving Officer{' '}
                  <strong className="text-green-800">
                    {selectedOfficer?.fullName || 'Selected Extension Officer'}
                  </strong>{' '}
                  read-only access to{' '}
                  <strong className="text-green-800">{summaryScopeNames}</strong> until{' '}
                  <strong className="text-green-800">{summaryDateString}</strong>.
                </p>
                <p className="text-ink-600">
                  You can stop sharing any time. Revocation takes effect on the officer&apos;s very next request.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-ink-600 pt-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-green-700 shrink-0" />
                  <span>Exact GPS hidden</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-green-700 shrink-0" />
                  <span>Logged in immutable audit</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Footer Actions ---------------- */}
        <div className="flex items-center justify-between pt-4 border-t border-sand-200">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isSubmitting}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>

          <div>
            {currentStep < 3 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Confirm &amp; Grant Access
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
