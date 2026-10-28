import { api } from '@/lib/api';
import { PaginatedResponse } from '@/types/farm';
import {
  AdminUser,
  AdminAuditEntry,
  AdminUserQueryParams,
  PendingOfficerQueryParams,
  AdminAuditQueryParams,
} from '@/types/admin';

export const adminService = {
  /**
   * GET /api/admin/users
   * Lists registered user accounts (metadata only, strictly NO farm data).
   */
  async getUsers(params?: AdminUserQueryParams): Promise<PaginatedResponse<AdminUser>> {
    const res = await api.get<PaginatedResponse<AdminUser>>('/admin/users', { params });
    return res.data;
  },

  /**
   * PATCH /api/admin/users/:id/status
   * Activate or deactivate a user account.
   */
  async updateUserStatus(
    userId: string,
    isActive: boolean
  ): Promise<{ message: string; user: AdminUser }> {
    const res = await api.patch<{ message: string; user: AdminUser }>(
      `/admin/users/${userId}/status`,
      { isActive }
    );
    return res.data;
  },

  /**
   * GET /api/admin/officers/pending
   * List pending agricultural officers awaiting verification.
   */
  async getPendingOfficers(
    params?: PendingOfficerQueryParams
  ): Promise<PaginatedResponse<AdminUser>> {
    const res = await api.get<PaginatedResponse<AdminUser>>('/admin/officers/pending', { params });
    return res.data;
  },

  /**
   * PATCH /api/admin/officers/:id/verify
   * Approve, reject, or suspend an agricultural extension officer.
   */
  async verifyOfficer(
    officerId: string,
    action: 'approve' | 'reject' | 'suspend',
    reason?: string
  ): Promise<{ message: string; officer: AdminUser }> {
    const res = await api.patch<{ message: string; officer: AdminUser }>(
      `/admin/officers/${officerId}/verify`,
      {
        action,
        reason: reason || undefined,
      }
    );
    return res.data;
  },

  /**
   * GET /api/admin/audit
   * System audit log inspection for administrators (metadata only).
   */
  async getAuditLogs(params?: AdminAuditQueryParams): Promise<PaginatedResponse<AdminAuditEntry>> {
    const res = await api.get<PaginatedResponse<AdminAuditEntry>>('/admin/audit', { params });
    return res.data;
  },
};
