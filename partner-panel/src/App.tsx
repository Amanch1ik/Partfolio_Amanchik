import React, { useEffect, useState } from 'react';
import api, { API_BASE } from './services/api';

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
      const items = await api.getPartners();
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
            {p.logo && <img src={`${API_BASE.replace(/\/$/, '')}${p.logo}`} alt="logo" style={{ width: 64, marginTop: 8 }} />}
          </div>
        ))}
        {partners.length === 0 && !loading && <div>No partners</div>}
      </div>
    </div>
  );
}


