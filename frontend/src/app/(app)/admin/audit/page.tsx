'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AdminAuditEntry, AdminAuditQueryParams } from '@/types/admin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const ACTION_OPTIONS = [
  { value: '', label: 'All Action Codes' },
  { value: 'login', label: 'User Login' },
  { value: 'logout', label: 'User Logout' },
  { value: 'create', label: 'Entity Created' },
  { value: 'update', label: 'Entity Updated' },
  { value: 'delete', label: 'Entity Deleted' },
  { value: 'share_grant', label: 'Share Granted' },
  { value: 'share_revoke', label: 'Share Revoked' },
  { value: 'plot_viewed_by_officer', label: 'Officer Plot Read' },
  { value: 'ai_used', label: 'AI Advisory Query' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Resource Types' },
  { value: 'users', label: 'Users' },
  { value: 'plots', label: 'Plots' },
  { value: 'shared_plots', label: 'Shared Plots' },
  { value: 'crop_cycles', label: 'Crop Cycles' },
  { value: 'activity_logs', label: 'Activity Logs' },
  { value: 'input_applications', label: 'Inputs' },
  { value: 'harvests', label: 'Harvests' },
  { value: 'advisory_notes', label: 'Advisory Notes' },
];

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 20;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Audit Records (strictly metadata only)
  const loadAuditLogs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const params: AdminAuditQueryParams = {
        page,
        limit,
      };

      if (debouncedSearch) params.q = debouncedSearch;
      if (selectedAction) params.action = selectedAction;
      if (selectedEntityType) params.entityType = selectedEntityType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const res = await adminService.getAuditLogs(params);
        setLogs(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      } catch (err: unknown) {
        const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        setErrorMessage(
          errObj?.response?.data?.error?.message ||
            errObj?.message ||
            'Failed to load audit logs. Please check your credentials.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, debouncedSearch, selectedAction, selectedEntityType, startDate, endDate]
  );

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(debouncedSearch || selectedAction || selectedEntityType || startDate || endDate);
  }, [debouncedSearch, selectedAction, selectedEntityType, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedAction('');
    setSelectedEntityType('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">
            Platform Security Audit Journal
          </h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Append-only, cryptographically verifiable security event metadata across authentication, user management, and authorization scopes.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadAuditLogs(true)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Audit Log
        </Button>
      </div>

      {/* Strict Privacy Boundary Callout (AGENTS.md Rule 2) */}
      <div className="p-4 rounded-card bg-sand-100/80 border border-sand-300 flex items-start gap-3.5 text-xs text-ink-900">
        <ShieldAlert className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold text-ink-900 text-sm">
            Metadata-Only Inspection (AGENTS.md Rule 2 Boundary)
          </p>
          <p className="text-ink-600 leading-relaxed">
            Per strict privacy architecture, <strong>record payloads are never displayed or stored for administrator view</strong>. Private farm notes, crop observations, and exact GPS coordinates are excluded at the database layer. Administrators only inspect authentication timestamps, actor roles, action identifiers, and resource types.
          </p>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-900">
            <Filter className="w-3.5 h-3.5 text-green-700" />
            <span>Filter Security Audit Metadata</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Keyword */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="audit-search" className="text-sm font-semibold text-ink-900">
                Search Keyword
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
                <input
                  id="audit-search"
                  type="text"
                  placeholder="Action, entity, actor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white min-h-[42px]"
                />
              </div>
            </div>

            {/* Action Filter */}
            <Select
              label="Action Code"
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              options={ACTION_OPTIONS}
            />

            {/* Entity Type Filter */}
            <Select
              label="Resource Type"
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                setPage(1);
              }}
              options={ENTITY_OPTIONS}
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
          title="Audit Journal Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Metadata Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-700" />
            <div>
              <CardTitle>Audit Event Metadata</CardTitle>
              <CardDescription>
                System-level event record (time, action, actor role, resource type). Strictly NO payloads.
              </CardDescription>
            </div>
          </div>
          <span className="text-xs font-bold text-ink-600 bg-sand-200 px-2.5 py-1 rounded-full">
            {totalCount} Total Event{totalCount === 1 ? '' : 's'}
          </span>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Audit Events Found"
              description={
                hasActiveFilters
                  ? 'No security events match your search criteria.'
                  : 'There are no recorded audit events in the system.'
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
            <Table
              data={logs}
              keyExtractor={(item) => item.id}
              columns={[
                {
                  key: 'createdAt',
                  header: 'Time',
                  render: (item) => (
                    <div className="whitespace-nowrap">
                      <p className="font-semibold text-ink-900 text-xs">
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-[11px] text-ink-600 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'action',
                  header: 'Action',
                  render: (item) => {
                    const actionBadgeStyles: Record<string, string> = {
                      login: 'bg-green-100 text-green-800 border-green-300',
                      logout: 'bg-sand-200 text-ink-900 border-sand-300',
                      create: 'bg-green-100 text-green-800 border-green-300',
                      update: 'bg-gold-100 text-gold-700 border-gold-300',
                      delete: 'bg-status-danger-bg text-status-danger border-status-danger/30',
                      share_grant: 'bg-status-info-bg text-status-info border-status-info/30',
                      share_revoke: 'bg-status-danger-bg text-status-danger border-status-danger/30',
                      plot_viewed_by_officer: 'bg-status-info-bg text-status-info border-status-info/30',
                      ai_used: 'bg-ai-50 text-ai-800 border-ai-300',
                    };
                    return (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          actionBadgeStyles[item.action] || 'bg-sand-100 text-ink-900 border-sand-300'
                        }`}
                      >
                        {item.action}
                      </span>
                    );
                  },
                },
                {
                  key: 'userName',
                  header: 'Actor Role & Identity',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-ink-900 text-xs">
                        {item.userName || 'System / Automated'}
                      </p>
                      {item.userEmail && (
                        <p className="text-[11px] text-ink-600 font-mono">{item.userEmail}</p>
                      )}
                      {item.userId && !item.userName && !item.userEmail && (
                        <p className="text-[11px] text-ink-600 font-mono">{item.userId.slice(0, 8)}...</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'entityType',
                  header: 'Resource Type',
                  render: (item) => (
                    <div>
                      <span className="font-semibold text-xs text-ink-900 capitalize">
                        {item.entityType.replace(/_/g, ' ')}
                      </span>
                      {item.entityId && (
                        <p className="text-[11px] text-ink-600 font-mono truncate max-w-[120px]">
                          ID: {item.entityId.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'metadata',
                  header: 'Audit Metadata (No Payloads)',
                  render: (item) => {
                    const metaKeys = item.metadata ? Object.keys(item.metadata) : [];
                    return (
                      <div className="text-xs text-ink-600 space-y-0.5">
                        {metaKeys.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {metaKeys.slice(0, 3).map((k) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 rounded bg-sand-200 text-ink-900 font-mono text-[10px]"
                              >
                                {k}: {String(item.metadata![k])}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sand-400 font-mono text-[11px]">none</span>
                        )}
                        {item.ipAddress && (
                          <p className="text-[10px] text-ink-600 font-mono flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            {item.ipAddress}
                          </p>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-sand-200">
              <p className="text-xs text-ink-600">
                Page <strong className="text-ink-900">{page}</strong> of{' '}
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
