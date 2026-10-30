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
  customTopic?: string;
}

export interface AIVisitPrepRequest {
  plotId: string;
  cycleId?: string;
  focusAreas?: string[];
  customTopic?: string;
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
  disclaimer?: string;
}

// --- Sharing & Permissions Types ---
export type ShareScope =
  | 'crop_cycles'
  | 'activity_logs'
  | 'input_applications'
  | 'harvests'
  | 'photos'
  | 'advisory_notes'
  | 'view_only'
  | 'advisory'
  | 'full';

export interface SharedPlotRecord {
  id: string;
  plotId: string;
  plotName?: string;
  district?: string;
  officerId: string;
  officerName?: string;
  officerEmail?: string;
  farmerId?: string;
  farmerName?: string;
  scope: string;
  scopes?: string[];
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
}

export interface CreateShareInput {
  officerId: string;
  plotIds: string[];
  scopes?: string[];
  scope?: ShareScope;
  expiresAt?: string | null;
}

export interface VerifiedOfficer {
  id: string;
  fullName: string;
  email: string;
  district: string;
  department: string;
  isVerified: boolean;
}

// --- Audit Log Types ---
export interface AuditEntry {
  id: string;
  userId: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// --- Officer Module Types ---
export interface OfficerPlotItem {
  id: string;
  name: string;
  district: string;
  gps_blurred_district: string;
  gps: null;
  areaHa: number;
  soilType: string | null;
  irrigationSource: string | null;
  farmer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
  };
  share: {
    id: string;
    scope: ShareScope;
    scopes: string[];
    grantedAt: string;
    expiresAt: string | null;
  };
}

export interface OfficerAdvisoryNote {
  id: string;
  plotId: string;
  officerId: string;
  officerName: string;
  officerEmail: string;
  title: string;
  notes: string;
  recommendations: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdvisoryNoteInput {
  title?: string;
  notes: string;
  recommendations?: string | null;
}



