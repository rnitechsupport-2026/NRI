import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Notice } from '../ui.jsx';
import { money, timeAgo, LEAD_STATUS, titleCase } from '../../utils/format.js';
import { X, Phone, Whatsapp, Mail, Sparkle, Document, Check, Send, Info } from '../Icons.jsx';

const TABS = [
  { key: 'score', label: 'Score' },
  { key: 'matches', label: 'Matches' },
  { key: 'docs', label: 'Documents' },
  { key: 'message', label: 'Message' },
];

/**
 * Everything the agent-side bots produce for one lead, in a side drawer:
 * scoring reasons, who it was assigned to and why, matching properties, the
 * document checklist, and the email/WhatsApp composer.
 */
export default function LeadDrawer({ lead, onClose, onChanged }) {
  const [tab, setTab] = useState('score');
  const toast = useToast();

  const reasons = (() => {
    const r = lead.score_reasons;
    if (!r) return [];
    try { return typeof r === 'string' ? JSON.parse(r) : r; } catch { return []; }
  })();

  const meta = LEAD_STATUS[lead.status] || { label: lead.status, cls: 'badge-outline' };

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="lead-drawer">
        <header className="lead-drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className={`temp temp-${lead.temperature}`}>{lead.temperature}</span>
              <span className={`badge ${meta.cls}`}>{meta.label}</span>
            </div>
            <h3 className="mt-1">{lead.name}</h3>
            <p className="tiny muted">{lead.phone}{lead.email ? ` · ${lead.email}` : ''} · {timeAgo(lead.created_at)}</p>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close"><X /></button>
        </header>

        <div className="lead-drawer-actions">
          <a className="btn btn-sm btn-dark" href={`tel:${lead.phone}`}><Phone /> Call</a>
          <a className="btn btn-sm btn-outline" target="_blank" rel="noopener noreferrer"
             href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent(`Hi ${lead.name}, following up on your enquiry with RNI Realestate.`)}`}>
            <Whatsapp /> WhatsApp
          </a>
          {lead.email && (
            <a className="btn btn-sm btn-outline" href={`mailto:${lead.email}`}><Mail /> Email</a>
          )}
        </div>

        <nav className="tabs lead-drawer-tabs">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="lead-drawer-body">
          {tab === 'score' && <ScoreTab lead={lead} reasons={reasons} />}
          {tab === 'matches' && <MatchesTab leadId={lead.id} />}
          {tab === 'docs' && <DocsTab leadId={lead.id} />}
          {tab === 'message' && <MessageTab lead={lead} toast={toast} onSent={onChanged} />}
        </div>
      </aside>
    </>
  );
}

/* --------------------------------------------- lead scoring + assignment */

function ScoreTab({ lead, reasons }) {
  const stated = [
    ['Looking to', lead.pref_purpose ? titleCase(lead.pref_purpose) : null],
    ['Bedrooms', lead.pref_bhk ? `${lead.pref_bhk} BHK` : null],
    ['Area', [lead.pref_locality, lead.pref_city].filter(Boolean).join(', ') || null],
    ['Budget', lead.budget_max ? `up to ${money(lead.budget_max)}` : null],
    ['Timeline', lead.timeline ? lead.timeline.replace(/-/g, ' ') : null],
    ['Funding', lead.finance ? titleCase(lead.finance) : null],
  ].filter(([, v]) => v);

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <div className="row-between mb-1">
          <span className="small strong">Lead score</span>
          <span className="strong">{lead.score}/100</span>
        </div>
        <div className="score-bar">
          <span className={`score-fill temp-fill-${lead.temperature}`} style={{ width: `${lead.score}%` }} />
        </div>
        <p className="tiny muted mt-1">
          {lead.temperature === 'hot' && 'Call today — this one is ready to move.'}
          {lead.temperature === 'warm' && 'Worth a call this week.'}
          {lead.temperature === 'cold' && 'Low intent — nurture rather than chase.'}
        </p>
      </div>

      {reasons.length > 0 && (
        <div>
          <p className="small strong mb-1">How it was scored</p>
          <ul className="score-reasons">
            {reasons.map((r, i) => {
              const positive = !r.startsWith('-');
              return <li key={i} className={positive ? 'up' : 'down'}>{r}</li>;
            })}
          </ul>
        </div>
      )}

      {stated.length > 0 && (
        <div>
          <p className="small strong mb-1">What they told us</p>
          <div className="spec-grid">
            {stated.map(([k, v]) => (
              <div className="spec-row" key={k}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
        </div>
      )}

      {lead.assign_reason && (
        <div className="alert alert-info">
          <Info />
          <span className="tiny"><b>Routing:</b> {lead.assign_reason}</span>
        </div>
      )}

      {lead.message && (
        <div>
          <p className="small strong mb-1">Their message</p>
          <p className="small muted">{lead.message}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------- recommendation bot */

function MatchesTab({ leadId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    api.get(`/bots/recommend/lead/${leadId}`)
      .then((r) => live && setData(r.data.data))
      .catch(() => live && setData({ items: [] }));
    return () => { live = false; };
  }, [leadId]);

  if (!data) return <div className="bot-loading"><span className="spinner spinner-dark" /><span className="small muted">Finding matches…</span></div>;
  if (!data.items.length) {
    return <p className="small muted">No listings match this buyer&apos;s stated requirement yet.</p>;
  }

  return (
    <>
      <p className="tiny muted mb-2">
        Properties that fit what they asked for — send these instead of a generic list.
      </p>
      <div className="stack" style={{ gap: 10 }}>
        {data.items.map((p) => (
          <Link key={p.id} to={`/property/${p.slug || p.id}`} className="match-row">
            <img src={p.cover_image} alt="" />
            <span style={{ minWidth: 0 }}>
              <b>{p.title}</b>
              <em>{p.locality}, {p.city} · {money(p.price)}</em>
              <span className="match-why"><Sparkle /> {p.why}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------- document bot */

const DOC_STATES = ['pending', 'received', 'verified', 'waived'];

function DocsTab({ leadId }) {
  const [docs, setDocs] = useState(null);
  const [busy, setBusy] = useState('');

  const load = () => api.get(`/bots/documents/lead/${leadId}`)
    .then((r) => setDocs(r.data.data)).catch(() => setDocs([]));
  useEffect(() => { load(); }, [leadId]);

  async function cycle(doc) {
    const next = DOC_STATES[(DOC_STATES.indexOf(doc.status) + 1) % DOC_STATES.length];
    setBusy(doc.key);
    try {
      await api.put(`/bots/documents/lead/${leadId}`, {
        doc_key: doc.key, label: doc.label, status: next,
      });
      setDocs((d) => d.map((x) => (x.key === doc.key ? { ...x, status: next } : x)));
    } finally { setBusy(''); }
  }

  if (!docs) return <div className="bot-loading"><span className="spinner spinner-dark" /><span className="small muted">Loading…</span></div>;

  const done = docs.filter((d) => d.status !== 'pending').length;

  return (
    <>
      <p className="tiny muted mb-2">
        {done} of {docs.length} collected. Tap a row to advance its status.
      </p>
      <ul className="docs">
        {docs.map((d) => (
          <li key={d.key}>
            <button className={`docs-item ${d.status !== 'pending' ? 'on' : ''}`}
                    onClick={() => cycle(d)} disabled={busy === d.key}>
              <span className="docs-box">{d.status !== 'pending' && <Check />}</span>
              <span style={{ minWidth: 0 }}>
                <b>{d.label}</b>
                <em>{d.why}</em>
                <span className={`badge ${d.status === 'verified' ? 'badge-green' : d.status === 'pending' ? 'badge-outline' : 'badge-amber'} mt-1`}>
                  {titleCase(d.status)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ------------------------------------------- email / whatsapp channels */

const TEMPLATES = [
  { key: 'followup', label: 'Follow up', build: (l) => `Hi ${l.name}, checking in on your enquiry. Are you still looking? I can arrange a site visit or send similar options.` },
  { key: 'visit', label: 'Offer a visit', build: (l) => `Hi ${l.name}, would you like to visit the property this week? I have slots free — let me know a day that suits you.` },
  { key: 'options', label: 'Send options', build: (l) => `Hi ${l.name}, I've shortlisted a few properties that match your requirement. Shall I send the details on WhatsApp?` },
];

