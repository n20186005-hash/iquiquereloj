/**
 * 天气 → 可执行建议 规则引擎
 * ---------------------------------------------------------------
 * 设计原则：
 *  1. 只输出「游客下一步该做什么」，不堆砌气象术语（湿度、辐照强度一律翻译成人话）。
 *  2. 条件不满足的条目直接不返回 → 组件端动态渲染，不下雨就永远不出现雨伞。
 *  3. 返回的是 i18n 键而不是文案，四语言各写各的，规则只有一份。
 *  4. 本文件必须保持纯函数、无副作用、不引入 Node 模块，
 *     浏览器端静默刷新脚本会复用同一份规则，保证前后端建议永不打架。
 */
import { weatherGroup, isRainyGroup } from './weather-utils';

/** 阈值集中管理，便于按景点所在气候带调整 */
export const THRESHOLDS = {
  heat: 32, // ℃ 高温
  veryHot: 35, // ℃ 极端高温
  cold: 10, // ℃ 偏冷
  freezing: 5, // ℃ 严寒
  swing: 8, // ℃ 昼夜温差
  windBreezy: 30, // km/h ≈ 蒲福 5 级
  windStrong: 50, // km/h ≈ 蒲福 7 级
  popUmbrella: 60, // % 降水概率
  rainHeavy: 10, // mm/日 大到暴雨
  uvProtect: 5, // 紫外线需要防护
  uvHigh: 8, // 紫外线强
  uvExtreme: 11, // 紫外线危险值
  waveCaution: 1.2, // m 浪高需谨慎
  waveDanger: 2, // m 浪高禁止下水
  seaCold: 17, // ℃ 海水偏冷
  seaCool: 20, // ℃ 海水偏凉
  pm10Dust: 100, // µg/m³ 扬沙
  pm10DustHigh: 150, // µg/m³ 沙尘
} as const;

export interface AdviceMarine {
  wave: number | null;
  period: number | null;
  seaTemp: number | null;
}

export interface AdviceAir {
  pm10: number | null;
  dust: number | null;
}

export interface AdviceInput {
  /** 今日主导天气码（WMO） */
  code: number;
  tempMax: number;
  tempMin: number;
  windMax: number | null;
  gustMax: number | null;
  /** 今日最高降水概率 % */
  pop: number | null;
  /** 今日累计降水量 mm */
  rainSum: number | null;
  uv: number | null;
  marine?: AdviceMarine | null;
  air?: AdviceAir | null;
}

export interface AdviceResult {
  /** 风险提醒：优先级最高，置顶展示 */
  alerts: string[];
  /** 出行穿搭 */
  outfit: string[];
  /** 游玩安排 */
  plan: string[];
  /** 随身物品 */
  gear: string[];
  /** 是否存在预警（存在时页面会弱化普通建议的视觉权重） */
  hasAlert: boolean;
}

