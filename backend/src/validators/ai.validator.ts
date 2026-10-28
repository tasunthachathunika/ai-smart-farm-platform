import { z } from 'zod';

// Input request schemas
export const aiSummaryRequestSchema = z.object({
  plotId: z.string().uuid('plotId must be a valid UUID'),
  cycleId: z.string().uuid('cycleId must be a valid UUID').optional(),
  userPrompt: z.string().trim().max(1000, 'userPrompt cannot exceed 1000 characters').optional(),
});

export const aiVisitPrepRequestSchema = z.object({
  plotId: z.string().uuid('plotId must be a valid UUID'),
  cycleId: z.string().uuid('cycleId must be a valid UUID').optional(),
  focusAreas: z
    .array(z.string().trim().max(100, 'Focus area text too long'))
    .max(10, 'Maximum 10 focus areas allowed')
    .optional(),
});

// Observation item schema grounded with source record IDs
export const observationSchema = z.object({
  observation: z.string().min(1, 'Observation cannot be empty'),
  sourceRecordIds: z.array(z.string()).default([]),
});

// Output schema for Summary
export const summarySchema = z.object({
  summary: z.string().min(1, 'Summary cannot be empty'),
  keyObservations: z.array(observationSchema).default([]),
  suggestedOfficerQuestions: z
    .array(z.string().min(1))
    .min(1, 'At least one officer question must be suggested'),
  dataGaps: z.array(z.string()).default([]),
});

// Visit prep issue schema grounded with source record IDs
export const visitPrepIssueSchema = z.object({
  issue: z.string().min(1, 'Issue cannot be empty'),
  sourceRecordIds: z.array(z.string()).default([]),
  suggestedAction: z.string().min(1, 'Suggested action cannot be empty'),
});

// Output schema for Visit Prep
export const visitPrepSchema = z.object({
  purpose: z.string().min(1, 'Purpose cannot be empty'),
  timelineSummary: z.string().min(1, 'Timeline summary cannot be empty'),
  keyIssues: z.array(visitPrepIssueSchema).default([]),
  discussionQuestions: z
    .array(z.string().min(1))
    .min(1, 'At least one discussion question must be generated'),
  inspectionsRecommended: z.array(z.string()).default([]),
});

export type AISummaryRequest = z.infer<typeof aiSummaryRequestSchema>;
export type AIVisitPrepRequest = z.infer<typeof aiVisitPrepRequestSchema>;
export type SummaryOutput = z.infer<typeof summarySchema>;
export type VisitPrepOutput = z.infer<typeof visitPrepSchema>;
