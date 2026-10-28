import { z } from 'zod';
import { paginationQuerySchema } from '../utils/pagination';

export const createAdvisoryNoteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(255)
    .default('Field Advisory Note'),
  notes: z.string().trim().min(5, 'Advisory notes must be at least 5 characters').max(5000),
  recommendations: z.string().trim().max(2000).optional().nullable(),
});

export const advisoryNoteQuerySchema = paginationQuerySchema;
