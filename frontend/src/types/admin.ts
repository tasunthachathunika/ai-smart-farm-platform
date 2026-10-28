export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'farmer' | 'officer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditEntry {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminUserQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: 'farmer' | 'officer' | 'admin';
  status?: 'active' | 'deactivated' | 'all';
}

export interface PendingOfficerQueryParams {
  page?: number;
  limit?: number;
  q?: string;
}

export interface AdminAuditQueryParams {
  page?: number;
  limit?: number;
  q?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
}
