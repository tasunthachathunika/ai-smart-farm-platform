import { api } from '@/lib/api';
import {
  PaginatedResponse,
  OfficerPlotItem,
  CropCycle,
  ActivityLog,
  InputApplication,
  Harvest,
  Photo,
  WeatherData,
  OfficerAdvisoryNote,
  CreateAdvisoryNoteInput,
} from '@/types/farm';

export interface OfficerPlotQueryParams {
  page?: number;
  limit?: number;
  district?: string;
  scope?: string;
  q?: string;
}

export const officerService = {
  /**
   * GET /api/officer/plots
   * Returns list of plots shared with this verified officer.
   * GPS coordinates are strictly null (blurred to district).
   */
  async getOfficerPlots(params?: OfficerPlotQueryParams): Promise<PaginatedResponse<OfficerPlotItem>> {
    const res = await api.get<PaginatedResponse<OfficerPlotItem>>('/officer/plots', { params });
    return res.data;
  },

  /**
   * GET /api/officer/plots/:id
   * Returns plot metadata if share is active and unexpired. Returns 404 if revoked/expired.
   */
  async getOfficerPlotById(plotId: string): Promise<OfficerPlotItem> {
    const res = await api.get<{ plot: OfficerPlotItem }>(`/officer/plots/${plotId}`);
    return res.data.plot;
  },

  /**
   * GET /api/officer/plots/:id/crop-cycles
   */
  async getPlotCropCycles(
    plotId: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<PaginatedResponse<CropCycle>> {
    const res = await api.get<PaginatedResponse<CropCycle>>(`/officer/plots/${plotId}/crop-cycles`, { params });
    return res.data;
  },

  /**
   * GET /api/officer/plots/:id/activity-logs
   */
  async getPlotActivityLogs(
    plotId: string,
    params?: { page?: number; limit?: number; logType?: string }
  ): Promise<PaginatedResponse<ActivityLog>> {
    const res = await api.get<PaginatedResponse<ActivityLog>>(`/officer/plots/${plotId}/activity-logs`, { params });
    return res.data;
  },

  /**
   * GET /api/officer/plots/:id/input-applications
   */
  async getPlotInputApplications(
    plotId: string,
    params?: { page?: number; limit?: number; inputType?: string }
  ): Promise<PaginatedResponse<InputApplication>> {
    const res = await api.get<PaginatedResponse<InputApplication>>(`/officer/plots/${plotId}/input-applications`, { params });
    return res.data;
  },

  /**
   * GET /api/officer/plots/:id/harvests
   */
  async getPlotHarvests(
    plotId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Harvest>> {
    const res = await api.get<PaginatedResponse<Harvest>>(`/officer/plots/${plotId}/harvests`, { params });
    return res.data;
  },

  /**
   * GET /api/officer/plots/:id/photos
   */
  async getPlotPhotos(
    plotId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<Photo>> {
    const res = await api.get<PaginatedResponse<Photo>>(`/officer/plots/${plotId}/photos`, { params });
    return res.data;
  },

  /**
   * GET /api/officer/plots/:id/weather
   */
  async getPlotWeather(plotId: string): Promise<WeatherData> {
    const res = await api.get<{ data: WeatherData }>(`/officer/plots/${plotId}/weather`);
    return res.data.data;
  },

  /**
   * GET /api/officer/plots/:id/advisory-notes
   */
  async getPlotAdvisoryNotes(
    plotId: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<OfficerAdvisoryNote>> {
    const res = await api.get<PaginatedResponse<OfficerAdvisoryNote>>(`/officer/plots/${plotId}/advisory-notes`, { params });
    return res.data;
  },

  /**
   * POST /api/plots/:id/advisory-notes
   * Officer creates a human-authored advisory note for this shared plot.
   */
  async createAdvisoryNote(
    plotId: string,
    data: CreateAdvisoryNoteInput
  ): Promise<OfficerAdvisoryNote> {
    const res = await api.post<{ advisoryNote: OfficerAdvisoryNote }>(`/plots/${plotId}/advisory-notes`, data);
    return res.data.advisoryNote;
  },
};
