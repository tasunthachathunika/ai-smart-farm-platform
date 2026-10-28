'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Share2,
  Trash2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Layers,
  FileText,
  Package,
  Tractor,
  Camera,
  MessageSquare,
  Lock,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShareWizardModal } from './ShareWizardModal';
import { shareService } from '@/services/shareService';
import { SharedPlotRecord } from '@/types/farm';

const SCOPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  crop_cycles: { label: 'Crop Cycles', icon: Layers },
  activity_logs: { label: 'Activity Logs', icon: FileText },
  input_applications: { label: 'Inputs', icon: Package },
  harvests: { label: 'Harvests', icon: Tractor },
  photos: { label: 'Photos', icon: Camera },
  advisory_notes: { label: 'Advisory Notes', icon: MessageSquare },
  view_only: { label: 'View Only', icon: Lock },
  advisory: { label: 'Advisory', icon: MessageSquare },
  full: { label: 'Full Scope', icon: ShieldCheck },
};

function formatExpiryCountdown(expiresAt: string | null, revokedAt: string | null) {
  if (revokedAt) {
    const revDate = new Date(revokedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return {
      type: 'revoked' as const,
      label: `Revoked on ${revDate}`,
      badgeClass: 'bg-status-danger-bg text-status-danger border-status-danger/30',
    };
  }

  if (!expiresAt) {
    return {
      type: 'active' as const,
      label: 'No Expiration',
      badgeClass: 'bg-green-100 text-green-800 border-green-300',
    };
  }

  const expTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = expTime - now;

  if (diffMs <= 0) {
    const expDate = new Date(expiresAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return {
      type: 'expired' as const,
      label: `Expired on ${expDate}`,
      badgeClass: 'bg-status-warning-bg text-status-warning border-status-warning/30',
    };
  }

  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (days > 1) {
    return {
      type: 'active' as const,
      label: `Expires in ${days} days`,
      badgeClass: 'bg-green-100 text-green-800 border-green-300',
    };
  }

  return {
    type: 'active' as const,
    label: `Expires in ${hours} hour${hours === 1 ? '' : 's'}`,
    badgeClass: 'bg-gold-100 text-gold-700 border-gold-300',
  };
}

export const ActiveSharesManager: React.FC = () => {
  const [shares, setShares] = useState<SharedPlotRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab filter
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'revoked'>('active');

  // Share Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // Revoke confirmation modal state
  const [shareToRevoke, setShareToRevoke] = useState<SharedPlotRecord | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Fetch shares from backend
  const loadShares = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await shareService.getShares({ status: 'all', limit: 50 });
      setShares(res.data);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to load shared plots. Please check your network connection.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // Filtered shares based on active tab
  const filteredShares = useMemo(() => {
    const now = Date.now();
    return shares.filter((s) => {
      const isRevoked = Boolean(s.revokedAt);
      const isExpired = Boolean(s.expiresAt && new Date(s.expiresAt).getTime() <= now);
      const isActive = !isRevoked && !isExpired;

      if (statusFilter === 'active') return isActive;
      if (statusFilter === 'revoked') return isRevoked || isExpired;
      return true; // 'all'
    });
  }, [shares, statusFilter]);

  // Execute revocation with optimistic update and rollback
  const handleConfirmRevoke = async () => {
    if (!shareToRevoke) return;

    const targetShareId = shareToRevoke.id;
    const previousShares = [...shares];
    const revokedTimestamp = new Date().toISOString();

    // 1. Optimistic Update
    setShares((currentShares) =>
      currentShares.map((s) =>
        s.id === targetShareId
          ? { ...s, revokedAt: revokedTimestamp, revokedBy: 'farmer' }
          : s
      )
    );

    setIsRevoking(true);
    setShareToRevoke(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 2. Perform backend DELETE /api/shares/:id
      await shareService.revokeShare(targetShareId);
      setSuccessMessage('Plot share successfully revoked. Officer access stopped immediately.');
    } catch (err: unknown) {
      // 3. Rollback on failure
      setShares(previousShares);
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to stop sharing. Access remains active, please retry.'
      );
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls & Grant button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="inline-flex p-1 bg-sand-200/60 rounded-card self-start">
          {[
            { key: 'active', label: 'Active Shares' },
            { key: 'all', label: 'All History' },
            { key: 'revoked', label: 'Revoked / Expired' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as 'active' | 'all' | 'revoked')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                  isSelected
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadShares(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            aria-label="Refresh shares"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsWizardOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Grant New Share
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Share Revocation Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert
          variant="success"
          title="Share Revoked"
          onDismiss={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
        </div>
      ) : filteredShares.length === 0 ? (
        <EmptyState
          icon={Share2}
          title={statusFilter === 'active' ? 'No Active Shares' : 'No Shares Found'}
          description={
            statusFilter === 'active'
              ? 'You have not granted access to any agricultural extension officers yet. You can share records securely at any time.'
              : 'No plot share records match the selected filter.'
          }
          action={
            statusFilter === 'active'
              ? {
                  label: 'Grant New Officer Share',
                  onClick: () => setIsWizardOpen(true),
                  icon: <Plus className="w-4 h-4" />,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredShares.map((share) => {
            const expiryInfo = formatExpiryCountdown(share.expiresAt, share.revokedAt);
            const isShareActive = expiryInfo.type === 'active';
            const scopesList =
              share.scopes && share.scopes.length > 0 ? share.scopes : [share.scope];

            return (
              <Card
                key={share.id}
                className={`transition-shadow hover:shadow-md ${
                  !isShareActive ? 'opacity-80 bg-sand-50/50' : ''
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Share Overview */}
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Officer & Plot Title */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base sm:text-lg text-ink-900">
                          {share.officerName || 'Certified Officer'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
                          Verified Officer
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${expiryInfo.badgeClass}`}
                        >
                          <Clock className="w-3 h-3" />
                          {expiryInfo.label}
                        </span>
                      </div>

                      {/* Plot & Officer Details */}
                      <div className="text-xs sm:text-sm text-ink-600 space-y-1">
                        <p>
                          Plot:{' '}
                          <strong className="text-ink-900 font-semibold">
                            {share.plotName || 'Shared Plot'}
                          </strong>{' '}
                          • District:{' '}
                          <strong className="text-ink-900 font-semibold">
                            {share.district || 'District-level only'}
                          </strong>
                        </p>
                        <p className="text-xs text-ink-600">
                          Officer Contact:{' '}
                          <span className="font-mono text-ink-900">
                            {share.officerEmail || share.officerId}
                          </span>
                        </p>
                      </div>

                      {/* Scope Badges */}
                      <div className="pt-1">
                        <p className="text-xs font-bold text-ink-900 mb-1.5">Permitted Scopes:</p>
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-sand-200/80 text-ink-900 border border-sand-300"
                              >
                                <ScopeIcon className="w-3 h-3 text-green-700" />
                                {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline footer */}
                      <p className="text-[11px] text-ink-600 pt-1">
                        Granted on{' '}
                        {new Date(share.grantedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Action: Stop Sharing */}
                    <div className="shrink-0 flex items-center md:items-start pt-2 md:pt-0">
                      {isShareActive ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setShareToRevoke(share)}
                          isLoading={isRevoking && shareToRevoke?.id === share.id}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="w-full sm:w-auto"
                        >
                          Stop Sharing
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-600 font-medium px-3 py-1.5 rounded bg-sand-200">
                          <XCircle className="w-3.5 h-3.5 text-sand-400" />
                          Access Terminated
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Revoking Access */}
      <Modal
        isOpen={Boolean(shareToRevoke)}
        onClose={() => setShareToRevoke(null)}
        title="Stop Sharing Plot Access?"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-status-danger-bg/50 border border-status-danger/20 rounded-card flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-ink-900 space-y-1">
              <p className="font-bold text-status-danger text-sm">
                Immediate Access Termination
              </p>
              <p>
                <strong>The officer loses access on their very next request.</strong>
              </p>
              <p className="text-ink-600">
                Are you sure you want to revoke access to{' '}
                <strong>{shareToRevoke?.plotName || 'this plot'}</strong> for Officer{' '}
                <strong>{shareToRevoke?.officerName || 'the assigned officer'}</strong>?
              </p>
            </div>
          </div>

          <p className="text-xs text-ink-600">
            Past view events and advisory notes remain safely preserved in your immutable audit log.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-200">
            <Button
              variant="ghost"
              onClick={() => setShareToRevoke(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRevoke}
              isLoading={isRevoking}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Stop Sharing Immediately
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Wizard Modal */}
      <ShareWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          setIsWizardOpen(false);
          loadShares(true);
          setSuccessMessage('New officer share granted successfully!');
        }}
      />
    </div>
  );
};
