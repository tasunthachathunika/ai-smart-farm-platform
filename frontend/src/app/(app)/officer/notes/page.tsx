'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  ShieldCheck,
  MapPin,
  Calendar,
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { officerService } from '@/services/officerService';
import { OfficerPlotItem, OfficerAdvisoryNote } from '@/types/farm';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';

interface AggregatedNote extends OfficerAdvisoryNote {
  plotName: string;
  plotDistrict: string;
}

export default function OfficerNotesPage() {
  const [plots, setPlots] = useState<OfficerPlotItem[]>([]);
  const [allNotes, setAllNotes] = useState<AggregatedNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [selectedPlotId, setSelectedPlotId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load all shared plots and their advisory notes
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      // 1. Load shared plots
      const plotsRes = await officerService.getOfficerPlots({ limit: 100 });
      setPlots(plotsRes.data);

      // 2. Load advisory notes for each shared plot that grants advisory_notes or full scope
      const notesAccumulator: AggregatedNote[] = [];

      await Promise.all(
        plotsRes.data.map(async (p) => {
          try {
            const notesRes = await officerService.getPlotAdvisoryNotes(p.id, { limit: 20 });
            notesRes.data.forEach((note) => {
              notesAccumulator.push({
                ...note,
                plotName: p.name,
                plotDistrict: p.district,
              });
            });
          } catch {
            // Ignore 404 for plots without advisory_notes scope
          }
        })
      );

      // Sort notes newest first
      notesAccumulator.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setAllNotes(notesAccumulator);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to load advisory notes. Please check your verification or network connection.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return allNotes.filter((note) => {
      if (selectedPlotId && note.plotId !== selectedPlotId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(q) ||
          note.notes.toLowerCase().includes(q) ||
          (note.recommendations && note.recommendations.toLowerCase().includes(q)) ||
          note.plotName.toLowerCase().includes(q) ||
          note.plotDistrict.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allNotes, selectedPlotId, searchQuery]);

  const plotOptions = useMemo(() => {
    return [
      { value: '', label: 'All Shared Plots' },
      ...plots.map((p) => ({ value: p.id, label: `${p.name} (${p.district})` })),
    ];
  }, [plots]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">Officer Advisory Notes</h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Human-authored agronomic recommendations, visit observations, and field guidance provided to farmers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadData(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {plots.length > 0 && (
            <Link href={`/officer/shared-plots/${plots[0].id}?tab=advisory_notes`}>
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                Draft New Note
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Human Advisory Guarantee Banner */}
      <div className="p-3.5 bg-green-50 border border-green-200 rounded-card flex items-center justify-between gap-3 text-xs text-ink-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-700 shrink-0" />
          <span>
            <strong>Human Agricultural Advice:</strong> All notes in this journal are written directly by certified officers. The platform never generates automated pesticide or chemical prescriptions.
          </span>
        </div>
        <span className="text-green-800 font-bold shrink-0 hidden sm:inline">
          Verified Advisory
        </span>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Search Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="notes-search" className="text-sm font-semibold text-ink-900">
                Search Notes
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
                <input
                  id="notes-search"
                  type="text"
                  placeholder="Keyword, observation, recommendation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white min-h-[42px]"
                />
              </div>
            </div>

            {/* Plot Filter */}
            <Select
              label="Filter by Plot"
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              options={plotOptions}
            />
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <Alert
          variant="error"
          title="Advisory Log Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Main Notes List */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery || selectedPlotId ? 'No Matching Notes' : 'No Advisory Notes Issued'}
          description={
            searchQuery || selectedPlotId
              ? 'No advisory notes match your search filters.'
              : 'You have not recorded any advisory notes for farmers yet. Open a shared plot to inspect records and draft recommendations.'
          }
          action={
            plots.length > 0
              ? {
                  label: 'View Shared Plots',
                  onClick: () => {
                    window.location.href = '/officer/shared-plots';
                  },
                  icon: <MapPin className="w-4 h-4" />,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="border-l-4 border-l-green-600 hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-extrabold text-base text-ink-900">{note.title}</h2>
                    {/* Mandatory Requirement 4 Label */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                      Written by officer
                    </span>
                  </div>

                  <Link
                    href={`/officer/shared-plots/${note.plotId}?tab=advisory_notes`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-green-700 hover:text-green-800"
                  >
                    <span>Inspect on Plot</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                {/* Plot & Date Context */}
                <div className="flex items-center gap-3 text-xs text-ink-600 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-ink-900">
                    <MapPin className="w-3.5 h-3.5 text-green-700" />
                    {note.plotName} ({note.plotDistrict})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Note Content */}
                <div className="text-xs sm:text-sm text-ink-900 whitespace-pre-line leading-relaxed p-3 bg-sand-50 rounded-lg border border-sand-200">
                  {note.notes}
                </div>

                {/* Recommendations */}
                {note.recommendations && (
                  <div className="text-xs sm:text-sm p-3 bg-green-50 rounded-lg border border-green-200 text-green-950">
                    <p className="font-bold text-xs uppercase tracking-wide text-green-800 mb-1">
                      Agronomic Recommendations:
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
  );
}
