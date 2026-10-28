import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination';

export const uuidParamSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

// ==========================================
// 1. Fields
// ==========================================
export const createFieldSchema = z.object({
  name: z.string().trim().min(2, 'Field name must be at least 2 characters').max(255),
  district: z.string().trim().min(2, 'District must be specified').max(100),
  description: z.string().trim().max(1000).optional(),
});

export const updateFieldSchema = createFieldSchema.partial();

export const fieldQuerySchema = paginationQuerySchema.extend({
  district: z.string().trim().optional(),
});

// ==========================================
// 2. Plots (with GPS coordinates)
// ==========================================
export const gpsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const createPlotSchema = z.object({
  fieldId: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Plot name must be at least 2 characters').max(255),
  district: z.string().trim().min(2, 'District is required for officer visibility').max(100),
  areaHa: z.number().positive('area_ha must be greater than 0'),
  gps: gpsCoordinatesSchema,
  soilType: z.string().trim().max(100).optional(),
  irrigationSource: z.string().trim().max(100).optional(),
});

export const updatePlotSchema = z.object({
  fieldId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(255).optional(),
  district: z.string().trim().min(2).max(100).optional(),
  areaHa: z.number().positive().optional(),
  gps: gpsCoordinatesSchema.optional(),
  soilType: z.string().trim().max(100).optional(),
  irrigationSource: z.string().trim().max(100).optional(),
});

export const plotQuerySchema = paginationQuerySchema.extend({
  district: z.string().trim().optional(),
  fieldId: z.string().uuid().optional(),
});
