/**
 * Сервис карт и маршрутов для Admin Panel
 * - OSRM для авто/пешком/велосипед
 * - (опционально) GraphHopper для общественного транспорта при наличии ключа
 */

export interface RouteResult {
  distance: number; // метры
  duration: number; // секунды
  geometry: [number, number][]; // [lat, lon]
  provider: 'osrm' | 'graphhopper';
  mode: 'driving' | 'walking' | 'cycling' | 'transit';
}

/**
 * Маршрут через публичный OSRM (для прод желательно свой инстанс)
 */
export async function buildOsrmRoute(
  start: [number, number],
  end: [number, number],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult | null> {
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const response = await fetch(osrmUrl);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    const geometry = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]) as [number, number][];
    return {
      distance: route.distance,
      duration: route.duration,
      geometry,
      provider: 'osrm',
      mode: profile,
    };
  } catch (e) {
    console.error('OSRM route error:', e);
    return null;
  }
}

/**
 * Маршрут общественным транспортом через GraphHopper (если задан ключ)
 * Внимание: ключ будет виден на клиенте — для продакшена рекомендуется backend-прокси.
 */
export async function buildTransitRouteGraphHopper(
  start: [number, number],
  end: [number, number],
  locale: string = 'ru'
): Promise<RouteResult | null> {
  const apiKey = import.meta.env.VITE_GRAPHHOPPER_API_KEY;
  if (!apiKey) return null;
  try {
    // points_encoded=false для GeoJSON-like пути
    // Используем профиль pt (public transport) если поддерживается
    const url = `https://graphhopper.com/api/1/route?point=${start[0]},${start[1]}&point=${end[0]},${end[1]}&vehicle=pt&locale=${locale}&points_encoded=false&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.paths?.length) return null;
    const route = data.paths[0];
    const coords: [number, number][] = route.points?.coordinates?.map((c: number[]) => [c[1], c[0]]) ?? [];
    return {
      distance: route.distance,
      duration: route.time ? route.time / 1000 : 0,
      geometry: coords,
      provider: 'graphhopper',
      mode: 'transit',
    };
  } catch (e) {
    console.error('GraphHopper transit error:', e);
    return null;
  }
}

export function formatDistance(meters: number): string {
  if (!meters && meters !== 0) return '';
  if (meters < 1000) return `${Math.round(meters)} м`;
  return `${(meters / 1000).toFixed(1)} км`;
}

export function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} ч ${mins} мин`;
}

/**
 * Транспорт через backend-прокси (GraphHopper)
 */
export async function buildTransitViaBackend(
  start: [number, number],
  end: [number, number]
): Promise<RouteResult | null> {
  try {
    const isDev = (import.meta as any).env?.DEV;
    const envApiBase = (import.meta as any).env?.VITE_API_URL || '';
    const API_PATH = isDev && envApiBase
      ? `${String(envApiBase).replace(/\/$/, '')}/api/v1`
      : '/api/v1';
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${API_PATH}/routes/transit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        start_latitude: start[0],
        start_longitude: start[1],
        end_latitude: end[0],
        end_longitude: end[1],
        transport_mode: 'TRANSIT',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = (data.geometry?.coordinates || []).map((c: number[]) => [c[1], c[0]]);
    const distanceMeters = typeof data.total_distance === 'string' && data.total_distance.includes('km')
      ? parseFloat(data.total_distance) * 1000
      : 0;
    const durationSeconds = typeof data.estimated_time === 'string' && data.estimated_time.includes('min')
      ? parseInt(data.estimated_time) * 60
      : 0;
    return {
      distance: Number.isFinite(distanceMeters) ? distanceMeters : 0,
      duration: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      geometry: coords as [number, number][],
      provider: 'graphhopper',
      mode: 'transit',
    };
  } catch (e) {
    console.error('Backend transit route error:', e);
    return null;
  }
}

