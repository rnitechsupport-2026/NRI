import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CITIES, TYPE_LABEL } from '../utils/format.js';
import { Search } from './Icons.jsx';

const TABS = [
  { key: 'sale', label: 'Buy' },
  { key: 'rent', label: 'Rent' },
  { key: 'pg', label: 'PG / Co-living' },
  { key: 'project', label: 'New Projects' },
  { key: 'lease', label: 'Commercial' },
];

export default function SearchBar({ defaultPurpose = 'sale' }) {
  const nav = useNavigate();
  const [purpose, setPurpose] = useState(defaultPurpose);
  const [city, setCity] = useState('');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (purpose === 'project') {
      if (city) params.set('city', city);
      if (q) params.set('q', q);
      nav(`/projects?${params}`);
      return;
    }
    params.set('purpose', purpose);
    if (city) params.set('city', city);
    if (type) params.set('type', type);
    if (q.trim()) params.set('q', q.trim());
    nav(`/properties?${params}`);
  }

  return (
    <form className="searchbox" onSubmit={submit}>
      <div className="searchbox-tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button"
                  className={purpose === t.key ? 'on' : ''}
                  onClick={() => setPurpose(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="searchbox-row">
        <select className="select" value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
          <option value="">All Cities</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {purpose !== 'project' && (
          <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Property type">
            <option value="">Property Type</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}

        <div className="input-icon" style={{ flex: 1, minWidth: 180 }}>
          <Search />
          <input className="input" placeholder="Search locality, project or landmark…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <button className="btn btn-primary" type="submit"><Search /> Search</button>
      </div>
    </form>
  );
}
