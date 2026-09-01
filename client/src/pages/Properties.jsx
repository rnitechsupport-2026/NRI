import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import PropertyCard from '../components/PropertyCard.jsx';
import { Crumbs, Empty, Pagination, SkeletonGrid, Notice } from '../components/ui.jsx';
import SaveSearch from '../components/bots/SaveSearch.jsx';
import { CITIES, TYPE_LABEL, PURPOSE_LABEL, money, titleCase } from '../utils/format.js';
import { Search, Grid, List, X, Filter, Home as HomeIcon, Cube } from '../components/Icons.jsx';

const PRICE_STEPS = [0, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000];
const RENT_STEPS = [0, 5000, 10000, 15000, 25000, 40000, 75000, 150000, 500000];
const BHK = [1, 2, 3, 4, 5];
const SORTS = [
  { v: '', label: 'Recommended' },
  { v: 'newest', label: 'Newest first' },
  { v: 'price-low', label: 'Price: low to high' },
  { v: 'price-high', label: 'Price: high to low' },
  { v: 'area-high', label: 'Area: largest first' },
  { v: 'popular', label: 'Most viewed' },
];

export default function Properties() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('grid');
  const [localities, setLocalities] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');

  const get = useCallback((k, d = '') => params.get(k) ?? d, [params]);
  const purpose = get('purpose', 'sale');
  const isRental = purpose === 'rent' || purpose === 'pg' || purpose === 'lease';
  const steps = isRental ? RENT_STEPS : PRICE_STEPS;

  const setParam = useCallback((patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, v);
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    let live = true;
    setResult(null); setError('');
    const query = Object.fromEntries(params);
    api.get('/properties', { params: { ...query, limit: 12 } })
      .then((r) => { if (live) setResult(r.data); })
      .catch((e) => { if (live) setError(e.response?.data?.message || 'Could not load properties'); });
    return () => { live = false; };
  }, [params]);

  useEffect(() => {
    api.get('/properties/meta/localities', { params: { city: get('city') } })
      .then((r) => setLocalities(r.data.data)).catch(() => setLocalities([]));
  }, [get]);

  // toggle helper for comma-joined multi-value params
  const toggleMulti = (key, value) => {
    const cur = (get(key) || '').split(',').filter(Boolean);
    const next = cur.includes(String(value))
      ? cur.filter((x) => x !== String(value))
      : [...cur, String(value)];
    setParam({ [key]: next.join(',') });
  };
  const hasMulti = (key, value) => (get(key) || '').split(',').includes(String(value));

  const activeChips = useMemo(() => {
    const chips = [];
    for (const [k, v] of params.entries()) {
      if (['page', 'limit', 'sort', 'purpose'].includes(k) || !v) continue;
      const label = k === 'type' ? v.split(',').map((t) => TYPE_LABEL[t] || t).join(', ')
        : k === 'bhk' ? `${v} BHK`
        : k === 'minPrice' ? `Min ${money(v)}`
        : k === 'maxPrice' ? `Max ${money(v)}`
        : k === 'q' ? `“${v}”`
        : titleCase(v);
      chips.push({ k, label });
    }
    return chips;
  }, [params]);

  const page = Number(get('page', 1));

  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Properties' }]} />
          <h1>{PURPOSE_LABEL[purpose] || 'Properties'}{get('city') ? ` in ${get('city')}` : ' in India'}</h1>
          <p>
            {result ? `${result.total} propert${result.total === 1 ? 'y' : 'ies'} found` : 'Searching…'}
            {get('q') ? ` for “${get('q')}”` : ''}
          </p>
        </div>
      </div>

      <section className="section-sm">
        <div className="container listing-layout">
          {/* ------------------------------------------------ filters */}
          <aside className="filters card">
            <div className="filter-group row-between">
              <span className="row strong" style={{ gap: 8 }}>
                <Filter style={{ width: 16, height: 16 }} /> Filters
              </span>
              <button className="btn btn-xs btn-ghost" onClick={() => setParams({ purpose })}>Clear all</button>
            </div>

            <div className="filter-group">
              <h4>Looking to</h4>
              <div className="pills">
                {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                  <button key={k} className={`pill ${purpose === k ? 'on' : ''}`}
                          onClick={() => setParam({ purpose: k, minPrice: '', maxPrice: '' })}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Search</h4>
              <form onSubmit={(e) => { e.preventDefault(); setParam({ q }); }}>
                <div className="input-icon">
                  <Search />
                  <input className="input" placeholder="Locality, project…" value={q}
                         onChange={(e) => setQ(e.target.value)} />
                </div>
              </form>
            </div>

            <div className="filter-group">
              <h4>City</h4>
              <select className="select" value={get('city')} onChange={(e) => setParam({ city: e.target.value, locality: '' })}>
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {localities.length > 0 && (
                <div className="pills mt-2">
                  {localities.slice(0, 8).map((l) => (
                    <button key={l.locality}
                            className={`pill ${get('q') === l.locality ? 'on' : ''}`}
                            onClick={() => { setQ(l.locality); setParam({ q: l.locality }); }}>
                      {l.locality} <span className="tiny muted">({l.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-group">
              <h4>Property type</h4>
              <div className="pills">
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <button key={k} className={`pill ${hasMulti('type', k) ? 'on' : ''}`}
                          onClick={() => toggleMulti('type', k)}>{v}</button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Bedrooms</h4>
              <div className="pills">
                {BHK.map((b) => (
                  <button key={b} className={`pill ${hasMulti('bhk', b) ? 'on' : ''}`}
                          onClick={() => toggleMulti('bhk', b)}>{b} BHK</button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Budget</h4>
              <div className="grid g-2" style={{ gap: 10 }}>
                <select className="select" value={get('minPrice')} onChange={(e) => setParam({ minPrice: e.target.value })}>
                  <option value="">Min</option>
                  {steps.slice(0, -1).map((s) => <option key={s} value={s}>{money(s)}</option>)}
                </select>
                <select className="select" value={get('maxPrice')} onChange={(e) => setParam({ maxPrice: e.target.value })}>
                  <option value="">Max</option>
                  {steps.slice(1).map((s) => <option key={s} value={s}>{money(s)}</option>)}
                </select>
              </div>
            </div>

            <div className="filter-group">
              <h4>Furnishing</h4>
              <div className="pills">
                {['unfurnished', 'semi-furnished', 'fully-furnished'].map((f) => (
                  <button key={f} className={`pill ${get('furnishing') === f ? 'on' : ''}`}
                          onClick={() => setParam({ furnishing: get('furnishing') === f ? '' : f })}>
                    {titleCase(f)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Posted by</h4>
              <div className="pills">
                {['owner', 'agent', 'builder'].map((r) => (
                  <button key={r} className={`pill ${get('postedBy') === r ? 'on' : ''}`}
                          onClick={() => setParam({ postedBy: get('postedBy') === r ? '' : r })}>
                    {titleCase(r)}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group stack" style={{ gap: 10 }}>
              <label className="checkline">
                <input type="checkbox" checked={get('verified') === 'true'}
                       onChange={(e) => setParam({ verified: e.target.checked ? 'true' : '' })} />
                Verified listings only
              </label>
              <label className="checkline">
                <input type="checkbox" checked={get('possession') === 'ready-to-move'}
                       onChange={(e) => setParam({ possession: e.target.checked ? 'ready-to-move' : '' })} />
                Ready to move
              </label>
            </div>
          </aside>

          {/* ------------------------------------------------ results */}
          <div>
            <div className="toolbar">
              <div className="row" style={{ gap: 10 }}>
                <span className="small muted">
                  {result ? <><b className="strong">{result.total}</b> results</> : 'Loading…'}
                </span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                {/* New-listing bot: alert me when a fresh listing matches this */}
                <SaveSearch
                  params={Object.fromEntries(params)}
                  label={`${get('bhk') ? `${get('bhk')} BHK ` : ''}${PURPOSE_LABEL[purpose] || ''}${get('city') ? ` in ${get('city')}` : ''}`.trim()}
                />
                <select className="select btn-sm" style={{ height: 38, width: 'auto' }}
                        value={get('sort')} onChange={(e) => setParam({ sort: e.target.value })}>
                  {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
                <div className="viewtoggle">
                  <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid view"><Grid /></button>
                  <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="List view"><List /></button>
                </div>
              </div>
            </div>

            {activeChips.length > 0 && (
              <div className="chips">
                {activeChips.map((c) => (
                  <span key={c.k} className="chip">
                    {c.label}
                    <button onClick={() => setParam({ [c.k]: '' })} aria-label={`Remove ${c.label}`}><X /></button>
                  </span>
                ))}
              </div>
            )}

            {error && <Notice type="err">{error}</Notice>}

            {result === null ? <SkeletonGrid count={6} cols="g-3" />
              : result.data.length === 0 ? (
                <Empty icon={HomeIcon} title="No properties match these filters"
                       action={<button className="btn btn-dark" onClick={() => setParams({ purpose })}>Reset filters</button>}>
                  Try widening your budget, removing a filter or searching a nearby locality.
                </Empty>
              ) : (
                <>
                  <div className={view === 'grid' ? 'grid g-3' : 'stack'} style={{ gap: 20 }}>
                    {result.data.map((p) => (
                      <PropertyCard key={p.id} property={p} layout={view} />
                    ))}
                  </div>
                  <Pagination page={page} pages={result.pages}
                              onChange={(n) => { setParam({ page: n }); window.scrollTo({ top: 0 }); }} />
                </>
              )}

            <div className="card card-p mt-4 row-between" style={{ background: 'var(--gold-100)', borderColor: 'var(--gold-500)' }}>
              <div className="row" style={{ gap: 14 }}>
                <Cube style={{ width: 30, height: 30, color: 'var(--gold-700)' }} />
                <div>
                  <div className="strong">Look for the 3D badge</div>
                  <div className="small" style={{ color: 'var(--gold-700)' }}>
                    Those listings include a full walkthrough you can explore before booking a visit.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
