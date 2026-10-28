import { pool } from '../db';
import { UserResponse } from './auth.service';
import { authzService } from './authz.service';
import { NotFound, ServiceUnavailable } from '../utils/errors';
import { writeAuditLog } from '../utils/audit';
import { logger } from '../utils/logger';

export interface DistrictCoordinates {
  latitude: number;
  longitude: number;
  normalizedName: string;
}

/**
 * Administrative district coordinates lookup table for all 25 districts of Sri Lanka.
 * Protects farmer GPS privacy by never sending precise GPS to external services.
 */
export const DISTRICT_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  ampara: { latitude: 7.2912, longitude: 81.6724 },
  anuradhapura: { latitude: 8.3114, longitude: 80.4037 },
  badulla: { latitude: 6.9934, longitude: 81.055 },
  batticaloa: { latitude: 7.731, longitude: 81.6747 },
  colombo: { latitude: 6.9271, longitude: 79.8612 },
  galle: { latitude: 6.0535, longitude: 80.221 },
  gampaha: { latitude: 7.084, longitude: 80.0098 },
  hambantota: { latitude: 6.1429, longitude: 81.1212 },
  jaffna: { latitude: 9.6615, longitude: 80.0255 },
  kalutara: { latitude: 6.5854, longitude: 79.9607 },
  kandy: { latitude: 7.2906, longitude: 80.6337 },
  kegalle: { latitude: 7.2513, longitude: 80.3464 },
  kilinochchi: { latitude: 9.3803, longitude: 80.377 },
  kurunegala: { latitude: 7.4863, longitude: 80.3623 },
  mannar: { latitude: 8.981, longitude: 79.9044 },
  matale: { latitude: 7.4675, longitude: 80.6234 },
  matara: { latitude: 5.9549, longitude: 80.555 },
  monaragala: { latitude: 6.8714, longitude: 81.3487 },
  mullaitivu: { latitude: 9.2671, longitude: 80.8142 },
  nuwara_eliya: { latitude: 6.9497, longitude: 80.7891 },
  polonnaruwa: { latitude: 7.9403, longitude: 81.0188 },
  puttalam: { latitude: 8.0408, longitude: 79.8394 },
  ratnapura: { latitude: 6.7056, longitude: 80.3847 },
  trincomalee: { latitude: 8.5874, longitude: 81.2152 },
  vavuniya: { latitude: 8.7542, longitude: 80.4982 },
};

/**
 * Retrieves representative coordinates for a district from the lookup table.
 * Falls back to Sri Lanka central coordinates if district is unmapped.
 */
export function getDistrictCoordinates(districtName: string): DistrictCoordinates {
  const normalizedKey = (districtName || '')
    .toLowerCase()
    .trim()
    .replace(/[-\s]+/g, '_');
  const coords = DISTRICT_COORDINATES[normalizedKey];

  if (coords) {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      normalizedName: districtName.trim(),
    };
  }

  // Fallback central coordinate if district name is unlisted
  return {
    latitude: 7.8731,
    longitude: 80.7718,
    normalizedName: (districtName || 'Sri Lanka').trim(),
  };
}

export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Variable weather';
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  apparentTemperature: number;
  precipitation: number;
  rain: number;
  weatherCode: number;
  weatherDescription: string;
  windSpeed: number;
  windDirection: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  weatherDescription: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
}

export interface WeatherResponse {
  plotId: string;
  district: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  current: CurrentWeather;
  daily: DailyForecast[];
  lastUpdated: string;
  isCached: boolean;
  isFallback: boolean;
}

export interface OpenMeteoRawPayload {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    is_day?: number;
    precipitation?: number;
    rain?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
  };
  [key: string]: unknown;
}

export class WeatherService {
  // Cache TTL: 30 minutes
  public static readonly CACHE_TTL_MS = 30 * 60 * 1000;
  // Network timeout: 5000ms
  public static readonly DEFAULT_TIMEOUT_MS = 5000;

  /**
   * Fetches weather for a plot by its district coordinates.
   * Adheres strictly to AGENTS.md GPS privacy:
   * 1. Uses district coordinates lookup table, never farmer's exact GPS.
   * 2. Caches results in weather_data with fetched timestamp.
   * 3. Returns last-updated time.
   * 4. Falls back to cached copy if Open-Meteo API fails or times out.
   */
  public async getPlotWeather(
    user: UserResponse,
    plotId: string,
    options: {
      timeoutMs?: number;
      forceRefresh?: boolean;
      meta?: { ipAddress?: string; userAgent?: string };
    } = {},
  ): Promise<WeatherResponse> {
    // 1. Authorization: returns 404 for unauthorized users (admin, IDOR farmer, unshared officer)
    await authzService.assertPlotAccess(user, plotId, 'view_only');

    // 2. Fetch plot district
    const { rows: plotRows } = await pool.query<{ id: string; district: string }>(
      'SELECT id, district FROM plots WHERE id = $1;',
      [plotId],
    );

    if (plotRows.length === 0) {
      throw new NotFound('Resource not found');
    }

    const district = plotRows[0].district;
    const districtCoords = getDistrictCoordinates(district);

    // 3. Officer audit trail
    if (user.role === 'officer') {
      await writeAuditLog({
        userId: user.id,
        action: 'plot_viewed_by_officer',
        entityType: 'weather_data',
        entityId: plotId,
        metadata: { plotId, district },
        ipAddress: options.meta?.ipAddress,
        userAgent: options.meta?.userAgent,
      });
    }

    // 4. Check weather_data cache in database
    const cachedRow = await this.getCachedWeather(district);
    const now = Date.now();
    const timeoutMs = options.timeoutMs ?? WeatherService.DEFAULT_TIMEOUT_MS;

    const isCacheFresh =
      cachedRow &&
      !options.forceRefresh &&
      now - new Date(cachedRow.fetched_at).getTime() < WeatherService.CACHE_TTL_MS;

    if (isCacheFresh && cachedRow) {
      return this.formatWeatherResponse(
        plotId,
        district,
        districtCoords,
        cachedRow.data,
        cachedRow.fetched_at,
        true,
        false,
      );
    }

    // 5. Cache is expired or missing: attempt live fetch from Open-Meteo
    try {
      const liveData = await this.fetchOpenMeteo(
        districtCoords.latitude,
        districtCoords.longitude,
        timeoutMs,
      );

      // Save/update cache in weather_data
      const updatedRow = await this.saveWeatherCache(district, plotId, liveData);

      return this.formatWeatherResponse(
        plotId,
        district,
        districtCoords,
        liveData,
        updatedRow.fetched_at,
        false,
        false,
      );
    } catch (apiError) {
      logger.warn(
        { err: apiError, district },
        'Open-Meteo weather fetch failed or timed out. Checking for cached fallback.',
      );

      // 6. Fallback to cached copy if available
      if (cachedRow) {
        return this.formatWeatherResponse(
          plotId,
          district,
          districtCoords,
          cachedRow.data,
          cachedRow.fetched_at,
          true,
          true,
        );
      }

      // No cached data available and live API call failed
      throw new ServiceUnavailable(
        'Weather service is currently unavailable and no cached forecast exists for this district.',
      );
    }
  }

