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
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },

  async createField(data: { name: string; district: string; description?: string }): Promise<Field> {
    const payload = {
      name: data.name.trim(),
      district: data.district.trim(),
      description: data.description?.trim() || undefined,
    };
    const res = await api.post<{ field?: Field; data?: Field }>('/fields', payload);
    const field = res.data.field || res.data.data;
    if (!field) {
      throw new Error('Failed to create farm field: empty response.');
    }
    return field;
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
    const res = await api.get<{ plot?: Plot; data?: Plot }>(`/plots/${id}`);
    const plot = res.data.plot || res.data.data;
    if (!plot) {
      throw new Error('Plot not found');
    }
    return plot;
  },

  async createPlot(data: CreatePlotInput): Promise<Plot> {
    const payload: Record<string, unknown> = {
      name: data.name.trim(),
      district: data.district.trim(),
      areaHa: typeof data.areaHa === 'string' ? parseFloat(data.areaHa) : Number(data.areaHa),
      gps: {
        latitude: Number(data.gps.latitude),
        longitude: Number(data.gps.longitude),
      },
    };

    if (data.fieldId && typeof data.fieldId === 'string' && data.fieldId.trim()) {
      payload.fieldId = data.fieldId.trim();
    }

    if (data.soilType && typeof data.soilType === 'string' && data.soilType.trim()) {
      payload.soilType = data.soilType.trim();
    }

    if (data.irrigationSource && typeof data.irrigationSource === 'string' && data.irrigationSource.trim()) {
      payload.irrigationSource = data.irrigationSource.trim();
    }

    const res = await api.post<{ plot?: Plot; data?: Plot }>('/plots', payload);
    const plot = res.data.plot || res.data.data;
    if (!plot) {
      throw new Error('Failed to register plot: empty response.');
    }
    return plot;
  },

  async updatePlot(id: string, data: Partial<CreatePlotInput>): Promise<Plot> {
    const payload: Record<string, unknown> = {};

    if (data.name !== undefined) {
      payload.name = data.name.trim();
    }
    if (data.district !== undefined) {
      payload.district = data.district.trim();
    }
    if (data.areaHa !== undefined) {
      payload.areaHa = typeof data.areaHa === 'string' ? parseFloat(data.areaHa) : Number(data.areaHa);
    }
    if (data.gps !== undefined) {
      payload.gps = {
        latitude: Number(data.gps.latitude),
        longitude: Number(data.gps.longitude),
      };
    }
    if (data.fieldId !== undefined) {
      payload.fieldId =
        data.fieldId && typeof data.fieldId === 'string' && data.fieldId.trim()
          ? data.fieldId.trim()
          : null;
    }
    if (data.soilType !== undefined) {
      if (data.soilType && typeof data.soilType === 'string' && data.soilType.trim()) {
        payload.soilType = data.soilType.trim();
      }
    }
    if (data.irrigationSource !== undefined) {
      if (
        data.irrigationSource &&
        typeof data.irrigationSource === 'string' &&
        data.irrigationSource.trim()
      ) {
        payload.irrigationSource = data.irrigationSource.trim();
      }
    }

    const res = await api.patch<{ plot?: Plot; data?: Plot }>(`/plots/${id}`, payload);
    const plot = res.data.plot || res.data.data;
    if (!plot) {
      throw new Error('Failed to update plot: empty response.');
    }
    return plot;
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
