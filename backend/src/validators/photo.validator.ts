import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination';

export const photoUploadBodySchema = z.object({
  caption: z.string().trim().max(500, 'Caption cannot exceed 500 characters').optional(),
});

export const photoQuerySchema = paginationQuerySchema.extend({
  plotId: z.string().uuid().optional(),
});

export const photoParamSchema = z.object({
  id: z.string().uuid('Plot ID must be a valid UUID'),
  photoId: z.string().uuid('Photo ID must be a valid UUID'),
});

export const photoFileQuerySchema = z.object({
  size: z.enum(['full', 'thumb']).default('full').optional(),
  thumb: z.enum(['true', 'false', '1', '0']).optional(),
});

export type PhotoUploadBody = z.infer<typeof photoUploadBodySchema>;
export type PhotoQuery = z.infer<typeof photoQuerySchema>;
