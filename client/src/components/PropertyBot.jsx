import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api/client.js';
import { Notice } from './ui.jsx';
import { Sparkle, Send, Refresh, Info, User, X, Calendar, Document, Phone, Chart } from './Icons.jsx';
import FlowRunner from './bots/FlowRunner.jsx';
import EmiBot from './bots/EmiBot.jsx';
import DocsBot from './bots/DocsBot.jsx';
import ContactBot from './bots/ContactBot.jsx';

/** The tools available inside the assistant, in tab order. */
const TOOLS = [
  { key: 'ask', label: 'Ask', icon: Sparkle },
  { key: 'visit', label: 'Visit', icon: Calendar },
  { key: 'emi', label: 'EMI', icon: Chart },
  { key: 'docs', label: 'Docs', icon: Document },
  { key: 'contact', label: 'Contact', icon: Phone },
];

/**
 * Floating AI assistant for a single property.
 *
 * Renders as a small launcher pinned to the right edge; clicking it opens a
 * panel with a summary of the listing and a follow-up chat. Nothing is fetched
 * until the visitor actually opens it, so a page view costs no LLM call.
 *
 * Everything it says is grounded in the listing's own data — the server builds
 * a fact sheet from the database row and forbids invention.
 */
export default function PropertyBot({ propertyId, title, price, purpose }) {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState('ask');
  const [loaded, setLoaded] = useState(false);      // summary fetched at least once
  const [nudge, setNudge] = useState(false);        // one-time "ask me" bubble

  const [summary, setSummary] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [chat, setChat] = useState([]);             // {role, content}
  const [question, setQuestion] = useState('');
  const [thinking, setThinking] = useState(false);
  const [chatError, setChatError] = useState('');

  const feedRef = useRef(null);
  const inputRef = useRef(null);

  // Reset when the visitor navigates to a different property.
  useEffect(() => {
    setOpen(false); setLoaded(false); setSummary(null); setTool('ask');
    setChat([]); setError(''); setChatError('');
  }, [propertyId]);

  // Tease the launcher once, a few seconds in.
  useEffect(() => {
    if (loaded) return undefined;
    const t = setTimeout(() => setNudge(true), 3500);
    const h = setTimeout(() => setNudge(false), 12000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, [loaded, propertyId]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [chat, thinking, summary]);

  async function loadSummary(refresh = false) {
    setLoading(true); setError('');
    try {
      const r = await api.get(`/properties/${propertyId}/summary`,
        refresh ? { params: { refresh: 1 } } : undefined);
      setSummary(r.data.data.summary);
      setSource(r.data.data.source || (r.data.data.cached ? 'cached' : null));
    } catch (e) {
      setError(errMsg(e, 'Could not read this listing'));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    setNudge(false);
    if (next && !loaded) {
      loadSummary();
      api.get('/properties/meta/assistant')
        .then((r) => { setEnabled(r.data.data.enabled); setSuggestions(r.data.data.suggestions || []); })
        .catch(() => {});
    }
    if (next) setTimeout(() => inputRef.current?.focus(), 260);
  }

  async function send(text) {
    const q = (text ?? question).trim();
    if (!q || thinking) return;

    const history = chat.slice(-10);
    setChat((c) => [...c, { role: 'user', content: q }]);
    setQuestion('');
    setThinking(true);
    setChatError('');

    try {
      const { data } = await api.post(`/properties/${propertyId}/ask`, { question: q, history });
      setChat((c) => [...c, { role: 'assistant', content: data.data.answer }]);
    } catch (e) {
      setChatError(errMsg(e, 'The assistant could not answer that.'));
      setChat((c) => c.slice(0, -1));   // put the question back in the box
      setQuestion(q);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {/* ----------------------------------------------------- launcher */}
      <div className={`botdock ${open ? 'is-open' : ''}`}>
        {nudge && !open && (
          <button className="bot-nudge" onClick={toggle}>
            Ask me about this property
          </button>
        )}
        <button
          className={`bot-launch ${open ? 'on' : ''}`}
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? 'Close RNI Assistant' : 'Open RNI Assistant'}
        >
          {open ? <X /> : <Sparkle />}
          {!open && <span className="bot-launch-ping" />}
        </button>
      </div>

      {/* -------------------------------------------------------- panel */}
      {open && (
        <>
          <div className="bot-scrim" onClick={() => setOpen(false)} />
          <section className="bot-panel" role="dialog" aria-label="RNI Assistant">
            <header className="bot-head">
              <span className="bot-avatar"><Sparkle /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>RNI Assistant</h3>
                <p className="tiny">Knows only this listing</p>
              </div>
              {tool === 'ask' && (
                <button className="btn btn-xs btn-ghost" onClick={() => loadSummary(true)}
                        disabled={loading} title="Regenerate summary">
                  <Refresh />
                </button>
              )}
              <button className="btn btn-xs btn-ghost" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </button>
            </header>

            {/* tool switcher — each tab is one of the property-page bots */}
            <nav className="bot-tools">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.key} className={tool === t.key ? 'on' : ''}
                          onClick={() => setTool(t.key)}>
                    <Icon /> {t.label}
                  </button>
                );
              })}
            </nav>

            {tool === 'visit' && (
              <div className="bot-feed">
                <FlowRunner
                  flow="visit"
                  extra={{ property_id: propertyId }}
                  onSubmit={async (payload) => (await api.post('/bots/visit', payload)).data.data}
                />
              </div>
            )}

            {tool === 'emi' && (
              <div className="bot-feed"><EmiBot price={price} /></div>
            )}

            {tool === 'docs' && (
              <div className="bot-feed"><DocsBot purpose={purpose} /></div>
            )}

            {tool === 'contact' && (
              <div className="bot-feed"><ContactBot propertyId={propertyId} /></div>
            )}

            {tool === 'ask' && (
            <div className="bot-feed" ref={feedRef}>
              {loading && !summary ? (
                <div className="bot-loading">
                  <span className="spinner spinner-dark" />
                  <span className="small muted">Reading the listing…</span>
                </div>
              ) : error ? (
                <Notice type="err">{error}</Notice>
              ) : (
                <>
                  <div className="bot-msg assistant">
                    <span className="bot-msg-ic"><Sparkle /></span>
                    <div className="bot-bubble">
                      <BotText text={summary} />
                      {source === 'template' && (
                        <p className="tiny muted mt-1">
                          Built from the listing data. Add <code>ANTHROPIC_API_KEY</code> on the
                          server for AI-written summaries and follow-ups.
                        </p>
                      )}
                    </div>
                  </div>

                  {chat.map((m, i) => (
                    <div key={i} className={`bot-msg ${m.role}`}>
                      <span className="bot-msg-ic">{m.role === 'user' ? <User /> : <Sparkle />}</span>
                      <div className="bot-bubble"><BotText text={m.content} /></div>
                    </div>
                  ))}

                  {thinking && (
                    <div className="bot-msg assistant">
                      <span className="bot-msg-ic"><Sparkle /></span>
                      <div className="bot-bubble">
                        <span className="bot-dots"><i /><i /><i /></span>
                      </div>
                    </div>
                  )}

                  {chatError && <Notice type="err">{chatError}</Notice>}
                </>
              )}
            </div>
            )}

            {tool === 'ask' && enabled && !error && (
              <>
                {chat.length === 0 && suggestions.length > 0 && (
                  <div className="bot-chips">
                    {suggestions.slice(1).map((s) => (
                      <button key={s} className="bot-chip" onClick={() => send(s)} disabled={thinking}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <form className="bot-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <input
                    ref={inputRef}
                    className="input"
                    placeholder={title ? `Ask about this ${title.split(' ').slice(0, 3).join(' ')}…` : 'Ask about this property…'}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={500}
                    disabled={thinking}
                  />
                  <button className="btn btn-primary btn-icon" disabled={thinking || !question.trim()} aria-label="Send">
                    {thinking ? <span className="spinner" /> : <Send />}
                  </button>
                </form>
              </>
            )}

            {tool === 'ask' && (
              <p className="bot-foot">
                <Info />
                {enabled
                  ? 'Answers use only this listing’s own details, and can be wrong — verify with the advertiser before paying anything.'
                  : 'Follow-up questions need an Anthropic API key on the server.'}
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}

/**
 * The model is told to return plain sentences and "- " bullets, so we only need
 * paragraphs, bullets, and label lines — never raw HTML.
 */
function BotText({ text }) {
  if (!text) return null;
  const lines = String(text).split('\n').filter((l) => l.trim() !== '');

  const out = [];
  let bullets = [];
  const flush = () => {
    if (bullets.length) {
      out.push(<ul key={`u${out.length}`} className="bot-list">{bullets}</ul>);
      bullets = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (/^[-•*]\s+/.test(line)) {
      bullets.push(<li key={i}>{line.replace(/^[-•*]\s+/, '')}</li>);
      return;
    }
    flush();
    if (/^[A-Z][^.!?]{2,40}:$/.test(line)) {
      out.push(<p key={i} className="bot-label">{line.replace(/:$/, '')}</p>);
    } else {
      out.push(<p key={i}>{line}</p>);
    }
  });
  flush();

  return <div className="bot-text">{out}</div>;
}
