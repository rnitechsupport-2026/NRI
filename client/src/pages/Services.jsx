import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import ServiceCard from '../components/ServiceCard.jsx';
import { Crumbs, Empty, Pagination, SkeletonGrid } from '../components/ui.jsx';
import { CITIES } from '../utils/format.js';
import { Search, Wrench } from '../components/Icons.jsx';

export default function Services() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');

  const get = (k) => params.get(k) || '';
  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.get('/services/meta/categories').then((r) => setCats(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setResult(null);
    api.get('/services', { params: { ...Object.fromEntries(params), limit: 12 } })
      .then((r) => live && setResult(r.data))
      .catch(() => live && setResult({ data: [], total: 0, pages: 0 }));
    return () => { live = false; };
  }, [params]);

  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Services' }]} />
          <h1>Home services &amp; property experts</h1>
          <p>Interiors, legal verification, home loans, packers &amp; movers and more — from partners we have vetted.</p>
        </div>
      </div>

      <section className="section-sm">
        <div className="container">
          <div className="card card-p mb-3">
            <form className="row" style={{ gap: 12, flexWrap: 'wrap' }}
                  onSubmit={(e) => { e.preventDefault(); setParam({ q }); }}>
              <div className="input-icon" style={{ flex: '1 1 260px' }}>
                <Search />
                <input className="input" placeholder="Search a service…" value={q}
                       onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="select" style={{ width: 180 }} value={get('city')}
                      onChange={(e) => setParam({ city: e.target.value })}>
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-dark">Search</button>
            </form>

            {cats.length > 0 && (
              <div className="pills mt-3">
                <button className={`pill ${!get('category') ? 'on' : ''}`} onClick={() => setParam({ category: '' })}>
                  All categories
                </button>
                {cats.map((c) => (
                  <button key={c.category} className={`pill ${get('category') === c.category ? 'on' : ''}`}
                          onClick={() => setParam({ category: c.category })}>
                    {c.category} <span className="tiny muted">({c.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {result === null ? <SkeletonGrid count={8} />
            : result.data.length === 0 ? (
              <Empty icon={Wrench} title="No services found"
                     action={<button className="btn btn-dark" onClick={() => setParams({})}>Clear filters</button>}>
                Try a different category or city.
              </Empty>
            ) : (
              <>
                <p className="muted small mb-2"><b className="strong">{result.total}</b> services</p>
                <div className="grid g-4">
                  {result.data.map((s) => <ServiceCard key={s.id} service={s} />)}
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
