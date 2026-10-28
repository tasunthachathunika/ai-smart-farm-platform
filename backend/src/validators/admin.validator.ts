import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination';

export const adminUuidParamSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

/**
 * Query schema for listing users as admin.
 * Admins can filter by role, active status, or search query.
 */
export const adminUserQuerySchema = paginationQuerySchema.extend({
  role: z.enum(['farmer', 'officer', 'admin']).optional(),
  status: z.enum(['active', 'deactivated', 'all']).optional(),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

/**
 * Body schema for activating / deactivating a user.
 * Supports { isActive: boolean }, { status: 'active' | 'deactivated' }, or { action: 'activate' | 'deactivate' }.
 */
export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean().optional(),
    status: z.enum(['active', 'deactivated']).optional(),
    action: z.enum(['activate', 'deactivate']).optional(),
  })
  .refine(
    (data) => data.isActive !== undefined || data.status !== undefined || data.action !== undefined,
    { message: 'Must provide either isActive, status, or action' },
  )
  .transform((data) => {
    let isActive: boolean;
    if (data.isActive !== undefined) {
      isActive = data.isActive;
    } else if (data.status !== undefined) {
      isActive = data.status === 'active';
    } else {
      isActive = data.action === 'activate';
    }
    return { isActive };
  });

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

/**
 * Query schema for listing pending officers.
 */
export const pendingOfficerQuerySchema = paginationQuerySchema;
export type PendingOfficerQuery = z.infer<typeof pendingOfficerQuerySchema>;

/**
 * Body schema for verifying extension officers.
 * Actions: approve, reject, suspend.
 */
export const verifyOfficerSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend']),
  reason: z.string().trim().max(500).optional(),
});

export type VerifyOfficerInput = z.infer<typeof verifyOfficerSchema>;

/**
 * Query schema for admin audit logs inspection.
 * Strictly metadata only.
 */
export const adminAuditQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid('userId must be a valid UUID').optional(),
  action: z.string().trim().max(50).optional(),
  entityType: z.string().trim().max(50).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export type AdminAuditQuery = z.infer<typeof adminAuditQuerySchema>;
