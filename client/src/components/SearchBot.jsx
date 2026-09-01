import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import PropertyCard from './PropertyCard.jsx';
import { Notice } from './ui.jsx';
import { Search, ArrowRight, X, Info, Sparkle } from './Icons.jsx';
import { money, titleCase, TYPE_LABEL, PURPOSE_LABEL } from '../utils/format.js';

/**
 * Floating natural-language property search.
 *
 * Same panel mechanics as the property assistant but a distinct orange skin,
 * so the two are never confused: green = "explain this listing",
 * orange = "find me a listing".
 */
export default function SearchBot() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [examples, setExamples] = useState([]);
  const [isAi, setIsAi] = useState(true);

  const feedRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setNudge(true), 5200);
    const h = setTimeout(() => setNudge(false), 14000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [result]);

  function toggle() {
    const next = !open;
    setOpen(next);
    setNudge(false);
    if (next && !examples.length) {
      api.get('/properties/meta/search-assistant')
        .then((r) => { setExamples(r.data.data.examples || []); setIsAi(r.data.data.ai); })
        .catch(() => {});
    }
    if (next) setTimeout(() => inputRef.current?.focus(), 260);
  }

  async function run(q) {
    const query = (q ?? text).trim();
    if (!query || busy) return;
    setText(query);
    setBusy(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/properties/search-assistant', { query });
      setResult(data.data);
    } catch (e) {
      setError(errMsg(e, 'Could not run that search'));
    } finally {
      setBusy(false);
    }
  }

  function seeAll() {
    setOpen(false);
    nav(`/properties?${new URLSearchParams(result.params)}`);
  }

  return (
    <>
      {/* ----------------------------------------------------- launcher */}
      <div className="botdock botdock--search">
        {nudge && !open && (
          <button className="bot-nudge" onClick={toggle}>
            Tell me what home you want
          </button>
        )}
        <button
          className={`bot-launch bot-launch--search ${open ? 'on' : ''}`}
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? 'Close smart search' : 'Open smart search'}
        >
          {open ? <X /> : <Search />}
          {!open && <span className="bot-launch-ping" />}
        </button>
      </div>

      {/* -------------------------------------------------------- panel */}
      {open && (
        <>
          <div className="bot-scrim" onClick={() => setOpen(false)} />
          <section className="bot-panel bot-panel--search" role="dialog" aria-label="Smart property search">
            <header className="bot-head bot-head--search">
              <span className="bot-avatar bot-avatar--search"><Search /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>Smart search</h3>
                <p className="tiny">Describe your ideal home in plain English</p>
              </div>
              <button className="btn btn-xs btn-ghost" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </button>
            </header>

            <form className="bot-input" onSubmit={(e) => { e.preventDefault(); run(); }}>
              <input
                ref={inputRef}
                className="input"
                placeholder="3 BHK in Adyar under 2 crore with parking…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={300}
                disabled={busy}
              />
              <button className="btn btn-accent btn-icon" disabled={busy || !text.trim()} aria-label="Search">
                {busy ? <span className="spinner" /> : <ArrowRight />}
              </button>
            </form>

            <div className="bot-feed" ref={feedRef}>
              {error && <Notice type="err">{error}</Notice>}

              {!result && !busy && !error && (
                <div className="sbot-intro">
                  <Sparkle />
                  <p className="small">
                    Skip the filter sidebar — just say what you&apos;re after and I&apos;ll
                    translate it into a search.
                  </p>
                  {examples.length > 0 && (
                    <div className="sbot-examples">
                      {examples.map((ex) => (
                        <button key={ex} className="sbot-example" onClick={() => run(ex)}>{ex}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {busy && (
                <div className="bot-loading">
                  <span className="spinner spinner-dark" />
                  <span className="small muted">Working out what you mean…</span>
                </div>
              )}

              {result && (
                <>
                  <div className="sbot-said">
                    <Sparkle />
                    <p>{result.interpretation}</p>
                  </div>

                  {result.understood && <FilterChips filters={result.filters} />}

                  {result.results.length === 0 ? (
                    <div className="sbot-empty">
                      <p className="strong small">No listings match that yet.</p>
                      <p className="tiny muted mt-1">
                        Try widening the budget or dropping a requirement.
                      </p>
                      <button className="btn btn-outline btn-sm mt-2"
                              onClick={() => { setOpen(false); nav('/properties'); }}>
                        Browse everything
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="row-between">
                        <span className="tiny muted">
                          <b className="strong">{result.total}</b> match{result.total === 1 ? '' : 'es'}
                        </span>
                        <button className="btn btn-xs btn-dark" onClick={seeAll}>
                          See all <ArrowRight />
                        </button>
                      </div>
                      <div className="stack" style={{ gap: 12 }}>
                        {result.results.map((p) => <PropertyCard key={p.id} property={p} />)}
                      </div>
                      <button className="btn btn-accent btn-block btn-sm" onClick={seeAll}>
                        Open all {result.total} in the search page <ArrowRight />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <p className="bot-foot">
              <Info />
              {isAi
                ? 'Understands plain English. Results come from live listings only.'
                : <>Keyword matching. Add <code>ANTHROPIC_API_KEY</code> on the server for full language understanding.</>}
            </p>
          </section>
        </>
      )}
    </>
  );
}

/** Shows what the assistant actually filtered on, so nothing is a black box. */
function FilterChips({ filters: f }) {
  const chips = [];
  if (f.purpose) chips.push(PURPOSE_LABEL[f.purpose] || f.purpose);
  f.bhk?.forEach((b) => chips.push(`${b} BHK`));
  f.property_type?.forEach((t) => chips.push(TYPE_LABEL[t] || t));
  if (f.locality) chips.push(f.locality);
  if (f.city) chips.push(f.city);
  if (f.minPrice && f.maxPrice) chips.push(`${money(f.minPrice)} – ${money(f.maxPrice)}`);
  else if (f.maxPrice) chips.push(`Under ${money(f.maxPrice)}`);
  else if (f.minPrice) chips.push(`Above ${money(f.minPrice)}`);
  if (f.minArea) chips.push(`${f.minArea}+ sqft`);
  if (f.furnishing) chips.push(titleCase(f.furnishing));
  if (f.possession) chips.push(titleCase(f.possession));
  f.amenities?.forEach((a) => chips.push(a));
  if (f.hasTour) chips.push('Has 3D tour');
  if (f.verifiedOnly) chips.push('Verified only');
  if (f.keywords) chips.push(`“${f.keywords}”`);

  if (!chips.length) return null;
  return (
    <div className="sbot-chips">
      {chips.map((c, i) => <span key={i} className="sbot-chip">{c}</span>)}
    </div>
  );
}
