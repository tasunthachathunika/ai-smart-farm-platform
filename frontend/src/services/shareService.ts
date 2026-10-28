import { api } from '@/lib/api';
import {
  PaginatedResponse,
  SharedPlotRecord,
  CreateShareInput,
  AuditEntry,
} from '@/types/farm';

export interface ShareQueryParams {
  status?: 'active' | 'revoked' | 'expired' | 'all';
  plotId?: string;
  officerId?: string;
  page?: number;
  limit?: number;
}

export interface AuditQueryParams {
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  q?: string;
}

export const shareService = {
  /**
   * List shared plots (farmer sees shares for their plots, officer sees shares granted to them).
   */
  async getShares(params?: ShareQueryParams): Promise<PaginatedResponse<SharedPlotRecord>> {
    const res = await api.get<PaginatedResponse<SharedPlotRecord>>('/shares', { params });
    return res.data;
  },

  /**
   * Farmer grants access to one or more plots to a verified extension officer.
   */
  async createShares(data: CreateShareInput): Promise<SharedPlotRecord[]> {
    const res = await api.post<{ shares: SharedPlotRecord[] }>('/shares', data);
    return res.data.shares;
  },

  /**
   * Revoke plot share atomically. Officer immediately loses access on their next request.
   */
  async revokeShare(shareId: string): Promise<{ message: string; revokedAt: string }> {
    const res = await api.delete<{ message: string; revokedAt: string }>(`/shares/${shareId}`);
    return res.data;
  },

  /**
   * Farmer inspects immutable audit log trail of security, sharing, and data events.
   */
  async getAuditLogs(params?: AuditQueryParams): Promise<PaginatedResponse<AuditEntry>> {
    const res = await api.get<PaginatedResponse<AuditEntry>>('/audit', { params });
    return res.data;
  },
};