export function buildAdvice(input: AdviceInput): AdviceResult {
  const group = weatherGroup(input.code);
  const rainy = isRainyGroup(group);
  const thunder = group === 'thunderstorm';
  const foggy = group === 'fog';

  const tempMax = input.tempMax;
  const tempMin = input.tempMin;
  const swing = Math.round(tempMax - tempMin);
  const wind = input.windMax ?? 0;
  const pop = input.pop ?? 0;
  const rainSum = input.rainSum ?? 0;
  const uv = input.uv ?? 0;

  const wave = input.marine?.wave ?? null;
  const seaTemp = input.marine?.seaTemp ?? null;
  const pm10 = input.air?.pm10 ?? null;
  const heavyRain = rainy && rainSum >= THRESHOLDS.rainHeavy;

  /* ---------------------------------------------------------------- 风险提醒 */
  const alerts: string[] = [];
  if (thunder) alerts.push('alertThunderstorm');
  if (heavyRain) alerts.push('alertHeavyRain');
  if (wind >= THRESHOLDS.windStrong) alerts.push('alertHighWind');
  if (foggy) alerts.push('alertFog');
  if (tempMax >= THRESHOLDS.veryHot) alerts.push('alertExtremeHeat');
  if (uv >= THRESHOLDS.uvExtreme) alerts.push('alertExtremeUv');
  if (tempMax <= THRESHOLDS.freezing) alerts.push('alertCold');
  if (wave !== null && wave >= THRESHOLDS.waveDanger) alerts.push('alertHighSwell');
  if (pm10 !== null && pm10 >= THRESHOLDS.pm10DustHigh) alerts.push('alertDust');

  /* ---------------------------------------------------------------- 出行穿搭 */
  const outfit: string[] = [];
  if (tempMax >= THRESHOLDS.heat) outfit.push('outfitHot');
  else if (tempMax >= 24) outfit.push('outfitWarm');
  else if (tempMax >= 16) outfit.push('outfitMild');
  else if (tempMax >= THRESHOLDS.cold) outfit.push('outfitCool');
  else outfit.push('outfitCold');

  if (swing > THRESHOLDS.swing) outfit.push('outfitSwing');
  if (rainy) outfit.push('outfitRainproof');
  if (wind >= THRESHOLDS.windBreezy) outfit.push('outfitWindy');

  /* ---------------------------------------------------------------- 游玩安排 */
  const plan: string[] = [];
  if (thunder) plan.push('planThunderstorm');
  else if (heavyRain) plan.push('planRainHeavy');
  else if (rainy) plan.push('planRainLight');
  else if (foggy) plan.push('planFog');
  else if (group === 'clear' || group === 'mainlyClear') plan.push('planClear');
  else plan.push('planCloudy');

  // 海边场景（仅当海洋数据可用时输出，避免凭空断言）
  if (wave !== null) {
    if (wave >= THRESHOLDS.waveDanger) plan.push('planBeachDanger');
    else if (wave >= THRESHOLDS.waveCaution) plan.push('planBeachCaution');
    else if (!rainy && wind < THRESHOLDS.windBreezy) plan.push('planBeachOk');
  }
  if (seaTemp !== null && seaTemp < THRESHOLDS.seaCold) plan.push('planBeachCold');

  if (tempMax >= THRESHOLDS.heat) plan.push('planHeat');
  if (tempMax >= 28 && uv >= THRESHOLDS.uvHigh && !rainy) plan.push('planDesertMidday');
  if (uv >= THRESHOLDS.uvHigh) plan.push('planHighUv');
  if (wind >= THRESHOLDS.windStrong) plan.push('planWindStrong');
  else if (wind >= THRESHOLDS.windBreezy) plan.push('planWind');

  /* ---------------------------------------------------------------- 随身物品 */
  const gear: string[] = [];
  if (uv >= THRESHOLDS.uvProtect) gear.push('gearSunscreen');
  if (tempMax >= THRESHOLDS.heat) gear.push('gearWater');
  if (heavyRain) gear.push('gearRaincoat');
  else if (pop >= THRESHOLDS.popUmbrella) gear.push('gearUmbrella');
  else if (group === 'drizzle') gear.push('gearFoldingUmbrella');
  if (tempMax <= THRESHOLDS.cold) gear.push('gearWarm');
  else if (swing > THRESHOLDS.swing) gear.push('gearLayer');
  if (wind >= THRESHOLDS.windBreezy) gear.push('gearWindproof');
  if (foggy || (pm10 !== null && pm10 >= THRESHOLDS.pm10Dust)) gear.push('gearMask');

  const dedupe = (list: string[]) => Array.from(new Set(list));

  return {
    alerts: dedupe(alerts),
    outfit: dedupe(outfit),
    plan: dedupe(plan),
    gear: dedupe(gear),
    hasAlert: alerts.length > 0,
  };
}

/**
 * 把规则引擎返回的键渲染成最终文案。
 * 只有极少数条目需要填数字（温差、海水温度），统一用 {n} 占位，避免各端各自拼字符串。
 */
export function formatAdvice(key: string, table: Record<string, string>, input: AdviceInput): string {
  const raw = table[key] ?? '';
  if (!raw.includes('{n}')) return raw;
  const value = key === 'outfitSwing' ? Math.round(input.tempMax - input.tempMin) : Math.round(input.marine?.seaTemp ?? 0);
  return raw.replace(/\{n\}/g, String(value));
}

/** 把任意一条天气数据整理成规则引擎的输入（服务端与浏览器端共用，避免口径不一致） */
export function toAdviceInput(payload: {
  weather: {
    current: { weather_code: number; wind_speed_10m: number | null; wind_gusts_10m?: number | null };
    daily: Record<string, unknown>;
  };
  marine?: { current?: Record<string, unknown> | null; daily?: Record<string, unknown> | null } | null;
  air?: { current?: Record<string, unknown> | null } | null;
}): AdviceInput {
  const { current, daily } = payload.weather;
  const num = (arr: unknown, index = 0): number | null => {
    const value = Array.isArray(arr) ? arr[index] : undefined;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };

  const marineCurrent = payload.marine?.current ?? null;
  const marineDaily = payload.marine?.daily ?? null;
  const seaNumber = (key: string): number | null => {
    const fromCurrent = marineCurrent?.[key];
    if (typeof fromCurrent === 'number' && Number.isFinite(fromCurrent)) return fromCurrent;
    return num(marineDaily?.[key]);
  };

  return {
    code: num(daily.weather_code) ?? current.weather_code,
    tempMax: num(daily.temperature_2m_max) ?? 0,
    tempMin: num(daily.temperature_2m_min) ?? 0,
    windMax: num(daily.wind_speed_10m_max) ?? current.wind_speed_10m,
    gustMax: num(daily.wind_gusts_10m_max) ?? current.wind_gusts_10m ?? null,
    pop: num(daily.precipitation_probability_max),
    rainSum: num(daily.precipitation_sum),
    uv: num(daily.uv_index_max),
    marine: payload.marine
      ? {
          wave: seaNumber('wave_height'),
          period: seaNumber('wave_period'),
          seaTemp: seaNumber('sea_surface_temperature'),
        }
      : null,
    air: payload.air
      ? {
          pm10: typeof payload.air.current?.pm10 === 'number' ? (payload.air.current.pm10 as number) : null,
          dust: typeof payload.air.current?.dust === 'number' ? (payload.air.current.dust as number) : null,
        }
      : null,
  };
}
