export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface Field {
  id: string;
  name: string;
  district: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Plot {
  id: string;
  farmerId: string;
  fieldId?: string | null;
  name: string;
  district: string;
  areaHa: number;
  soilType?: string | null;
  irrigationSource?: string | null;
  gps: GpsCoordinates | null;
  activeCrop?: string | null;
  isShared?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CropCycleStatus = 'planned' | 'active' | 'completed' | 'abandoned';

export interface CropCycle {
  id: string;
  plotId: string;
  cropName: string;
  variety?: string | null;
  startDate: string;
  endDate?: string | null;
  status: CropCycleStatus;
  estimatedYieldKg?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type LogType =
  | 'general'
  | 'observation'
  | 'irrigation'
  | 'fertilizer'
  | 'pest_control'
  | 'disease'
  | 'weather';

export interface ActivityLog {
  id: string;
  cycleId: string;
  logType: LogType;
  logDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InputType = 'fertilizer' | 'pesticide' | 'seed' | 'organic_matter' | 'other';

export interface InputApplication {
  id: string;
  cycleId: string;
  inputType: InputType;
  name: string;
  quantity: number;
  unit: string;
  applicationDate: string;
  cost?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Harvest {
  id: string;
  cycleId: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  qualityGrade?: string | null;
  revenue?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvisoryNote {
  id: string;
  plotId: string;
  officerId: string;
  officerName?: string;
  notes: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  plotId: string;
  uploaderId?: string;
  filename?: string;
  originalName?: string;
  mimeType?: string;
  fileSize?: number;
  width?: number | null;
  height?: number | null;
  caption?: string | null;
  capturedAt?: string;
  createdAt: string;
  url?: string;
  thumbnailUrl?: string;
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  apparentTemperature?: number;
  precipitation: number;
  rain?: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  windDirection?: number;
  isDay?: boolean;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
}

export interface WeatherData {
  plotId: string;
  district: string;
  coordinates: GpsCoordinates;
  current: CurrentWeather;
  daily: DailyForecast[];
  lastUpdated: string;
  isCached: boolean;
  isFallback: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePlotInput {
  fieldId?: string;
  name: string;
  district: string;
  areaHa: number;
  gps: GpsCoordinates;
  soilType?: string;
  irrigationSource?: string;
}

export interface CreateCropCycleInput {
  plotId: string;
  cropName: string;
  variety?: string;
  startDate: string;
  endDate?: string | null;
  status?: CropCycleStatus;
  estimatedYieldKg?: number | null;
}

export interface CreateActivityLogInput {
  cycleId: string;
  logType?: LogType;
  logDate: string;
  notes: string;
}

export interface CreateInputApplicationInput {
  cycleId: string;
  inputType?: InputType;
  name: string;
  quantity: number;
  unit: string;
  applicationDate: string;
  cost?: number | null;
}

export interface CreateHarvestInput {
  cycleId: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  qualityGrade?: string | null;
  revenue?: number | null;
  notes?: string | null;
}

// --- AI Request & Response Types ---
export interface AISummaryRequest {
  plotId: string;
  cycleId?: string;
  userPrompt?: string;
}

export interface AIVisitPrepRequest {
  plotId: string;
  cycleId?: string;
  focusAreas?: string[];
}

export interface ObservationItem {
  observation: string;
  sourceRecordIds: string[];
}

export interface SummaryOutput {
  summary: string;
  keyObservations: ObservationItem[];
  suggestedOfficerQuestions: string[];
  dataGaps: string[];
}

export interface VisitPrepIssue {
  issue: string;
  sourceRecordIds: string[];
  suggestedAction: string;
}

export interface VisitPrepOutput {
  purpose: string;
  timelineSummary: string;
  keyIssues: VisitPrepIssue[];
  discussionQuestions: string[];
  inspectionsRecommended: string[];
}

export interface AIServiceResponse<T> {
  analysisId: string;
  plotId: string;
  analysisType: 'summary' | 'visit_prep';
  data: T;
  isFallback: boolean;
  flags?: string[];
  refusal?: boolean;
}

