'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { AdminUser, AdminUserQueryParams } from '@/types/admin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BackButton } from '@/components/ui/BackButton';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'farmer', label: 'Farmers' },
  { value: 'officer', label: 'Extension Officers' },
  { value: 'admin', label: 'Administrators' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Only' },
  { value: 'deactivated', label: 'Deactivated Only' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 15;

  // Status Change Confirmation Modal State
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load users from GET /api/admin/users
  const loadUsers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const params: AdminUserQueryParams = {
        page,
        limit,
        status: (selectedStatus as 'active' | 'deactivated' | 'all') || 'all',
      };

      if (debouncedSearch) params.q = debouncedSearch;
      if (selectedRole) params.role = selectedRole as 'farmer' | 'officer' | 'admin';

      try {
        const res = await adminService.getUsers(params);
        setUsers(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalCount(res.pagination.total || 0);
        }
      } catch (err: unknown) {
        const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
        setErrorMessage(
          errObj?.response?.data?.error?.message ||
            errObj?.message ||
            'Failed to load user accounts. Please check your credentials.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [page, limit, debouncedSearch, selectedRole, selectedStatus]
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Execute activate/deactivate with optimistic update
  const handleConfirmStatusToggle = async () => {
    if (!userToToggle) return;

    const targetUser = userToToggle;
    const newActiveState = !targetUser.isActive;
    const previousUsers = [...users];

    // Optimistic UI update
    setUsers((current) =>
      current.map((u) => (u.id === targetUser.id ? { ...u, isActive: newActiveState } : u))
    );

    setIsUpdatingStatus(true);
    setUserToToggle(null);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      await adminService.updateUserStatus(targetUser.id, newActiveState);
      setSuccessToast(
        `User ${targetUser.fullName} (${targetUser.email}) has been ${
          newActiveState ? 'activated' : 'deactivated'
        }.`
      );
    } catch (err: unknown) {
      // Rollback on failure
      setUsers(previousUsers);
      const errObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        errObj?.response?.data?.error?.message ||
          errObj?.message ||
          'Failed to update user status. Please try again.'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(debouncedSearch || selectedRole || selectedStatus !== 'all');
  }, [debouncedSearch, selectedRole, selectedStatus]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedRole('');
    setSelectedStatus('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <BackButton fallbackHref="/admin" />
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900">User Account Administration</h1>
          <p className="text-sm text-ink-600 mt-1 max-w-2xl">
            Search, inspect, and manage registered farmers, extension officers, and platform operators.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadUsers(true)}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          Refresh Users
        </Button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert
          variant="error"
          title="Account Management Error"
          onDismiss={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {successToast && (
        <Alert
          variant="success"
          title="Status Updated"
          onDismiss={() => setSuccessToast(null)}
        >
          {successToast}
        </Alert>
      )}

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label htmlFor="user-search" className="text-sm font-semibold text-ink-900">
                Search Users
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-600 absolute left-3 top-3.5" />
                <input
                  id="user-search"
                  type="text"
                  placeholder="Name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-sand-200 rounded-card focus:outline-none focus:ring-2 focus:ring-green-600 bg-white min-h-[42px]"
                />
              </div>
            </div>

            {/* Role Filter */}
            <Select
              label="Filter by Role"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              options={ROLE_OPTIONS}
            />

            {/* Status Filter */}
            <Select
              label="Account Status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
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

      {/* Users Registry Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-700" />
            <div>
              <CardTitle>Accounts Registry</CardTitle>
              <CardDescription>
                Metadata only. Farm records and crop contents are strictly isolated from administrators.
              </CardDescription>
            </div>
          </div>
          <span className="text-xs font-bold text-ink-600 bg-sand-200 px-2.5 py-1 rounded-full">
            {totalCount} Total User{totalCount === 1 ? '' : 's'}
          </span>
        </CardHeader>

        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
              <Skeleton className="h-12 w-full rounded" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Users Found"
              description={
                hasActiveFilters
                  ? 'No user accounts match your current search or filter parameters.'
                  : 'No user accounts found in the system.'
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
              data={users}
              keyExtractor={(item) => item.id}
              columns={[
                {
                  key: 'fullName',
                  header: 'User',
                  render: (item) => (
                    <div>
                      <p className="font-bold text-ink-900 text-sm">{item.fullName}</p>
                      <p className="text-xs text-ink-600 font-mono">{item.email}</p>
                    </div>
                  ),
                },
                {
                  key: 'phone',
                  header: 'Phone',
                  render: (item) => (
                    <span className="text-xs text-ink-600 font-mono">{item.phone || '—'}</span>
                  ),
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (item) => {
                    const badgeStyles: Record<string, string> = {
                      farmer: 'bg-green-100 text-green-800 border-green-300',
                      officer: 'bg-status-info-bg text-status-info border-status-info/30',
                      admin: 'bg-sand-200 text-ink-900 border-sand-300',
                    };
                    return (
                      <span
                        className={`capitalize text-xs font-bold px-2 py-0.5 rounded border ${
                          badgeStyles[item.role] || 'bg-sand-100 text-ink-900'
                        }`}
                      >
                        {item.role}
                      </span>
                    );
                  },
                },
                {
                  key: 'isVerified',
                  header: 'Verification',
                  render: (item) => (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        item.isVerified
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-status-warning-bg text-status-warning'
                      }`}
                    >
                      {item.isVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-status-success" />
                          Verified
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-status-warning" />
                          Pending
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  key: 'isActive',
                  header: 'Account Status',
                  render: (item) => (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-status-danger-bg text-status-danger'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Joined',
                  render: (item) => (
                    <span className="text-xs text-ink-600">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Status Action',
                  render: (item) =>
                    item.isActive ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setUserToToggle(item)}
                        leftIcon={<UserX className="w-3.5 h-3.5" />}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setUserToToggle(item)}
                        leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                      >
                        Activate
                      </Button>
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
                <strong className="text-ink-900">{totalPages}</strong> ({totalCount} total accounts)
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

      {/* Confirmation Modal for Activate/Deactivate */}
      <Modal
        isOpen={Boolean(userToToggle)}
        onClose={() => setUserToToggle(null)}
        title={userToToggle?.isActive ? 'Deactivate User Account?' : 'Reactivate User Account?'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div
            className={`p-3.5 rounded-card border flex items-start gap-3 ${
              userToToggle?.isActive
                ? 'bg-status-danger-bg border-status-danger/30 text-status-danger'
                : 'bg-green-50 border-green-200 text-green-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                {userToToggle?.isActive ? 'Immediate Access Revocation' : 'Restore Account Access'}
              </p>
              <p className="leading-relaxed">
                {userToToggle?.isActive
                  ? `Are you sure you want to deactivate ${userToToggle?.fullName} (${userToToggle?.email})? The user will immediately be barred from logging in or receiving plot shares.`
                  : `Are you sure you want to reactivate ${userToToggle?.fullName} (${userToToggle?.email})? The user will regain normal access to the platform.`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-200">
            <Button
              variant="ghost"
              onClick={() => setUserToToggle(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant={userToToggle?.isActive ? 'danger' : 'primary'}
              onClick={handleConfirmStatusToggle}
              isLoading={isUpdatingStatus}
            >
              {userToToggle?.isActive ? 'Confirm Deactivation' : 'Confirm Activation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