function MessageTab({ lead, toast, onSent }) {
  const [channel, setChannel] = useState('whatsapp');
  const [subject, setSubject] = useState('About your property enquiry');
  const [body, setBody] = useState(TEMPLATES[0].build(lead));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const canEmail = !!lead.email;

  async function send() {
    setBusy(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/bots/message', {
        lead_id: lead.id, channel, subject: channel === 'email' ? subject : undefined, body,
      });
      setResult(data.data);
      onSent?.();
      if (data.data.status === 'sent') toast.success('Message sent');
    } catch (e) {
      setError(errMsg(e, 'Could not queue the message'));
    } finally { setBusy(false); }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="flow-toggle">
        <button className={channel === 'whatsapp' ? 'on' : ''} onClick={() => setChannel('whatsapp')}>WhatsApp</button>
        <button className={channel === 'email' ? 'on' : ''} onClick={() => canEmail && setChannel('email')}
                disabled={!canEmail} title={canEmail ? '' : 'This lead has no email address'}>
          Email
        </button>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {TEMPLATES.map((t) => (
          <button key={t.key} className="bot-chip" onClick={() => setBody(t.build(lead))}>{t.label}</button>
        ))}
      </div>

      {channel === 'email' && (
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
      )}
      <textarea className="textarea" rows={5} value={body} onChange={(e) => setBody(e.target.value)} />

      {error && <Notice type="err">{error}</Notice>}

      <button className="btn btn-primary btn-block" onClick={send} disabled={busy || body.trim().length < 2}>
        {busy ? <><span className="spinner" /> Sending…</> : <><Send /> Send via {channel === 'email' ? 'email' : 'WhatsApp'}</>}
      </button>

      {result && (() => {
        // This platform doesn't have WhatsApp Business API credentials
        // configured (that's a paid, approval-gated Meta integration) — the
        // click-to-chat link is the normal, expected way messages go out,
        // not a failure. Only a genuine API error should read as one.
        const isWhatsappFallback = channel === 'whatsapp' && result.status === 'skipped' && !!result.whatsapp_link;
        return (
          <div className={`alert ${result.status === 'sent' ? 'alert-ok' : 'alert-info'}`}>
            <Info />
            <span className="tiny">
              {result.status === 'sent' && 'Delivered.'}
              {isWhatsappFallback && 'Message ready — send it from WhatsApp below.'}
              {result.status === 'skipped' && !isWhatsappFallback && <>Queued but not delivered — {result.note}</>}
              {result.status === 'failed' && <>Delivery failed — {result.note}</>}
              {result.whatsapp_link && !isWhatsappFallback && (
                <>
                  {' '}
                  <a href={result.whatsapp_link} target="_blank" rel="noopener noreferrer" className="strong">
                    Open in WhatsApp instead →
                  </a>
                </>
              )}
            </span>
          </div>
        );
      })()}
      {result && channel === 'whatsapp' && result.status === 'skipped' && result.whatsapp_link && (
        <a href={result.whatsapp_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">
          <Whatsapp /> Open WhatsApp to send
        </a>
      )}
    </div>
  );
}
