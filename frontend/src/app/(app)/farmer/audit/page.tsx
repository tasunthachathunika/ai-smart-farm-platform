'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Eye,
  Share2,
  Trash2,
  Sparkles,
  FilePlus,
  Edit3,
  Calendar,
  Search,
  RefreshCw,
  Lock,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { TimelineItem } from '@/components/ui/TimelineItem';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { BackButton } from '@/components/ui/BackButton';
import { shareService, AuditQueryParams } from '@/services/shareService';
import { AuditEntry } from '@/types/farm';

const ACTION_FILTER_OPTIONS = [
  { value: '', label: 'All Security & Record Events' },
  { value: 'share_grant', label: 'Share Grants (Access Given)' },
  { value: 'share_revoke', label: 'Share Revocations (Access Stopped)' },
  { value: 'plot_viewed_by_officer', label: 'Officer Reads (Inspections)' },
  { value: 'ai_used', label: 'AI Advisory Inquiries' },
  { value: 'create', label: 'Record Creations' },
  { value: 'update', label: 'Record Updates' },
  { value: 'delete', label: 'Record Deletions' },
];

function formatEventConfig(entry: AuditEntry) {
  let title = 'Security Audit Event';
  let Icon = ShieldCheck;
  let iconColor = 'text-green-700';
  let iconBg = 'bg-green-100';
  let badgeText = entry.action;
  let badgeClass = 'bg-sand-200 text-ink-900 border-sand-300';

  const actorLabel = entry.actorName
    ? `${entry.actorName} (${entry.actorRole || 'user'})`
    : entry.actorRole === 'officer'
    ? 'Extension Officer'
    : 'You (Farm Owner)';

  switch (entry.action) {
    case 'share_grant':
      title = 'Plot Access Granted to Officer';
      Icon = Share2;
      iconColor = 'text-green-700';
      iconBg = 'bg-green-100';
      badgeText = 'Share Granted';
      badgeClass = 'bg-green-100 text-green-800 border-green-300';
      break;

    case 'share_revoke':
      title = 'Plot Access Revoked';
      Icon = Trash2;
      iconColor = 'text-status-danger';
      iconBg = 'bg-status-danger-bg';
      badgeText = 'Share Revoked';
      badgeClass = 'bg-status-danger-bg text-status-danger border-status-danger/30';
      break;

    case 'plot_viewed_by_officer':
      title = 'Shared Records Inspected by Officer';
      Icon = Eye;
      iconColor = 'text-status-info';
      iconBg = 'bg-status-info-bg';
      badgeText = 'Officer Read';
      badgeClass = 'bg-status-info-bg text-status-info border-status-info/30';
      break;

    case 'ai_used':
      title = 'AI Advisory Summary Generated';
      Icon = Sparkles;
      iconColor = 'text-ai-800';
      iconBg = 'bg-ai-50';
      badgeText = 'AI Assistant';
      badgeClass = 'bg-ai-50 text-ai-800 border-ai-300';
      break;

    case 'create':
      title = `New ${entry.entityType.replace(/_/g, ' ')} Created`;
      Icon = FilePlus;
      iconColor = 'text-green-700';
      iconBg = 'bg-green-100';
      badgeText = 'Created';
      badgeClass = 'bg-green-100 text-green-800 border-green-300';
      break;

    case 'update':
      title = `${entry.entityType.replace(/_/g, ' ')} Updated`;
      Icon = Edit3;
      iconColor = 'text-earth-600';
      iconBg = 'bg-earth-100';
      badgeText = 'Updated';
      badgeClass = 'bg-earth-100 text-earth-800 border-earth-300';
      break;

    case 'delete':
      title = `${entry.entityType.replace(/_/g, ' ')} Deleted`;
      Icon = Trash2;
      iconColor = 'text-status-danger';
      iconBg = 'bg-status-danger-bg';
      badgeText = 'Deleted';
      badgeClass = 'bg-status-danger-bg text-status-danger border-status-danger/30';
      break;

    default:
      if (entry.action.includes('grant')) {
        Icon = Share2;
        iconColor = 'text-green-700';
        iconBg = 'bg-green-100';
      } else if (entry.action.includes('revoke')) {
        Icon = Lock;
        iconColor = 'text-status-danger';
        iconBg = 'bg-status-danger-bg';
      }
      break;
  }

  // Extract metadata pills
  const metaPills: Array<{ label: string; value: string | number }> = [
    { label: 'Actor', value: actorLabel },
    { label: 'Entity', value: entry.entityType.replace(/_/g, ' ') },
  ];

  if (entry.metadata) {
    if (entry.metadata.plotName) {
      metaPills.push({ label: 'Plot', value: String(entry.metadata.plotName) });
    }
    if (entry.metadata.officerName) {
      metaPills.push({ label: 'Officer', value: String(entry.metadata.officerName) });
    }
    if (entry.metadata.scopes && Array.isArray(entry.metadata.scopes)) {
      metaPills.push({ label: 'Scopes', value: entry.metadata.scopes.join(', ') });
    }
    if (entry.metadata.cropName) {
      metaPills.push({ label: 'Crop', value: String(entry.metadata.cropName) });
    }
    if (entry.metadata.status) {
      metaPills.push({ label: 'Status', value: String(entry.metadata.status) });
    }
  }

  // Format localized date
  const eventDate = new Date(entry.createdAt);
  const formattedDate = eventDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Expandable notes details
  let notes: string | undefined;
  if (entry.metadata && Object.keys(entry.metadata).length > 0) {
    const safeMeta = { ...entry.metadata };
    delete safeMeta.plotName;
    delete safeMeta.officerName;
    if (Object.keys(safeMeta).length > 0) {
      notes = JSON.stringify(safeMeta, null, 2);
    }
  }

  return {
    title,
    Icon,
    iconColor,
    iconBg,
    badgeText,
    badgeClass,
    formattedDate,
    metaPills,
    notes,
  };
}

