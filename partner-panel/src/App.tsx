import React, { useEffect, useState } from 'react';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';
const explicitBase = import.meta.env.VITE_API_BASE_URL;
const proxyTarget = import.meta.env.VITE_API_PROXY_TARGET;

const API_BASE = (() => {
  if (import.meta.env.DEV) {
    if (useMock) return proxyTarget || 'http://localhost:4000';
    if (explicitBase) return explicitBase;
    return proxyTarget || 'http://localhost:4000';
  }
  // production
  return explicitBase || proxyTarget || '';
})();

type Partner = { id: number; name: string; status: string; logo?: string };

export default function App() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/partners`);
      const data = await res.json();
      // data format: { data: { items: [...] } } or { data: { items } }
      const items = data?.data?.items || data?.data || [];
      setPartners(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: 20 }}>
      <h2>Partner Panel (Mock)</h2>
      <p>API base: {API_BASE}</p>
      <button onClick={fetchPartners} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
      <div style={{ display: 'grid', gap: 12 }}>
        {partners.map((p) => (
          <div key={p.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ color: '#666' }}>{p.status}</div>
            {p.logo && <img src={`${API_BASE}${p.logo}`} alt="logo" style={{ width: 64, marginTop: 8 }} />}
          </div>
        ))}
        {partners.length === 0 && !loading && <div>No partners</div>}
      </div>
    </div>
  );
}


