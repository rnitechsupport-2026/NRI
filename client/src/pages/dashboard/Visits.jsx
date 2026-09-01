import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader, Stars } from '../../components/ui.jsx';
import FlowRunner from '../../components/bots/FlowRunner.jsx';
import { shortDate, titleCase } from '../../utils/format.js';
import { Calendar, Phone, Whatsapp, Check, X, Star } from '../../components/Icons.jsx';

const STATUS_CLS = {
  requested: 'badge-amber', confirmed: 'badge-blue', completed: 'badge-green',
  cancelled: 'badge-outline', 'no-show': 'badge-red',
};
const SLOT_LABEL = { morning: 'Morning 9–12', afternoon: 'Afternoon 12–4', evening: 'Evening 4–7' };

/**
 * Site-visit calendar. Hosts confirm/complete visits; visitors see their own
 * bookings and leave feedback once a visit is marked completed.
 */
export default function Visits() {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [feedbackFor, setFeedbackFor] = useState(null);

  const load = () => api.get('/bots/visits').then((r) => setRows(r.data.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    const list = rows || [];
    return {
      upcoming: list.filter((v) => v.visit_on >= today && !['cancelled', 'completed'].includes(v.status)).length,
      requested: list.filter((v) => v.status === 'requested').length,
      completed: list.filter((v) => v.status === 'completed').length,
      all: list.length,
    };
  }, [rows, today]);

  const shown = (rows || []).filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return v.visit_on >= today && !['cancelled', 'completed'].includes(v.status);
    if (filter === 'requested') return v.status === 'requested';
    if (filter === 'completed') return v.status === 'completed';
    return true;
  });

  async function setStatus(visit, status) {
    try {
      await api.patch(`/bots/visits/${visit.id}`, { status });
      setRows((rs) => rs.map((v) => (v.id === visit.id ? { ...v, status } : v)));
      toast.success(`Visit ${status}`);
    } catch (e) { toast.error(errMsg(e)); }
  }

  if (rows === null) return <PageLoader label="Loading visits…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Site visits</h2>
        <p className="muted small mt-1">
          {counts.requested} awaiting your confirmation · {counts.upcoming} upcoming
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Calendar} title="No site visits yet">
          When someone books a visit through the assistant on a property page, it appears here.
        </Empty>
      ) : (
        <>
          <div className="pills">
            {[['upcoming', 'Upcoming'], ['requested', 'Awaiting confirmation'],
              ['completed', 'Completed'], ['all', 'All']].map(([k, label]) => (
              <button key={k} className={`pill ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
                {label} <span className="tiny muted">({counts[k]})</span>
              </button>
            ))}
          </div>

          <div className="stack" style={{ gap: 12 }}>
            {shown.map((v) => {
              const isHost = v.host_id === user.id;
              return (
                <article key={v.id} className="card visit">
                  <div className="visit-date">
                    <b>{new Date(v.visit_on).toLocaleDateString('en-IN', { day: '2-digit' })}</b>
                    <span>{new Date(v.visit_on).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                      <span className={`badge ${STATUS_CLS[v.status]}`}>{titleCase(v.status)}</span>
                      <span className="tiny muted">{SLOT_LABEL[v.slot]}</span>
                      {v.rating && (
                        <span className="row" style={{ gap: 4 }}>
                          <Stars value={v.rating} />
                          <span className="tiny muted">{titleCase(v.interested)}</span>
                        </span>
                      )}
                    </div>
                    <Link to={`/property/${v.property_slug || v.property_id}`} className="visit-title">
                      {v.property_title}
                    </Link>
                    <p className="tiny muted">
                      {isHost ? `${v.name} · ${v.phone}` : 'Your booking'}
                      {v.notes ? ` — “${v.notes}”` : ''}
                    </p>
                  </div>

                  <div className="visit-actions">
                    {isHost && v.status === 'requested' && (
                      <>
                        <button className="btn btn-xs btn-primary" onClick={() => setStatus(v, 'confirmed')}>
                          <Check /> Confirm
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => setStatus(v, 'cancelled')}>
                          <X /> Decline
                        </button>
                      </>
                    )}
                    {isHost && v.status === 'confirmed' && (
                      <>
                        <button className="btn btn-xs btn-outline" onClick={() => setStatus(v, 'completed')}>
                          Mark done
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => setStatus(v, 'no-show')}>
                          No show
                        </button>
                      </>
                    )}
                    {isHost && (
                      <>
                        <a className="btn btn-xs btn-outline" href={`tel:${v.phone}`}><Phone /></a>
                        <a className="btn btn-xs btn-outline" target="_blank" rel="noopener noreferrer"
                           href={`https://wa.me/91${v.phone}?text=${encodeURIComponent(`Hi ${v.name}, about your site visit for "${v.property_title}" on ${v.visit_on}.`)}`}>
                          <Whatsapp />
                        </a>
                      </>
                    )}
                    {!isHost && v.status === 'completed' && !v.rating && (
                      <button className="btn btn-xs btn-primary" onClick={() => setFeedbackFor(v)}>
                        <Star /> Leave feedback
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {shown.length === 0 && <p className="small muted center">No visits in this view.</p>}
          </div>
        </>
      )}

      {feedbackFor && (
        <Modal title="How was the visit?" onClose={() => setFeedbackFor(null)}>
          <FlowRunner
            flow="feedback"
            onSubmit={async (payload) =>
              (await api.post(`/bots/visits/${feedbackFor.id}/feedback`, payload)).data.data}
            onDone={() => { load(); setTimeout(() => setFeedbackFor(null), 1800); }}
          />
        </Modal>
      )}
    </div>
  );
}
