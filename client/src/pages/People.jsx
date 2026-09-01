import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import AgentCard from '../components/AgentCard.jsx';
import { Crumbs, Empty, Pagination, SkeletonGrid } from '../components/ui.jsx';
import { CITIES } from '../utils/format.js';
import { Search, Users } from '../components/Icons.jsx';

const COPY = {
  agent: {
    title: 'RERA registered agents',
    sub: 'Local experts who know pricing, paperwork and negotiation in your micro-market.',
    empty: 'No agents match this search',
  },
  builder: {
    title: 'Verified builders & developers',
    sub: 'Established developers with delivered projects, RERA registration and transparent pricing.',
    empty: 'No builders match this search',
  },
};

export default function People({ role }) {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  const copy = COPY[role];

  const get = (k) => params.get(k) || '';
  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    let live = true;
    setResult(null);
    setQ(params.get('q') || '');
    api.get('/users', { params: { ...Object.fromEntries(params), role, limit: 12 } })
      .then((r) => live && setResult(r.data))
      .catch(() => live && setResult({ data: [], total: 0, pages: 0 }));
    return () => { live = false; };
  }, [params, role]);

  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[{ label: 'Home', to: '/' }, { label: copy.title }]} />
          <h1>{copy.title}</h1>
          <p>{copy.sub}</p>
        </div>
      </div>

      <section className="section-sm">
        <div className="container">
          <div className="card card-p mb-3">
            <form className="row" style={{ gap: 12, flexWrap: 'wrap' }}
                  onSubmit={(e) => { e.preventDefault(); setParam({ q }); }}>
              <div className="input-icon" style={{ flex: '1 1 260px' }}>
                <Search />
                <input className="input" placeholder={`Search ${role} name or company…`}
                       value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="select" style={{ width: 180 }} value={get('city')}
                      onChange={(e) => setParam({ city: e.target.value })}>
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="checkline" style={{ padding: '0 6px' }}>
                <input type="checkbox" checked={get('verified') === 'true'}
                       onChange={(e) => setParam({ verified: e.target.checked ? 'true' : '' })} />
                Verified only
              </label>
              <button className="btn btn-dark">Search</button>
            </form>
          </div>

          {result === null ? <SkeletonGrid count={8} />
            : result.data.length === 0 ? (
              <Empty icon={Users} title={copy.empty}
                     action={<button className="btn btn-dark" onClick={() => setParams({})}>Clear filters</button>}>
                Try another city or clear your filters.
              </Empty>
            ) : (
              <>
                <p className="muted small mb-2"><b className="strong">{result.total}</b> results</p>
                <div className="grid g-4">
                  {result.data.map((u) => <AgentCard key={u.id} user={u} />)}
                </div>
                <Pagination page={Number(get('page') || 1)} pages={result.pages}
                            onChange={(n) => { setParam({ page: n }); window.scrollTo({ top: 0 }); }} />
              </>
            )}
        </div>
      </section>
    </>
  );
}
