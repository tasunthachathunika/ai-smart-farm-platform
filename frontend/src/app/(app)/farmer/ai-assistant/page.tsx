'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ClipboardList,
  UserCheck,
  Wheat,
  AlertTriangle,
  X,
  Clock,
  ShieldAlert,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { farmService } from '@/services/farmService';
import { aiService } from '@/services/aiService';
import {
  Plot,
  CropCycle,
  AIServiceResponse,
  SummaryOutput,
  VisitPrepOutput,
} from '@/types/farm';
import { ApiError } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AIResultCard } from '@/components/ui/AIResultCard';

type AnalysisMode = 'summary' | 'visit_prep';

const COMMON_FOCUS_AREAS = [
  'Crop Health & Symptoms',
  'Water & Irrigation Management',
  'Weed Management',
  'Pest Scouting Observations',
  'Growth Stage Verification',
  'Record Keeping Gaps',
];

export default function FarmerAIAssistantPage() {
  // Mode selection: "summary" (Summarize my season) vs "visit_prep" (Prepare for officer visit)
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>('summary');

  // Plots and cycles
  const [plots, setPlots] = useState<Plot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [cropCycles, setCropCycles] = useState<CropCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [isLoadingPlots, setIsLoadingPlots] = useState<boolean>(true);

  // Form inputs
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [customFocusArea, setCustomFocusArea] = useState<string>('');

  // Execution states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Results & Errors
  const [summaryResult, setSummaryResult] = useState<AIServiceResponse<SummaryOutput> | null>(null);
  const [visitPrepResult, setVisitPrepResult] = useState<AIServiceResponse<VisitPrepOutput> | null>(null);

  // Error / Refusal states
  const [refusalMessage, setRefusalMessage] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);

  // 1. Load Farmer Plots
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
        setGenericError('Failed to load registered plots. Please refresh the page.');
      } finally {
        setIsLoadingPlots(false);
      }
    }
    fetchPlots();
  }, []);

  // 2. Load Crop Cycles when selected plot changes
  useEffect(() => {
    if (!selectedPlotId) {
      setCropCycles([]);
      setSelectedCycleId('');
      return;
    }

    async function fetchCycles() {
      try {
        const res = await farmService.getCropCycles({ plotId: selectedPlotId });
        const list = res.data || [];
        setCropCycles(list);
        if (list.length > 0) {
          const active = list.find((c) => c.status === 'active');
          setSelectedCycleId(active ? active.id : '');
        } else {
          setSelectedCycleId('');
        }
      } catch {
        setCropCycles([]);
      }
    }
    fetchCycles();
  }, [selectedPlotId]);

  // Handle Cancel Generation
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsGenerating(false);
  };

  // Reset all error states
  const clearErrors = () => {
    setRefusalMessage(null);
    setIsRateLimited(false);
    setRateLimitMessage(null);
    setNetworkError(null);
    setGenericError(null);
  };

  // Toggle Focus Area
  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  // Add custom focus area
  const handleAddCustomFocus = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customFocusArea.trim();
    if (trimmed && !selectedFocusAreas.includes(trimmed)) {
      setSelectedFocusAreas((prev) => [...prev, trimmed]);
      setCustomFocusArea('');
    }
  };

  // Switch to Visit Prep from refusal
  const handleSwitchToVisitPrep = () => {
    clearErrors();
    setSelectedMode('visit_prep');
    setUserPrompt('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Execute AI Request
  const handleGenerate = async () => {
    if (!selectedPlotId) {
      setGenericError('Please select a plot before generating AI advice.');
      return;
    }

    clearErrors();
    setIsGenerating(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      if (selectedMode === 'summary') {
        const result = await aiService.generateSummary(
          {
            plotId: selectedPlotId,
            cycleId: selectedCycleId || undefined,
            userPrompt: userPrompt.trim() || undefined,
          },
          { signal: controller.signal }
        );

        setSummaryResult(result);
        setVisitPrepResult(null);
      } else {
        const result = await aiService.generateVisitPrep(
          {
            plotId: selectedPlotId,
            cycleId: selectedCycleId || undefined,
            focusAreas: selectedFocusAreas.length > 0 ? selectedFocusAreas : undefined,
          },
          { signal: controller.signal }
        );

        setVisitPrepResult(result);
        setSummaryResult(null);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return; // Handled via cancel
      }

      const apiErr = err as ApiError;
      const status = apiErr?.status;
      const code = apiErr?.code;
      const message = apiErr?.message || '';

      // Check for Refusal boundary (chemicals, pesticides, fertilizer dosage, diagnosis)
      const isRefusal =
        code === 'PRE_FILTER_REFUSAL' ||
        message.toLowerCase().includes('refuse') ||
        message.toLowerCase().includes('pesticide') ||
        message.toLowerCase().includes('fertilizer') ||
        message.toLowerCase().includes('dosage') ||
        message.toLowerCase().includes('diagnosis');

      if (isRefusal) {
        setRefusalMessage(
          "I can't advise on pesticide or fertilizer types or doses. Please ask your extension officer."
        );
      } else if (status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
        setIsRateLimited(true);
        setRateLimitMessage(
          apiErr.message ||
            'Rate limit exceeded. You have made too many AI requests. Please wait a moment before trying again.'
        );
      } else if (status === 0 || code === 'NETWORK_ERROR' || code === 'OFFLINE') {
        setNetworkError(
          'Unable to connect to the farm server. Please verify your internet connection.'
        );
      } else {
        setGenericError(apiErr.message || 'An error occurred while generating AI analysis.');
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-full bg-ai-100 text-ai-700">
            <Sparkles className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">
            Responsible AI Assistant
          </h1>
        </div>
        <p className="text-sm text-ink-600 mt-1 max-w-3xl">
          Synthesizes your farm records to highlight observations, timeline summaries, and questions
          for your agricultural extension officer. Never prescribes chemicals, dosages, or diagnoses.
        </p>
      </div>

      {/* Mandatory Regulatory AI Safety Banner */}
      <div
        role="note"
        aria-label="AI Boundary Note"
        className="p-4 rounded-card bg-ai-50 border border-ai-300 flex items-start gap-3 text-ai-900 text-xs sm:text-sm"
      >
        <AlertTriangle className="w-5 h-5 text-gold-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <strong>Responsible AI Policy:</strong> Goviya Plus AI assists with record organization
          and prepares questions for human experts. It does not recommend pesticide/fertilizer
          products or dosages, diagnose crop diseases, or write database records.
        </p>
      </div>

      {/* Plot & Crop Cycle Context Selectors */}
      <Card className="p-4 sm:p-5 border-sand-200 bg-white">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600 mb-3">
          1. Select Farm Record Scope
        </h2>

        {isLoadingPlots ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton variant="rectangular" height={52} className="w-full" />
            <Skeleton variant="rectangular" height={52} className="w-full" />
          </div>
        ) : plots.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="No Plots Found"
            description="Register a plot first before generating AI season summaries or visit preparation questions."
            action={{
              label: 'Register Plot',
              onClick: () => {},
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Farm Plot"
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              disabled={isGenerating}
              options={plots.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.district}) - ${p.areaHa} ha`,
              }))}
            />

            <Select
              label="Crop Cycle (Optional)"
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              disabled={isGenerating || cropCycles.length === 0}
              options={[
                { value: '', label: 'All Recorded Cycles' },
                ...cropCycles.map((c) => ({
                  value: c.id,
                  label: `${c.cropName}${c.variety ? ` - ${c.variety}` : ''} (${c.status})`,
                })),
              ]}
              helperText={
                cropCycles.length === 0
                  ? 'No cycles recorded for this plot yet'
                  : 'Filter synthesis to a specific crop cycle'
              }
            />
          </div>
        )}
      </Card>

      {/* Two Option Cards: "Summarize my season" vs "Prepare for officer visit" */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-600">
          2. Choose Analysis Objective
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Summarize my season */}
          <button
            type="button"
            onClick={() => {
              setSelectedMode('summary');
              clearErrors();
            }}
            disabled={isGenerating}
            className={`text-left p-5 rounded-card border-2 transition-all flex flex-col justify-between min-h-[140px] focus:outline-none focus:ring-2 focus:ring-ai-600 ${
              selectedMode === 'summary'
                ? 'border-ai-600 bg-ai-50/70 shadow-sm'
                : 'border-sand-200 bg-white hover:border-sand-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-full bg-ai-100 text-ai-800">
                  <ClipboardList className="w-5 h-5" />
                </span>
                {selectedMode === 'summary' && (
                  <span className="text-xs font-bold text-ai-700 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Selected
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-ink-900">Summarize my season</h3>
              <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                Generates a responsible synthesis of your crop activities, observations, and missing
                information across this plot.
              </p>
            </div>
            <span className="text-xs font-bold text-ai-700 mt-4 block">Endpoint: POST /ai/summary</span>
          </button>

          {/* Card 2: Prepare for officer visit */}
          <button
            type="button"
            onClick={() => {
              setSelectedMode('visit_prep');
              clearErrors();
            }}
            disabled={isGenerating}
            className={`text-left p-5 rounded-card border-2 transition-all flex flex-col justify-between min-h-[140px] focus:outline-none focus:ring-2 focus:ring-ai-600 ${
              selectedMode === 'visit_prep'
                ? 'border-ai-600 bg-ai-50/70 shadow-sm'
                : 'border-sand-200 bg-white hover:border-sand-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-full bg-green-100 text-green-800">
                  <UserCheck className="w-5 h-5" />
                </span>
                {selectedMode === 'visit_prep' && (
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Selected
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-ink-900">Prepare for officer visit</h3>
              <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                Formulates specific questions and talking points grounded in your records to discuss
                with your agricultural extension officer.
              </p>
            </div>
            <span className="text-xs font-bold text-green-700 mt-4 block">
              Endpoint: POST /ai/visit-prep
            </span>
          </button>
        </div>
      </div>

      {/* Additional Scope Configuration per selected mode */}
      <Card className="p-5 border-sand-200 bg-white space-y-4">
        {selectedMode === 'summary' ? (
          <div className="space-y-2">
            <Textarea
              id="user-prompt"
              label="Additional Focus or Question (Optional)"
              rows={3}
              placeholder="e.g. Highlight water management events and any symptoms noted after the October rains..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              disabled={isGenerating}
              maxLength={1000}
              helperText={`${userPrompt.length}/1000 characters. Requests for chemical dosages or prescriptions will be safely refused.`}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-bold text-ink-900 block">
                Select Focus Areas for Officer Discussion (Optional)
              </span>
              <p className="text-xs text-ink-600 mt-0.5">
                Choose areas you want the extension officer to inspect or review.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {COMMON_FOCUS_AREAS.map((area) => {
                const isSelected = selectedFocusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    disabled={isGenerating}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all min-h-touch ${
                      isSelected
                        ? 'border-green-600 bg-green-50 text-green-900'
                        : 'border-sand-300 bg-white text-ink-700 hover:border-sand-400'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {area}
                  </button>
                );
              })}
            </div>

            {/* Custom Focus Input */}
            <form onSubmit={handleAddCustomFocus} className="flex items-end gap-2 pt-2 max-w-md">
              <div className="flex-1">
                <Input
                  label="Add Custom Focus Topic"
                  placeholder="e.g. Sluice gate flow"
                  value={customFocusArea}
                  onChange={(e) => setCustomFocusArea(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!customFocusArea.trim() || isGenerating}
                className="shrink-0 min-h-touch text-xs mb-0.5"
              >
                Add Topic
              </Button>
            </form>
          </div>
        )}

        {/* Action Button & Cancellation */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            variant="primary"
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={isGenerating || plots.length === 0}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="min-h-touch flex-1 sm:flex-none sm:min-w-[220px]"
          >
            {isGenerating
              ? 'Synthesizing Records...'
              : selectedMode === 'summary'
              ? 'Generate Season Summary'
              : 'Prepare Officer Questions'}
          </Button>

          {isGenerating && (
            <Button
              variant="danger"
              onClick={handleCancel}
              leftIcon={<X className="w-4 h-4" />}
              className="min-h-touch"
            >
              Cancel Request
            </Button>
          )}
        </div>
      </Card>

      {/* STATE 1: LOADING WITH SKELETON */}
      {isGenerating && (
        <Card className="p-6 border-2 border-ai-300 bg-ai-50/50 space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ai-600 animate-spin" />
              <span className="text-sm font-bold text-ai-900">
                Synthesizing records safely with grounding...
              </span>
            </div>
            <span className="text-xs text-ai-700 font-semibold">This may take a few seconds</span>
          </div>

          <Skeleton variant="text" width="40%" height={24} />
          <Skeleton variant="rectangular" height={100} className="w-full rounded-card" />
          <div className="space-y-2">
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="85%" height={16} />
            <Skeleton variant="text" width="70%" height={16} />
          </div>
        </Card>
      )}

      {/* STATE 2: REFUSAL STATE */}
      {refusalMessage && !isGenerating && (
        <Card className="p-6 border-2 border-status-warning bg-status-warning-bg/40 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-status-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-ink-900">Agronomic Safety Refusal</h3>
              <p className="text-sm text-ink-900 font-medium leading-relaxed">{refusalMessage}</p>
              <p className="text-xs text-ink-600 pt-1">
                To protect crop yields and comply with agricultural safety regulations, autonomous
                pesticide/fertilizer recommendations and chemical disease diagnoses are forbidden.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleSwitchToVisitPrep}
              leftIcon={<UserCheck className="w-4 h-4" />}
              className="min-h-touch"
            >
              Prepare questions for my officer
            </Button>
          </div>
        </Card>
      )}

      {/* STATE 3: RATE LIMIT EXCEEDED (429) */}
      {isRateLimited && !isGenerating && (
        <Alert variant="warning" onDismiss={() => setIsRateLimited(false)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gold-800 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gold-900">AI Rate Limit Exceeded (429)</p>
                <p className="text-xs text-gold-800 mt-0.5">{rateLimitMessage}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              className="min-h-touch text-xs"
            >
              Try Again
            </Button>
          </div>
        </Alert>
      )}

      {/* STATE 4: NETWORK / OFFLINE ERROR */}
      {networkError && !isGenerating && (
        <Alert variant="error" onDismiss={() => setNetworkError(null)}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-status-danger shrink-0" />
              <span>{networkError}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              className="min-h-touch text-xs"
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* Generic Error */}
      {genericError && !isGenerating && !refusalMessage && (
        <Alert variant="error" onDismiss={() => setGenericError(null)}>
          <div className="flex items-center justify-between gap-3">
            <span>{genericError}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerate}
              className="min-h-touch text-xs"
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* STATE 5: SUCCESSFUL / FALLBACK RESULT IN AIResultCard */}
      {!isGenerating && summaryResult && (
        <AIResultCard
          title={`Season Summary: ${selectedPlot?.name || 'Selected Plot'}`}
          analysisType="summary"
          summary={summaryResult.data.summary}
          keyObservations={summaryResult.data.keyObservations.map((obs) => ({
            text: obs.observation,
            sourceRecordIds: obs.sourceRecordIds,
          }))}
          missingInformation={summaryResult.data.dataGaps}
          suggestedQuestions={summaryResult.data.suggestedOfficerQuestions}
          isFallback={summaryResult.isFallback}
        />
      )}

      {!isGenerating && visitPrepResult && (
        <AIResultCard
          title={`Officer Visit Preparation: ${selectedPlot?.name || 'Selected Plot'}`}
          analysisType="visit_prep"
          overview={visitPrepResult.data.purpose}
          timelineSummary={visitPrepResult.data.timelineSummary}
          keyIssues={visitPrepResult.data.keyIssues.map((issue) => ({
            text: issue.issue,
            sourceRecordIds: issue.sourceRecordIds,
            action: issue.suggestedAction,
          }))}
          discussionQuestions={visitPrepResult.data.discussionQuestions}
          inspectionsRecommended={visitPrepResult.data.inspectionsRecommended}
          isFallback={visitPrepResult.isFallback}
        />
      )}
    </div>
  );
}
