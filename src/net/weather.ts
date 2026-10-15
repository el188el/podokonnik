// Погода и поиск города через Open-Meteo: бесплатно, без ключа и регистрации.

import { roundCoord, skyFromCode, type Place, type Weather } from '../game/weather';
import { cityViaServer, loggedIn, weatherViaServer } from './api';

const get = async (url: string, ms = 6000) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
};

/** Сначала напрямую из Open-Meteo, не вышло — через наш сервер (у части мобильных операторов Open-Meteo не открывается). */
export async function fetchWeather(p: Place, t = Date.now()): Promise<Weather> {
  let c: { code: number; temp: number; day: boolean } | null = null;
  try {
    const j = await get(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=weather_code,temperature_2m,is_day`);
    const cur = j?.current;
    if (cur && typeof cur.weather_code === 'number') c = { code: cur.weather_code, temp: Number(cur.temperature_2m) || 0, day: cur.is_day !== 0 };
  } catch { /* попробуем через сервер */ }
  if (!c && loggedIn()) c = await weatherViaServer(p.lat, p.lon);
  if (!c || typeof c.code !== 'number') throw new Error('bad weather');
  return { sky: skyFromCode(c.code), temp: Number(c.temp) || 0, day: c.day !== false, at: t };
}

export interface CityHit extends Place {
  region: string;
}

export async function findCity(q: string): Promise<CityHit[]> {
  let j: { results?: Record<string, unknown>[] } | null = null;
  try {
    j = await get(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=ru&name=${encodeURIComponent(q.trim())}`);
  } catch (e) {
    if (!loggedIn()) throw e;
    j = await cityViaServer(q.trim());
  }
  return (j?.results ?? []).map((r: Record<string, unknown>) => ({
    city: String(r.name),
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: roundCoord(Number(r.latitude)),
    lon: roundCoord(Number(r.longitude)),
  }));
}

type TgLocation = {
  isInited: boolean;
  isLocationAvailable: boolean;
  init: (cb?: () => void) => void;
  getLocation: (cb: (d: { latitude: number; longitude: number } | null) => void) => void;
};

/** Координаты устройства: в Telegram — через LocationManager, иначе — через браузер. */
export async function locate(): Promise<{ lat: number; lon: number }> {
  const lm = (window as unknown as { Telegram?: { WebApp?: { LocationManager?: TgLocation } } }).Telegram?.WebApp?.LocationManager;
  if (lm?.init) {
    const d = await new Promise<{ latitude: number; longitude: number } | null>((ok) => {
      const go = () => (lm.isLocationAvailable ? lm.getLocation(ok) : ok(null));
      if (lm.isInited) go(); else lm.init(go);
    });
    if (d) return { lat: roundCoord(d.latitude), lon: roundCoord(d.longitude) };
  }
  if (!navigator.geolocation) throw new Error('no geolocation');
  const pos = await new Promise<GeolocationPosition>((ok, fail) =>
    navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600e3 }),
  );
  return { lat: roundCoord(pos.coords.latitude), lon: roundCoord(pos.coords.longitude) };
}

/** Название города по координатам (если не вышло — «Мой город»). */
export async function cityName(lat: number, lon: number): Promise<string> {
  try {
    const j = await get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ru`);
    return String(j?.city || j?.locality || 'Мой город');
  } catch {
    return 'Мой город';
  }
}