  /**
   * Fetches weather data from Open-Meteo API using district coordinates with an explicit timeout.
   */
  public async fetchOpenMeteo(
    latitude: number,
    longitude: number,
    timeoutMs: number,
  ): Promise<OpenMeteoRawPayload> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude.toFixed(4));
    url.searchParams.set('longitude', longitude.toFixed(4));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m',
    );
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    );
    url.searchParams.set('timezone', 'auto');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo responded with HTTP status ${response.status}`);
      }

      const json = (await response.json()) as OpenMeteoRawPayload;
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retrieves cached weather data for a district.
   */
  public async getCachedWeather(district: string): Promise<{
    id: string;
    district: string;
    data: OpenMeteoRawPayload;
    fetched_at: Date;
  } | null> {
    const normalizedDistrict = district.trim();
    const { rows } = await pool.query<{
      id: string;
      district: string;
      data: OpenMeteoRawPayload;
      fetched_at: Date;
    }>(
      `SELECT id, district, data, fetched_at
       FROM weather_data
       WHERE LOWER(district) = LOWER($1)
       ORDER BY fetched_at DESC
       LIMIT 1;`,
      [normalizedDistrict],
    );

    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Persists or updates cached weather data for a district.
   */
  public async saveWeatherCache(
    district: string,
    plotId: string,
    data: OpenMeteoRawPayload,
  ): Promise<{ id: string; fetched_at: Date }> {
    const normalizedDistrict = district.trim();
    const { rows } = await pool.query<{ id: string; fetched_at: Date }>(
      `INSERT INTO weather_data (district, plot_id, data, fetched_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (district)
       DO UPDATE SET data = EXCLUDED.data,
                     plot_id = EXCLUDED.plot_id,
                     fetched_at = NOW(),
                     updated_at = NOW()
       RETURNING id, fetched_at;`,
      [normalizedDistrict, plotId, JSON.stringify(data)],
    );

    return rows[0];
  }

  private formatWeatherResponse(
    plotId: string,
    district: string,
    coords: DistrictCoordinates,
    rawPayload: OpenMeteoRawPayload,
    fetchedAt: Date,
    isCached: boolean,
    isFallback: boolean,
  ): WeatherResponse {
    const currentRaw = rawPayload.current || {};
    const dailyRaw = rawPayload.daily || {};

    const weatherCode = Number(currentRaw.weather_code ?? 0);

    const current: CurrentWeather = {
      temperature: Number(currentRaw.temperature_2m ?? 0),
      humidity: Number(currentRaw.relative_humidity_2m ?? 0),
      apparentTemperature: Number(currentRaw.apparent_temperature ?? 0),
      precipitation: Number(currentRaw.precipitation ?? 0),
      rain: Number(currentRaw.rain ?? 0),
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
      windSpeed: Number(currentRaw.wind_speed_10m ?? 0),
      windDirection: Number(currentRaw.wind_direction_10m ?? 0),
      isDay: Boolean(currentRaw.is_day ?? 1),
    };

    const dailyTimes: string[] = dailyRaw.time || [];
    const dailyCodes: number[] = dailyRaw.weather_code || [];
    const dailyMaxTemps: number[] = dailyRaw.temperature_2m_max || [];
    const dailyMinTemps: number[] = dailyRaw.temperature_2m_min || [];
    const dailyPrecip: number[] = dailyRaw.precipitation_sum || [];

    const daily: DailyForecast[] = dailyTimes.map((dateStr, index) => {
      const code = Number(dailyCodes[index] ?? 0);
      return {
        date: dateStr,
        weatherCode: code,
        weatherDescription: getWeatherDescription(code),
        temperatureMax: Number(dailyMaxTemps[index] ?? 0),
        temperatureMin: Number(dailyMinTemps[index] ?? 0),
        precipitationSum: Number(dailyPrecip[index] ?? 0),
      };
    });

    return {
      plotId,
      district,
      coordinates: {
        latitude: coords.latitude,
        longitude: coords.longitude,
      },
      current,
      daily,
      lastUpdated:
        fetchedAt instanceof Date ? fetchedAt.toISOString() : new Date(fetchedAt).toISOString(),
      isCached,
      isFallback,
    };
  }
}

export const weatherService = new WeatherService();
