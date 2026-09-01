import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import ProjectCard from '../components/ProjectCard.jsx';
import { Crumbs, Empty, Pagination, SkeletonGrid } from '../components/ui.jsx';
import { CITIES, titleCase } from '../utils/format.js';
import { Search, Building } from '../components/Icons.jsx';

const STATUSES = ['upcoming', 'ongoing', 'completed'];
const TYPES = ['apartment', 'villa', 'plot', 'commercial', 'township'];

export default function Projects() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');

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
    api.get('/projects', { params: { ...Object.fromEntries(params), limit: 9 } })
      .then((r) => live && setResult(r.data))
      .catch(() => live && setResult({ data: [], total: 0, pages: 0 }));
    return () => { live = false; };
  }, [params]);

  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'New Projects' }]} />
          <h1>New launches &amp; ongoing projects</h1>
          <p>RERA approved developments from verified builders, with transparent pricing and possession dates.</p>
        </div>
      </div>

      <section className="section-sm">
        <div className="container">
          <div className="card card-p mb-3">
            <form className="row" style={{ gap: 12, flexWrap: 'wrap' }}
                  onSubmit={(e) => { e.preventDefault(); setParam({ q }); }}>
              <div className="input-icon" style={{ flex: '1 1 240px' }}>
                <Search />
                <input className="input" placeholder="Search project or locality…"
                       value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="select" style={{ width: 170 }} value={get('city')}
                      onChange={(e) => setParam({ city: e.target.value })}>
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="select" style={{ width: 170 }} value={get('type')}
                      onChange={(e) => setParam({ type: e.target.value })}>
                <option value="">All types</option>
                {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </select>
              <button className="btn btn-dark">Search</button>
            </form>

            <div className="pills mt-3">
              <button className={`pill ${!get('status') ? 'on' : ''}`} onClick={() => setParam({ status: '' })}>
                All projects
              </button>
              {STATUSES.map((s) => (
                <button key={s} className={`pill ${get('status') === s ? 'on' : ''}`}
                        onClick={() => setParam({ status: s })}>
                  {titleCase(s)}
                </button>
              ))}
            </div>
          </div>

          {result === null ? <SkeletonGrid count={6} cols="g-3" />
            : result.data.length === 0 ? (
              <Empty icon={Building} title="No projects found"
                     action={<button className="btn btn-dark" onClick={() => setParams({})}>Clear filters</button>}>
                Try a different city or clear the filters to see everything.
              </Empty>
            ) : (
              <>
                <p className="muted small mb-2"><b className="strong">{result.total}</b> projects</p>
                <div className="grid g-3">
                  {result.data.map((p) => <ProjectCard key={p.id} project={p} />)}
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