export default function FarmerAuditPage() {
  const [events, setEvents] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 15;

  // Filters
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch audit records
  const loadAuditLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const params: AuditQueryParams = {
        page,
        limit,
      };

      if (selectedAction) params.action = selectedAction;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (debouncedSearch) params.q = debouncedSearch;

      try {
        const res = await shareService.getAuditLogs(params);
        setEvents(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      } catch (err: unknown) {
        const errObj = err as {
          response?: { data?: { error?: { message?: string } } };
          message?: string;
        };
        setErrorMessage(
          errObj?.response?.data?.error?.message ||
            errObj?.message ||
            'Unable to load audit logs. Please ensure you are logged in.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, selectedAction, startDate, endDate, debouncedSearch]
  );

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setDebouncedSearch('');
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(selectedAction || startDate || endDate || debouncedSearch);
  }, [selectedAction, startDate, endDate, debouncedSearch]);

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/farmer" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">
            Privacy &amp; Security Audit Journal
          </h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Immutable, append-only security journal recording every access grant, officer inspection,
            data modification, and AI inquiry on your farm records.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadAuditLogs(true)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Log
        </Button>
      </div>

      {/* Security Privacy Callout */}
      <div className="p-4 bg-sand-100/70 border border-sand-200 rounded-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-ink-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
          <div>
            <p className="font-bold text-ink-900">Tamper-Proof Farmer Privacy Boundary</p>
            <p className="text-ink-600 text-[11px] mt-0.5">
              Only you see this journal. Platform administrators can never read your farm records or
              activity logs. Exact GPS is never recorded in logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-green-100 text-green-800 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
            Append-Only Trigger Active
          </span>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-900">
            <Filter className="w-3.5 h-3.5 text-green-700" />
            <span>Filter Audit Trail</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Event Category Selector */}
            <Select
              label="Action Category"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              options={ACTION_FILTER_OPTIONS}
            />

            {/* Start Date */}
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
            />

            {/* End Date */}
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
            />

            {/* Free text search */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="audit-search" className="text-sm font-semibold text-ink-900">
                Search Keyword
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
                <input
                  id="audit-search"
                  type="text"
                  placeholder="Officer, plot, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white min-h-[42px]"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-sand-200 text-xs">
              <span className="text-ink-600">Filters applied</span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-green-700 hover:text-green-800 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Alert */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Audit Log Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Main Timeline Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Security Events Timeline</CardTitle>
            <CardDescription>
              Chronological log of system actions affecting your farm records and permissions.
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-ink-600 bg-sand-200 px-2.5 py-1 rounded-full">
            {totalCount} Total Event{totalCount === 1 ? '' : 's'}
          </span>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-6 p-4">
              <Skeleton className="h-20 w-full rounded-card" />
              <Skeleton className="h-20 w-full rounded-card" />
              <Skeleton className="h-20 w-full rounded-card" />
            </div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Audit Records Found"
              description={
                hasActiveFilters
                  ? 'No audit events match your selected date or category filters.'
                  : 'Your farm journal does not have any recorded audit actions yet.'
              }
              action={
                hasActiveFilters
                  ? {
                      label: 'Reset Filters',
                      onClick: handleResetFilters,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-0 relative pl-2 pr-2">
              {events.map((entry, index) => {
                const config = formatEventConfig(entry);
                const isLast = index === events.length - 1;

                return (
                  <TimelineItem
                    key={entry.id}
                    id={entry.id}
                    icon={config.Icon}
                    iconColor={config.iconColor}
                    iconBg={config.iconBg}
                    title={config.title}
                    date={config.formattedDate}
                    badge={
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${config.badgeClass}`}
                      >
                        {config.badgeText}
                      </span>
                    }
                    metadata={config.metaPills}
                    notes={config.notes}
                    isLast={isLast}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-sand-200">
              <p className="text-xs text-ink-600">
                Showing page <strong className="text-ink-900">{page}</strong> of{' '}
                <strong className="text-ink-900">{totalPages}</strong> ({totalCount} total events)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
