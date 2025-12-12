/**
 * Сервис для работы с картами
 * Функции: поиск адресов, геокодирование, построение маршрутов
 */

interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    country?: string;
  };
}

interface RouteResult {
  distance: number; // в метрах
  duration: number; // в секундах
  geometry: [number, number][]; // координаты маршрута
}

/**
 * Построение маршрута через backend-прокси (OSRM), возвращает ту же структуру
 */
export async function buildRouteViaBackend(
  start: [number, number],
  end: [number, number],
  mode: 'driving' | 'walking' | 'cycling' | 'transit' = 'driving'
): Promise<RouteResult | null> {
  try {
    const isDev = (import.meta as any).env?.DEV;
    const envApiBase = (import.meta as any).env?.VITE_API_URL || '';
    const base = isDev && envApiBase ? String(envApiBase).replace(/\/$/, '') : '';
    const token = localStorage.getItem('partner_token');
    const url = base ? `${base}/api/v1/routes/osrm` : '/api/v1/routes/osrm';
    const res = await fetch(url, {
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
        transport_mode: mode.toUpperCase(),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = (data.geometry?.coordinates || []).map((c: number[]) => [c[1], c[0]]);
    // Попытка извлечь метрики из текста (fallback на 0)
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
    };
  } catch (e) {
    console.error('Backend route error:', e);
    return null;
  }
}

export async function buildTransitViaBackend(
  start: [number, number],
  end: [number, number]
): Promise<RouteResult | null> {
  try {
    const isDev = (import.meta as any).env?.DEV;
    const envApiBase = (import.meta as any).env?.VITE_API_URL || '';
    const base = isDev && envApiBase ? String(envApiBase).replace(/\/$/, '') : '';
    const token = localStorage.getItem('partner_token');
    const url = base ? `${base}/api/v1/routes/transit` : '/api/v1/routes/transit';
    const res = await fetch(url, {
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
    };
  } catch (e) {
    console.error('Backend transit route error:', e);
    return null;
  }
}

/**
 * Поиск адреса через Nominatim (OpenStreetMap)
 */
export async function searchAddress(query: string): Promise<GeocodeResult[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=kg`,
      {
        headers: {
          'User-Agent': 'YESS-Loyalty-App/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      display_name: item.display_name,
      address: {
        road: item.address?.road,
        house_number: item.address?.house_number,
        city: item.address?.city || item.address?.town,
        country: item.address?.country,
      }
    }));
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}

/**
 * Обратное геокодирование (координаты -> адрес)
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'YESS-Loyalty-App/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }
    
    const data = await response.json();
    return {
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      display_name: data.display_name,
      address: {
        road: data.address?.road,
        house_number: data.address?.house_number,
        city: data.address?.city || data.address?.town,
        country: data.address?.country,
      }
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Построение маршрута через OSRM (Open Source Routing Machine)
 * Использует публичный сервер OSRM (можно заменить на свой)
 */
export async function buildRoute(
  start: [number, number],
  end: [number, number],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteResult | null> {
  try {
    // Используем публичный OSRM сервер (для production нужен свой)
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      throw new Error('Route building failed');
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }
    
    const route = data.routes[0];
    const geometry = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]); // [lat, lon]
    
    return {
      distance: route.distance, // в метрах
      duration: route.duration, // в секундах
      geometry: geometry as [number, number][]
    };
  } catch (error) {
    console.error('Route building error:', error);
    return null;
  }
}

/**
 * Поиск ближайших партнеров
 */
export function findNearestPartners(
  userLocation: [number, number],
  partners: Array<{ latitude: number; longitude: number; [key: string]: any }>,
  maxDistance: number = 5000 // в метрах
): Array<{ partner: any; distance: number }> {
  const results: Array<{ partner: any; distance: number }> = [];
  
  partners.forEach(partner => {
    if (!partner.latitude || !partner.longitude) return;
    
    const distance = calculateDistance(
      userLocation,
      [partner.latitude, partner.longitude]
    );
    
    if (distance <= maxDistance) {
      results.push({ partner, distance });
    }
  });
  
  // Сортируем по расстоянию
  results.sort((a, b) => a.distance - b.distance);
  
  return results;
}

/**
 * Вычисление расстояния между двумя точками (формула гаверсинуса)
 */
function calculateDistance(point1: [number, number], point2: [number, number]): number {
  const R = 6371000; // Радиус Земли в метрах
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
  const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Расстояние в метрах
}

/**
 * Форматирование расстояния для отображения
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }
  return `${(meters / 1000).toFixed(1)} км`;
}

/**
 * Форматирование времени для отображения
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} ч ${mins} мин`;
}

