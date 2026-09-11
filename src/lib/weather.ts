/**
 * 实时天气数据层（服务端）
 * ---------------------------------------------------------------
 * 在服务端（构建/SSR 时）并行拉取三类数据并写入本地缓存：
 *   1. 陆地天气与 7 日预报
 *   2. 海洋数据（浪高、浪周期、海表温度）—— 景点为滨海城市时启用
 *   3. 空气质量（沙尘、PM10）—— 景点为沙漠/戈壁城市时启用
 * 任一路失败都不会影响其他数据与页面渲染。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import attraction from '../config/attraction';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'weather.v2.json');
const TTL_MS = 30 * 60 * 1000;

const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const MARINE_ENDPOINT = 'https://marine-api.open-meteo.com/v1/marine';
const AIR_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const TZ = 'America/Santiago';

export interface CurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_gusts_10m?: number | null;
  is_day: number;
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  apparent_temperature_max?: (number | null)[];
  apparent_temperature_min?: (number | null)[];
  precipitation_sum?: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  precipitation_hours?: (number | null)[];
  wind_speed_10m_max?: (number | null)[];
  wind_gusts_10m_max?: (number | null)[];
  uv_index_max?: (number | null)[];
  sunrise: string[];
  sunset: string[];
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyWeather;
}

export interface MarineData {
  current: {
    wave_height?: number | null;
    wave_period?: number | null;
    wave_direction?: number | null;
    sea_surface_temperature?: number | null;
  } | null;
  daily: {
    time?: string[];
    wave_height_max?: (number | null)[];
    wave_period_max?: (number | null)[];
    sea_surface_temperature_max?: (number | null)[];
    sea_surface_temperature_min?: (number | null)[];
  } | null;
}

export interface AirData {
  current: {
    pm10?: number | null;
    pm2_5?: number | null;
    dust?: number | null;
  } | null;
}

export interface WeatherBundle {
  weather: WeatherData;
  marine: MarineData | null;
  air: AirData | null;
}

export interface WeatherResult extends WeatherBundle {
  fetchedAt: number;
  stale: boolean;
}

/* ------------------------------------------------------------------ 请求地址 */

/** 陆地天气与预报 */
export function buildApiUrl(): string {
  const params = new URLSearchParams({
    latitude: String(attraction.latitude),
    longitude: String(attraction.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max',
    timezone: TZ,
    forecast_days: '7',
    wind_speed_unit: 'kmh',
  });
  return `${FORECAST_ENDPOINT}?${params.toString()}`;
}

/** 海洋数据（浪高 / 浪周期 / 海表温度） */
export function buildMarineUrl(): string {
  const params = new URLSearchParams({
    latitude: String(attraction.latitude),
    longitude: String(attraction.longitude),
    current: 'wave_height,wave_period,wave_direction,sea_surface_temperature',
    daily: 'wave_height_max,wave_period_max,sea_surface_temperature_max,sea_surface_temperature_min',
    timezone: TZ,
    forecast_days: '7',
  });
  return `${MARINE_ENDPOINT}?${params.toString()}`;
}

/** 空气质量（沙漠/戈壁场景的扬沙、沙尘） */
export function buildAirUrl(): string {
  const params = new URLSearchParams({
    latitude: String(attraction.latitude),
    longitude: String(attraction.longitude),
    current: 'pm10,pm2_5,dust',
    timezone: TZ,
  });
  return `${AIR_ENDPOINT}?${params.toString()}`;
}

export function buildApiUrls() {
  return { forecast: buildApiUrl(), marine: buildMarineUrl(), air: buildAirUrl() };
}

/* ------------------------------------------------------------------ 缓存读写 */

interface CacheFile extends WeatherBundle {
  fetchedAt: number;
}

async function readCache(): Promise<CacheFile | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as CacheFile;
    if (parsed?.weather?.current) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeCache(payload: CacheFile): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(payload), 'utf8');
  } catch {
    /* 缓存写入失败不影响渲染 */
  }
}

/* ------------------------------------------------------------------ 数据获取 */

async function fetchJson(url: string, timeoutMs = 8000): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getWeather(): Promise<WeatherResult | null> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return {
      weather: cached.weather,
      marine: cached.marine ?? null,
      air: cached.air ?? null,
      fetchedAt: cached.fetchedAt,
      stale: false,
    };
  }

  const [forecast, marine, air] = await Promise.all([
    fetchJson(buildApiUrl()),
    fetchJson(buildMarineUrl()),
    fetchJson(buildAirUrl()),
  ]);

  const weather = (forecast?.current && forecast?.daily ? forecast : null) as unknown as WeatherData | null;

  if (!weather) {
    if (cached) {
      return {
        weather: cached.weather,
        marine: cached.marine ?? null,
        air: cached.air ?? null,
        fetchedAt: cached.fetchedAt,
        stale: true,
      };
    }
    return null;
  }

  const bundle: WeatherBundle = {
    weather,
    marine: (marine?.current || marine?.daily ? marine : null) as unknown as MarineData | null,
    air: (air?.current ? air : null) as unknown as AirData | null,
  };

  const fetchedAt = Date.now();
  await writeCache({ fetchedAt, ...bundle });

  return { ...bundle, fetchedAt, stale: false };
}

/* ------------------------------------------------------- 兼容性再导出（纯函数） */
export { weatherGroup, weatherIcon, uvLevel, beaufort, isRainyGroup } from './weather-utils';
