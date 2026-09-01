import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, PageLoader } from '../../components/ui.jsx';
import LeadDrawer from '../../components/bots/LeadDrawer.jsx';
import { timeAgo, shortDate, LEAD_STATUS, titleCase, money } from '../../utils/format.js';
import { Inbox, Phone, Whatsapp, Mail, Trash, Sparkle, ArrowRight } from '../../components/Icons.jsx';

const STATUSES = ['new', 'contacted', 'visit-scheduled', 'closed', 'lost'];
const TEMPS = ['hot', 'warm', 'cold'];

export default function Leads() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [status, setStatus] = useState('all');
  const [temp, setTemp] = useState('all');
  const [open, setOpen] = useState(null);          // lead in the drawer
  const [showQueue, setShowQueue] = useState(true);

  const load = () => Promise.all([
    api.get('/leads').then((r) => setRows(r.data.data)).catch(() => setRows([])),
    api.get('/bots/followups').then((r) => setFollowups(r.data.data)).catch(() => setFollowups([])),
  ]);

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0 };
    (rows || []).forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
      c[r.temperature] = (c[r.temperature] || 0) + 1;
    });
    return c;
  }, [rows]);

  const shown = (rows || []).filter(
    (r) => (status === 'all' || r.status === status) && (temp === 'all' || r.temperature === temp)
  );

  async function setLeadStatus(lead, next) {
    try {
      await api.patch(`/leads/${lead.id}`, { status: next });
      setRows((rs) => rs.map((r) => (r.id === lead.id ? { ...r, status: next } : r)));
      toast.success(`Marked as ${LEAD_STATUS[next].label}`);
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function remove(lead) {
    try {
      await api.delete(`/leads/${lead.id}`);
      setRows((rs) => rs.filter((r) => r.id !== lead.id));
      toast.success('Enquiry deleted');
    } catch (e) { toast.error(errMsg(e)); }
  }

  if (rows === null) return <PageLoader label="Loading enquiries…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2>Enquiries</h2>
          <p className="muted small mt-1">
            {counts.hot || 0} hot · {counts.warm || 0} warm · {counts.all} total.
            Scored automatically the moment they arrive.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------- follow-up bot */}
      {followups.length > 0 && showQueue && (
        <section className="card followup">
          <div className="followup-head">
            <span className="bot-avatar" style={{ width: 34, height: 34 }}><Sparkle /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3>{followups.length} lead{followups.length === 1 ? '' : 's'} need a follow-up</h3>
              <p className="tiny muted">No contact for 3+ days. Messages are drafted for you.</p>
            </div>
            <button className="btn btn-xs btn-ghost" onClick={() => setShowQueue(false)}>Hide</button>
          </div>
          <ul className="followup-list">
            {followups.slice(0, 5).map((f) => (
              <li key={f.lead_id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 7 }}>
                    <span className={`temp temp-${f.temperature}`}>{f.temperature}</span>
                    <b className="small">{f.name}</b>
                  </div>
                  <p className="tiny muted clamp-2 mt-1">{f.draft}</p>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <a className="btn btn-xs btn-outline" href={f.whatsapp_link} target="_blank" rel="noopener noreferrer">
                    <Whatsapp /> Send
                  </a>
                  <button className="btn btn-xs btn-ghost"
                          onClick={() => setOpen(rows.find((r) => r.id === f.lead_id))}>
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 ? (
        <Empty icon={Inbox} title="No enquiries yet"
               action={<Link to="/dashboard/property/new" className="btn btn-primary">Post a property</Link>}>
          When someone contacts you about a listing it lands here — already scored and routed.
        </Empty>
      ) : (
        <>
          <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
            <div className="pills">
              <button className={`pill ${temp === 'all' ? 'on' : ''}`} onClick={() => setTemp('all')}>
                All temps
              </button>
              {TEMPS.map((t) => (
                <button key={t} className={`pill ${temp === t ? 'on' : ''}`} onClick={() => setTemp(t)}>
                  {titleCase(t)} <span className="tiny muted">({counts[t] || 0})</span>
                </button>
              ))}
            </div>
            <div className="pills">
              <button className={`pill ${status === 'all' ? 'on' : ''}`} onClick={() => setStatus('all')}>
                All <span className="tiny muted">({counts.all})</span>
              </button>
              {STATUSES.map((s) => (
                <button key={s} className={`pill ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
                  {LEAD_STATUS[s].label} <span className="tiny muted">({counts[s] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lead</th><th>Score</th><th>Enquiry about</th>
                  <th>Requirement</th><th>Status</th><th>Received</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id} className={l.temperature === 'hot' ? 'row-hot' : ''}>
                    <td>
                      <button className="lead-name" onClick={() => setOpen(l)}>{l.name}</button>
                      <a href={`tel:${l.phone}`} className="tiny gold strong" style={{ display: 'block' }}>{l.phone}</a>
                    </td>
                    <td>
                      <span className={`temp temp-${l.temperature}`}>{l.temperature}</span>
                      <span className="tiny muted" style={{ display: 'block', marginTop: 3 }}>{l.score}/100</span>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      {l.property_id ? (
                        <Link to={`/property/${l.property_slug || l.property_id}`} className="small strong clamp-2">
                          {l.property_title}
                        </Link>
                      ) : (
                        <span className="small muted">{l.project_name || l.service_title || 'General enquiry'}</span>
                      )}
                    </td>
                    <td className="tiny muted" style={{ maxWidth: 180 }}>
                      {[l.pref_bhk && `${l.pref_bhk} BHK`, l.pref_locality || l.pref_city,
                        l.budget_max && `≤ ${money(l.budget_max)}`].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td>
                      <select className="select" style={{ height: 32, fontSize: '.78rem', width: 138 }}
                              value={l.status} onChange={(e) => setLeadStatus(l, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
                      </select>
                    </td>
                    <td className="muted small nowrap" title={shortDate(l.created_at)}>{timeAgo(l.created_at)}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn btn-xs btn-primary" onClick={() => setOpen(l)}>
                          Open <ArrowRight />
                        </button>
                        <a className="btn btn-xs btn-outline" href={`tel:${l.phone}`} title="Call"><Phone /></a>
                        {l.email && <a className="btn btn-xs btn-outline" href={`mailto:${l.email}`} title="Email"><Mail /></a>}
                        <button className="btn btn-xs btn-danger" onClick={() => remove(l)} title="Delete"><Trash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {shown.length === 0 && <div className="card-p center muted small">No enquiries match these filters.</div>}
          </div>
        </>
      )}

      {open && <LeadDrawer lead={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
