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

// ==========================================
// 3. Crop Cycles
// ==========================================
export const createCropCycleSchema = z
  .object({
    plotId: z.string().uuid('plotId must be a valid UUID'),
    cropName: z.string().trim().min(2, 'Crop name must be at least 2 characters').max(100),
    variety: z.string().trim().max(100).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
      .optional()
      .nullable(),
    status: z.enum(['planned', 'active', 'completed', 'abandoned']).default('planned'),
    estimatedYieldKg: z.number().positive().optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: 'endDate must be greater than or equal to startDate',
      path: ['endDate'],
    },
  );

export const updateCropCycleSchema = z
  .object({
    cropName: z.string().trim().min(2).max(100).optional(),
    variety: z.string().trim().max(100).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    status: z.enum(['planned', 'active', 'completed', 'abandoned']).optional(),
    estimatedYieldKg: z.number().positive().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: 'endDate must be greater than or equal to startDate',
      path: ['endDate'],
    },
  );

export const cropCycleQuerySchema = paginationQuerySchema.extend({
  plotId: z.string().uuid().optional(),
  status: z.enum(['planned', 'active', 'completed', 'abandoned']).optional(),
  cropName: z.string().trim().optional(),
});

// ==========================================
// 4. Activity Logs (filter by type / date / q)
// ==========================================
export const logTypeEnum = z.enum([
  'general',
  'observation',
  'irrigation',
  'fertilizer',
  'pest_control',
  'disease',
  'weather',
]);

export const createActivityLogSchema = z.object({
  cycleId: z.string().uuid('cycleId must be a valid UUID'),
  logType: logTypeEnum.default('general'),
  logDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'logDate must be YYYY-MM-DD')
    .default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().trim().min(2, 'Notes must be at least 2 characters'),
});

export const updateActivityLogSchema = z.object({
  logType: logTypeEnum.optional(),
  logDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().trim().min(2).optional(),
});

export const activityLogQuerySchema = paginationQuerySchema.extend({
  cycleId: z.string().uuid().optional(),
  type: logTypeEnum.optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
