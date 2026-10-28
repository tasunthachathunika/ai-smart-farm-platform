import { api } from '@/lib/api';
import {
  AISummaryRequest,
  AIVisitPrepRequest,
  AIServiceResponse,
  SummaryOutput,
  VisitPrepOutput,
} from '@/types/farm';

export const aiService = {
  /**
   * POST /api/ai/summary
   * Synthesizes season records and generates discussion points.
   */
  async generateSummary(
    request: AISummaryRequest,
    options?: { signal?: AbortSignal }
  ): Promise<AIServiceResponse<SummaryOutput>> {
    const res = await api.post<AIServiceResponse<SummaryOutput>>('/ai/summary', request, {
      signal: options?.signal,
    });
    return res.data;
  },

  /**
   * POST /api/ai/visit-prep
   * Prepares focused questions and inspection items for agricultural officer visits.
   */
  async generateVisitPrep(
    request: AIVisitPrepRequest,
    options?: { signal?: AbortSignal }
  ): Promise<AIServiceResponse<VisitPrepOutput>> {
    const res = await api.post<AIServiceResponse<VisitPrepOutput>>('/ai/visit-prep', request, {
      signal: options?.signal,
    });
    return res.data;
  },
};
