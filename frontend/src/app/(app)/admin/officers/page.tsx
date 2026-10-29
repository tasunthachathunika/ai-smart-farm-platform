'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  UserX,
  Eye,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AdminUser, PendingOfficerQueryParams } from '@/types/admin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Textarea';
import { BackButton } from '@/components/ui/BackButton';

type VerificationAction = 'approve' | 'reject' | 'suspend';

export default function AdminOfficersPage() {
  const [officers, setOfficers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Tab: 'pending' (verification queue) or 'all' (all extension officers)
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 15;

  // Review Drawer State
  const [selectedOfficerForReview, setSelectedOfficerForReview] = useState<AdminUser | null>(null);

  // Action Dialog State
  const [actionOfficer, setActionOfficer] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<VerificationAction | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Officers (pending queue or all officers)
  const loadOfficers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        if (activeTab === 'pending') {
          const params: PendingOfficerQueryParams = {
            page,
            limit,
            q: debouncedSearch || undefined,
          };
          const res = await adminService.getPendingOfficers(params);
          setOfficers(res.data);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages || 1);
            setTotalCount(res.pagination.total || 0);
          }
        } else {
          // All extension officers
          const res = await adminService.getUsers({
            role: 'officer',
            page,
            limit,
            q: debouncedSearch || undefined,
          });
          setOfficers(res.data);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages || 1);
            setTotalCount(res.pagination.total || 0);
          }
        }
      } catch (err: unknown) {
        const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        setErrorMessage(
          errObj?.response?.data?.error?.message ||
            errObj?.message ||
            'Failed to load officer verification roster. Please try again.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, page, limit, debouncedSearch]
  );

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  // Trigger Action Dialog
  const openActionDialog = (officer: AdminUser, action: VerificationAction) => {
    setActionOfficer(officer);
    setActionType(action);
    setActionReason('');
    setActionError(null);
  };

  const closeActionDialog = () => {
    setActionOfficer(null);
    setActionType(null);
    setActionReason('');
    setActionError(null);
  };

  // Submit Verification Action (approve, reject, suspend)
  const handleSubmitVerification = async () => {
    if (!actionOfficer || !actionType) return;

    if (actionType === 'reject' && !actionReason.trim()) {
      setActionError('Please specify a reason for rejecting this officer application.');
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);

    try {
      const res = await adminService.verifyOfficer(
        actionOfficer.id,
        actionType,
        actionReason.trim() || undefined
      );

      setSuccessToast(
        res.message || `Officer ${actionOfficer.fullName} successfully updated (${actionType}).`
      );

      // Close dialogs
      closeActionDialog();
      setSelectedOfficerForReview(null);

      // Refetch
      loadOfficers(true);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setActionError(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          `Failed to ${actionType} officer. Please try again.`
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/admin" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">
            Officer Verification Management
          </h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Review, certify, or suspend agricultural extension officers. Unverified officers are strictly barred from viewing or receiving farmer plot shares.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadOfficers(true)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Verification Queue Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {successToast && (
        <Alert
          variant="success"
          title="Verification Updated"
          onDismiss={() => setSuccessToast(null)}
        >
          {successToast}
        </Alert>
      )}

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Verification Queue vs All Officers Filter */}
        <div className="inline-flex p-1 bg-sand-200/60 rounded-card self-start">
          <button
            type="button"
            onClick={() => {
              setActiveTab('pending');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-gold-700" />
            <span>Pending Review Queue</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-green-700" />
            <span>All Extension Officers</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white min-h-[42px]"
          />
        </div>
      </div>

      {/* Verification Queue Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-700" />
            <div>
              <CardTitle>
                {activeTab === 'pending'
                  ? 'Extension Officers Awaiting Verification'
                  : 'Extension Officer Roster'}
              </CardTitle>
              <CardDescription>
                Review credentials before officers can access farmer records.
              </CardDescription>
            </div>
          </div>
          <span className="text-xs font-bold text-ink-600 bg-sand-200 px-2.5 py-1 rounded-full">
            {totalCount} Officer{totalCount === 1 ? '' : 's'}
          </span>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          ) : officers.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title={
                activeTab === 'pending'
                  ? 'Verification Queue is Clear'
                  : 'No Extension Officers Found'
              }
              description={
                activeTab === 'pending'
                  ? 'There are currently no extension officers pending review. All registrations have been processed.'
                  : 'No extension officers match your search query.'
              }
            />
          ) : (
            <Table
              data={officers}
              keyExtractor={(item) => item.id}
              columns={[
                {
                  key: 'fullName',
                  header: 'Officer Details',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-ink-900 text-sm">{item.fullName}</p>
                      <p className="text-xs text-ink-600 font-mono">{item.email}</p>
                      {item.phone && (
                        <p className="text-[11px] text-ink-600">{item.phone}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'isVerified',
                  header: 'Verification',
                  render: (item) => (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold ${
                        item.isVerified
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-status-warning-bg text-status-warning'
                      }`}
                    >
                      {item.isVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Certified Officer
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-gold-700" />
                          Pending Review
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'isActive',
                  header: 'Active Status',
                  render: (item) => (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-status-danger-bg text-status-danger'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Suspended'}
                    </span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Applied Date',
                  render: (item) => (
                    <span className="text-xs text-ink-600">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Verification Actions',
                  render: (item) => (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOfficerForReview(item)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-green-700" />}
                      >
                        Review
                      </Button>

                      {!item.isVerified ? (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openActionDialog(item, 'approve')}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => openActionDialog(item, 'reject')}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Reject
                          </Button>
                        </>
                      ) : item.isActive ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openActionDialog(item, 'suspend')}
                          leftIcon={<UserX className="w-3.5 h-3.5" />}
                        >
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => openActionDialog(item, 'approve')}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Re-Approve
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-sand-200">
              <p className="text-xs text-ink-600">
                Page <strong className="text-ink-900">{page}</strong> of{' '}
                <strong className="text-ink-900">{totalPages}</strong> ({totalCount} total officers)
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

      {/* Review Drawer / Modal (Displays exact data the API returns) */}
      <Modal
        isOpen={Boolean(selectedOfficerForReview)}
        onClose={() => setSelectedOfficerForReview(null)}
        title="Extension Officer Profile Review"
        description="Official account metadata returned by Department of Agriculture administration registry."
        maxWidth="md"
      >
        {selectedOfficerForReview && (
          <div className="space-y-4">
            <div className="p-4 bg-sand-50 rounded-card border border-sand-200 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Full Name:</span>
                <strong className="text-ink-900">{selectedOfficerForReview.fullName}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Government / Email:</span>
                <strong className="text-ink-900 font-mono text-xs">{selectedOfficerForReview.email}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Contact Phone:</span>
                <strong className="text-ink-900">{selectedOfficerForReview.phone || 'None provided'}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Role:</span>
                <span className="capitalize font-bold text-ink-900">{selectedOfficerForReview.role}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Verification Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    selectedOfficerForReview.isVerified
                      ? 'bg-status-success-bg text-status-success'
                      : 'bg-status-warning-bg text-status-warning'
                  }`}
                >
                  {selectedOfficerForReview.isVerified ? 'Certified Officer' : 'Pending Verification'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Account State:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    selectedOfficerForReview.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-status-danger-bg text-status-danger'
                  }`}
                >
                  {selectedOfficerForReview.isActive ? 'Active' : 'Suspended'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-sand-200">
                <span className="text-ink-600 font-semibold">Registered:</span>
                <span className="text-ink-900">
                  {new Date(selectedOfficerForReview.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-ink-600 font-semibold">User ID:</span>
                <span className="text-ink-600 font-mono text-xs">{selectedOfficerForReview.id}</span>
              </div>
            </div>

            {/* Quick Action Footer in Drawer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand-200">
              {!selectedOfficerForReview.isVerified ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const officer = selectedOfficerForReview;
                      openActionDialog(officer, 'reject');
                    }}
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const officer = selectedOfficerForReview;
                      openActionDialog(officer, 'approve');
                    }}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Approve Officer
                  </Button>
                </>
              ) : selectedOfficerForReview.isActive ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    const officer = selectedOfficerForReview;
                    openActionDialog(officer, 'suspend');
                  }}
                  leftIcon={<UserX className="w-3.5 h-3.5" />}
                >
                  Suspend Officer
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const officer = selectedOfficerForReview;
                    openActionDialog(officer, 'approve');
                  }}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Re-Approve Officer
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation & Reason Dialog (Approve / Reject with Reason / Suspend) */}
      <Modal
        isOpen={Boolean(actionOfficer && actionType)}
        onClose={closeActionDialog}
        title={
          actionType === 'approve'
            ? 'Approve Extension Officer?'
            : actionType === 'reject'
            ? 'Reject Officer Application?'
            : 'Suspend Extension Officer?'
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <div
            className={`p-3.5 rounded-card border flex items-start gap-3 ${
              actionType === 'approve'
                ? 'bg-green-50 border-green-200 text-green-950'
                : 'bg-status-danger-bg border-status-danger/30 text-status-danger'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                {actionType === 'approve'
                  ? 'Certify Extension Officer'
                  : actionType === 'reject'
                  ? 'Application Rejection'
                  : 'Immediate Suspension'}
              </p>
              <p className="leading-relaxed">
                {actionType === 'approve'
                  ? `Are you sure you want to approve ${actionOfficer?.fullName}? This officer will immediately appear in farmer sharing lists and be authorized to receive plot records.`
                  : actionType === 'reject'
                  ? `Are you sure you want to reject ${actionOfficer?.fullName}? A reason is required.`
                  : `Are you sure you want to suspend ${actionOfficer?.fullName}? All active login sessions and refresh tokens will be revoked immediately.`}
              </p>
            </div>
          </div>

          {actionError && (
            <Alert variant="error" title="Action Error">
              {actionError}
            </Alert>
          )}

          {/* Reason Input (Supported by verifyOfficerSchema reason field) */}
          {actionType !== 'approve' && (
            <div className="space-y-1.5">
              <Textarea
                label={actionType === 'reject' ? 'Rejection Reason (Required)' : 'Suspension Reason (Optional)'}
                required={actionType === 'reject'}
                placeholder={
                  actionType === 'reject'
                    ? 'State the reason for rejecting this officer (e.g. invalid government credentials, unverified jurisdiction)...'
                    : 'Provide administrative notes or rationale for suspension...'
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                maxLength={500}
                rows={3}
                helperText="Maximum 500 characters. Recorded in the tamper-evident audit log."
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-200">
            <Button variant="ghost" onClick={closeActionDialog} disabled={isSubmittingAction}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'primary' : 'danger'}
              onClick={handleSubmitVerification}
              isLoading={isSubmittingAction}
              leftIcon={
                actionType === 'approve' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <UserX className="w-4 h-4" />
                )
              }
            >
              {actionType === 'approve'
                ? 'Confirm Approval'
                : actionType === 'reject'
                ? 'Confirm Rejection'
                : 'Confirm Suspension'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
