const useMock = import.meta.env.VITE_USE_MOCK === 'true';
const explicitBase = import.meta.env.VITE_API_BASE_URL;
const proxyTarget = import.meta.env.VITE_API_PROXY_TARGET;

export const API_BASE = (() => {
  if (import.meta.env.DEV) {
    if (useMock) return proxyTarget || 'http://localhost:4000';
    // В development — используем относительный путь, чтобы Vite проксировал запросы и не было CORS
    return '/api';
  }
  return explicitBase || proxyTarget || '';
})();

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getPartners() {
  const url = `${API_BASE.replace(/\/$/, '')}/api/admin/partners`;
  const res = await fetch(url, { credentials: 'omit' });
  const json = await safeJson(res);
  // Support both shapes: { data: { items: [...] } } or { data: [...] } or [...]
  const items = json?.data?.items || json?.data || json || [];
  return items;
}

export default { API_BASE, getPartners };


