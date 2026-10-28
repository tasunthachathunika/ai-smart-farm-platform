import { api } from '@/lib/api';
import {
  Field,
  Plot,
  CropCycle,
  ActivityLog,
  InputApplication,
  Harvest,
  AdvisoryNote,
  Photo,
  WeatherData,
  PaginatedResponse,
  CreatePlotInput,
  CreateCropCycleInput,
  CreateActivityLogInput,
  CreateInputApplicationInput,
  CreateHarvestInput,
} from '@/types/farm';

export const farmService = {
  // --- Fields ---
  async getFields(): Promise<Field[]> {
    const res = await api.get<PaginatedResponse<Field>>('/fields');
    return res.data.data;
  },

  async createField(data: { name: string; district: string; description?: string }): Promise<Field> {
    const res = await api.post<{ field: Field }>('/fields', data);
    return res.data.field;
  },

  // --- Plots ---
  async getPlots(params?: {
    page?: number;
    limit?: number;
    q?: string;
    district?: string;
    fieldId?: string;
  }): Promise<PaginatedResponse<Plot>> {
    const res = await api.get<PaginatedResponse<Plot>>('/plots', { params });
    return res.data;
  },

  async getPlotById(id: string): Promise<Plot> {
    const res = await api.get<{ plot: Plot }>(`/plots/${id}`);
    return res.data.plot;
  },

  async createPlot(data: CreatePlotInput): Promise<Plot> {
    const res = await api.post<{ plot: Plot }>('/plots', data);
    return res.data.plot;
  },

  async updatePlot(id: string, data: Partial<CreatePlotInput>): Promise<Plot> {
    const res = await api.patch<{ plot: Plot }>(`/plots/${id}`, data);
    return res.data.plot;
  },

  async deletePlot(id: string): Promise<void> {
    await api.delete(`/plots/${id}`);
  },

  // --- Plot Weather ---
  async getPlotWeather(plotId: string, refresh = false): Promise<WeatherData> {
    const res = await api.get<{ data: WeatherData }>(`/plots/${plotId}/weather`, {
      params: refresh ? { refresh: 'true' } : undefined,
    });
    return res.data.data;
  },

  // --- Crop Cycles ---
  async getCropCycles(params?: {
    page?: number;
    limit?: number;
    plotId?: string;
    status?: string;
  }): Promise<PaginatedResponse<CropCycle>> {
    const res = await api.get<PaginatedResponse<CropCycle>>('/crop-cycles', { params });
    return res.data;
  },

  async createCropCycle(data: CreateCropCycleInput): Promise<CropCycle> {
    const res = await api.post<{ cropCycle: CropCycle }>('/crop-cycles', data);
    return res.data.cropCycle;
  },

  // --- Activity Logs ---
  async getActivityLogs(params?: {
    page?: number;
    limit?: number;
    cycleId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<ActivityLog>> {
    const res = await api.get<PaginatedResponse<ActivityLog>>('/activity-logs', { params });
    return res.data;
  },

  async createActivityLog(data: CreateActivityLogInput): Promise<ActivityLog> {
    const res = await api.post<{ activityLog: ActivityLog }>('/activity-logs', data);
    return res.data.activityLog;
  },

  async deleteActivityLog(id: string): Promise<void> {
    await api.delete(`/activity-logs/${id}`);
  },

  // --- Input Applications ---
  async getInputApplications(params?: {
    page?: number;
    limit?: number;
    cycleId?: string;
    type?: string;
  }): Promise<PaginatedResponse<InputApplication>> {
    const res = await api.get<PaginatedResponse<InputApplication>>('/input-applications', {
      params,
    });
    return res.data;
  },

  async createInputApplication(
    data: CreateInputApplicationInput
  ): Promise<InputApplication> {
    const res = await api.post<{ inputApplication: InputApplication }>(
      '/input-applications',
      data
    );
    return res.data.inputApplication;
  },

  async deleteInputApplication(id: string): Promise<void> {
    await api.delete(`/input-applications/${id}`);
  },

  // --- Harvests ---
  async getHarvests(params?: {
    page?: number;
    limit?: number;
    cycleId?: string;
    qualityGrade?: string;
  }): Promise<PaginatedResponse<Harvest>> {
    const res = await api.get<PaginatedResponse<Harvest>>('/harvests', { params });
    return res.data;
  },

  async createHarvest(data: CreateHarvestInput): Promise<Harvest> {
    const res = await api.post<{ harvest: Harvest }>('/harvests', data);
    return res.data.harvest;
  },

  async deleteHarvest(id: string): Promise<void> {
    await api.delete(`/harvests/${id}`);
  },

  // --- Photos ---
  async getPlotPhotos(plotId: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Photo>> {
    const res = await api.get<PaginatedResponse<Photo>>(`/plots/${plotId}/photos`, { params });
    return res.data;
  },

  async uploadPlotPhoto(
    plotId: string,
    file: File,
    caption?: string,
    options?: {
      onProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    if (caption && caption.trim()) {
      formData.append('caption', caption.trim());
    }
    const res = await api.post<{ message?: string; data?: Photo; photo?: Photo }>(
      `/plots/${plotId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: options?.signal,
        onUploadProgress: (progressEvent) => {
          if (options?.onProgress && progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(percent);
          }
        },
      }
    );
    const photo = res.data.data || res.data.photo;
    if (!photo) {
      throw new Error('Server returned an empty photo response.');
    }
    return photo;
  },

  // --- Advisory Notes ---
  async getPlotAdvisoryNotes(plotId: string): Promise<AdvisoryNote[]> {
    try {
      const res = await api.get<{ data: AdvisoryNote[] }>(`/plots/${plotId}/advisory-notes`);
      return res.data.data;
    } catch {
      return [];
    }
  },
};
