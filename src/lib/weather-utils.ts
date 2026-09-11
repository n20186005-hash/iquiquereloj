/**
 * 天气纯函数工具层
 * ---------------------------------------------------------------
 * 本文件不允许引入任何 Node 专属模块（fs / path 等），
 * 因为它同时被「服务端渲染」和「浏览器端静默刷新脚本」引用。
 */

/** WMO weather code → 语义分组（与 i18n conditions 键一一对应） */
export function weatherGroup(code: number): string {
  if (code === 0) return 'clear';
  if (code === 1) return 'mainlyClear';
  if (code === 2) return 'partlyCloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'unknown';
}

export function weatherIcon(group: string, isDay = 1): string {
  switch (group) {
    case 'clear':
      return isDay ? '☀️' : '🌙';
    case 'mainlyClear':
      return isDay ? '🌤️' : '🌙';
    case 'partlyCloudy':
      return isDay ? '⛅' : '☁️';
    case 'overcast':
      return '☁️';
    case 'fog':
      return '🌫️';
    case 'drizzle':
      return '🌦️';
    case 'rain':
      return '🌧️';
    case 'showers':
      return '🌦️';
    case 'snow':
      return '🌨️';
    case 'thunderstorm':
      return '⛈️';
    default:
      return '🌡️';
  }
}

export function uvLevel(value: number | null | undefined): string {
  const v = value ?? 0;
  if (v < 3) return 'low';
  if (v < 6) return 'moderate';
  if (v < 8) return 'high';
  if (v < 11) return 'veryHigh';
  return 'extreme';
}

/** 蒲福风级（用于把 km/h 翻译成游客能懂的风力描述） */
export function beaufort(kmh: number | null | undefined): number {
  const v = kmh ?? 0;
  const limits = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  for (let i = 0; i < limits.length; i += 1) if (v < limits[i]) return i;
  return 12;
}

export const isRainyGroup = (group: string) =>
  group === 'drizzle' || group === 'rain' || group === 'showers' || group === 'thunderstorm';
