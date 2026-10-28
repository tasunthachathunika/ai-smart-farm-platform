import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination';

export const shareScopeEnum = z.enum(['view_only', 'advisory', 'full']);

export const allowedScopeEnum = z.enum([
  'view_only',
  'advisory',
  'full',
  'crop_cycles',
  'activity_logs',
  'input_applications',
  'harvests',
  'advisory_notes',
  'photos',
]);

export const createShareSchema = z
  .object({
    officerId: z.string().uuid('officerId must be a valid UUID'),
    plotIds: z
      .array(z.string().uuid('Each plotId must be a valid UUID'))
      .min(1, 'At least one plotId must be specified'),
    scopes: z.array(allowedScopeEnum).min(1, 'At least one scope must be provided').optional(),
    scope: shareScopeEnum.optional(),
    expiresAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'expiresAt must be a valid ISO date string',
      })
      .refine((val) => new Date(val).getTime() > Date.now(), {
        message: 'expiresAt must be a future date and time',
      })
      .optional()
      .nullable(),
  })
  .refine((data) => data.scopes !== undefined || data.scope !== undefined, {
    message: 'Either scopes array or scope must be provided',
    path: ['scopes'],
  });

export const shareQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['active', 'revoked', 'expired', 'all']).default('all'),
  plotId: z.string().uuid().optional(),
  officerId: z.string().uuid().optional(),
});

export const auditQuerySchema = paginationQuerySchema.extend({
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .optional(),
});
