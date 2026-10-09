import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Avatar, Empty, Notice, PageLoader } from '../../../components/ui.jsx';
import { money, timeAgo, titleCase, ROLE_LABEL, LEAD_STATUS } from '../../../utils/format.js';
import { ChevronLeft, Shield, Home, Inbox, Document, Eye, ArrowRight, Phone, Mail } from '../../../components/Icons.jsx';
import { APPROVAL, propertyReview } from './verificationLabels.js';
import { useStaffBase } from '../../../staff/staffBase.js';

const APPLICATION_PATH = { agent: 'agents', builder: 'builders', service: 'service-providers' };
const LEAD_STAGES = ['new', 'contacted', 'visit-scheduled', 'nurturing', 'negotiation', 'booked', 'closed', 'lost'];

const ACTION_LABEL = {
  approval_status: 'Account verification', user_status: 'Account status', user_verify: 'Verified badge',
  property_review: 'Property verification', agent_approve: 'Agent approved', builder_approve: 'Builder approved',
  service_provider_approve: 'Service provider approved', kyc_review: 'KYC review', rera_review: 'RERA review',
  business_review: 'Business review', company_review: 'Company review', project_verification: 'Project verification',
  lead_status: 'Lead status', lead_assign: 'Lead assignment', lead_note: 'Lead note', lead_book: 'Lead booked',
  document_reveal: 'Document viewed',
};
const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

/**
 * /dashboard/admin/users/:id — one assigned user, everything in one place:
 * profile, account verification (and who decided it), their properties with
 * the review actions, their leads with status, and the approval history.
 * The API refuses the page outright for a user who is not assigned.
 */
export default function AdminUserDetail() {
  const base = useStaffBase();
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api.get(`/admin/users/${id}`)
      .then((r) => { setData(r.data.data); setError(''); })
      .catch((e) => setError(errMsg(e, 'Could not load this user')));
  }, [id]);
  useEffect(() => { setData(null); load(); }, [load]);

  const act = async (key, fn, done) => {
    setBusy(key);
    try { await fn(); toast.success(done); load(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };

  // Rejections always carry the reason the user will see.
  const askReason = (what) => {
    const reason = window.prompt(`Why is this ${what} being rejected? The user sees this reason.`);
    return reason && reason.trim() ? reason.trim() : null;
  };

  const decideAccount = (status) => {
    const reason = status === 'rejected' ? askReason('account') : undefined;
    if (status === 'rejected' && !reason) return;
    act('account', () => api.put(`/admin/users/${id}/approval`, { approval_status: status, reason }),
      status === 'approved' ? 'Account approved' : 'Account rejected');
  };

  const reviewProperty = (p, decision) => {
    const reason = decision === 'rejected' ? askReason('property') : undefined;
    if (decision === 'rejected' && !reason) return;
    act(`p-${p.id}`, () => api.put(`/admin/properties/${p.id}/review`, { decision, reason }),
      decision === 'approved' ? 'Property approved — it is live' : 'Property rejected');
  };

  const setLeadStatus = (lead, status) =>
    act(`l-${lead.id}`, () => api.patch(`/admin/leads/${lead.id}`, { status }), 'Lead status updated');

  if (error) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <Notice type="err">{error}</Notice>
        <Link to={`${base}/users`} className="btn btn-dark" style={{ alignSelf: 'flex-start' }}><ChevronLeft /> Back to users</Link>
      </div>
    );
  }
  if (!data) return <PageLoader label="Loading user…" />;

  const { user: u, properties, leads, leadTotal, history } = data;
  const approval = APPROVAL[u.approvalStatus] || APPROVAL.pending;
  const viaApplication = APPLICATION_PATH[u.role];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link to={`${base}/users`} className="small muted row" style={{ gap: 4 }}><ChevronLeft style={{ width: 15, height: 15 }} /> Assigned users</Link>

      {/* ------------------------------------------------ profile */}
      <div className="card card-p">
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar src={u.avatarUrl} name={u.name} size="avatar-lg" style={{ width: 64, height: 64 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>{u.name}</h2>
              <span className="badge badge-gold">{ROLE_LABEL[u.role] || u.role}</span>
              <span className={`badge ${approval.cls}`}>{approval.label}</span>
              {u.status !== 'active' && <span className="badge badge-red">Suspended</span>}
            </div>
            {u.companyName && <div className="small mt-1">{u.companyName}</div>}
            <div className="row small muted mt-1" style={{ gap: 14, flexWrap: 'wrap' }}>
              <span className="row" style={{ gap: 5 }}><Mail style={{ width: 14, height: 14 }} /> {u.email}</span>
              <span className="row" style={{ gap: 5 }}><Phone style={{ width: 14, height: 14 }} /> {u.phone}</span>
              {u.city && <span>{[u.locality, u.city].filter(Boolean).join(', ')}</span>}
              <span>Joined {timeAgo(u.createdAt)}</span>
            </div>
            {u.about && <p className="small mt-2" style={{ whiteSpace: 'pre-line' }}>{u.about}</p>}
          </div>
        </div>
      </div>

      {/* --------------------------------------- account verification */}
      <div className="card card-p stack" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <Shield style={{ width: 19, height: 19, color: 'var(--gold-600)' }} />
          <h3 style={{ margin: 0 }}>Account verification</h3>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <span className={`badge ${approval.cls}`}>{approval.label}</span>
          {u.approvedByName && (
            <span className="small">
              {u.approvalStatus === 'rejected' ? 'Rejected' : 'Approved'} by <b>{u.approvedByName}</b>
              {u.approvedByRole ? ` (${ROLE_LABEL[u.approvedByRole]})` : ''} on {dateTime(u.approvedAt)}
            </span>
          )}
          {u.approvalStatus === 'pending' && <span className="small muted">This user cannot post properties until the account is approved.</span>}
        </div>
        {u.approvalNote && <Notice type={u.approvalStatus === 'rejected' ? 'err' : 'info'}>{u.approvalNote}</Notice>}

        {viaApplication ? (
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="small muted">{ROLE_LABEL[u.role]}s are approved through their document review.</span>
            <Link to={`${base}/${viaApplication}/${u.id}`} className="btn btn-sm btn-primary">Review application <ArrowRight /></Link>
          </div>
        ) : (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {u.approvalStatus !== 'approved' && (
              <button className="btn btn-sm btn-primary" disabled={busy === 'account'} onClick={() => decideAccount('approved')}>Approve account</button>
            )}
            {u.approvalStatus !== 'rejected' && (
              <button className="btn btn-sm btn-danger" disabled={busy === 'account'} onClick={() => decideAccount('rejected')}>Reject account</button>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------ properties */}
      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <Home style={{ width: 19, height: 19, color: 'var(--gold-600)' }} />
          <h3 style={{ margin: 0 }}>Properties <span className="muted small">({properties.length})</span></h3>
        </div>
        {properties.length === 0 ? <Empty icon={Home} title="No properties posted yet" /> : (
          <div className="card table-wrap">
            <table className="tbl">
              <thead><tr><th>Property</th><th>Price</th><th>Verification</th><th>Posted</th><th>Actions</th></tr></thead>
              <tbody>
                {properties.map((p) => {
                  const review = propertyReview(p.status);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="tcell">
                          {p.coverImage && <img src={p.coverImage} alt="" />}
                          <div style={{ minWidth: 0 }}>
                            <div className="nm clamp-2">{p.title}</div>
                            <div className="tiny muted">{[p.locality, p.city].filter(Boolean).join(', ')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="strong nowrap">{money(p.price)}</td>
                      <td>
                        <span className={`badge ${review.cls}`}>{review.label}</span>
                        {review.key === 'approved' && p.status !== 'active' && <div className="tiny muted mt-1">{titleCase(p.status)}</div>}
                        {p.reviewedByName && <div className="tiny muted mt-1">by {p.reviewedByName} · {timeAgo(p.reviewedAt)}</div>}
                        {p.reviewNote && <div className="tiny mt-1" style={{ color: '#b42318' }}>{p.reviewNote}</div>}
                      </td>
                      <td className="muted small nowrap">{timeAgo(p.createdAt)}</td>
                      <td>
                        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                          <Link to={`/property/${p.slug || p.id}`} className="btn btn-xs btn-outline" title="Open the listing"><Eye /></Link>
                          {p.status !== 'active' && review.key !== 'approved' && (
                            <button className="btn btn-xs btn-primary" disabled={busy === `p-${p.id}`} onClick={() => reviewProperty(p, 'approved')}>Approve</button>
                          )}
                          {p.status !== 'rejected' && (
                            <button className="btn btn-xs btn-danger" disabled={busy === `p-${p.id}`} onClick={() => reviewProperty(p, 'rejected')}>Reject</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- leads */}
      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <Inbox style={{ width: 19, height: 19, color: 'var(--gold-600)' }} />
          <h3 style={{ margin: 0 }}>Leads <span className="muted small">({leadTotal})</span></h3>
        </div>
        {leads.length === 0 ? <Empty icon={Inbox} title="No leads yet" /> : (
          <div className="card table-wrap">
            <table className="tbl">
              <thead><tr><th>Lead</th><th>About</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="nm">{l.name}</div>
                      <div className="tiny muted">{[l.phone, l.email].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="small">{l.about || '—'}</td>
                    <td>
                      <select className="select btn-xs" style={{ height: 32, fontSize: '.78rem', width: 150 }} value={l.status}
                              disabled={busy === `l-${l.id}`} onChange={(e) => setLeadStatus(l, e.target.value)} aria-label={`Status of ${l.name}'s lead`}>
                        {LEAD_STAGES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s]?.label || titleCase(s)}</option>)}
                      </select>
                    </td>
                    <td className="muted small nowrap">{timeAgo(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {leadTotal > leads.length && <p className="tiny muted">Showing the latest {leads.length} of {leadTotal}. The full list is under All Enquiries.</p>}
      </div>

      {/* -------------------------------------------- approval history */}
      <div className="stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <Document style={{ width: 19, height: 19, color: 'var(--gold-600)' }} />
          <h3 style={{ margin: 0 }}>Approval history</h3>
        </div>
        {history.length === 0 ? <p className="small muted">No decisions recorded for this user yet.</p> : (
          <div className="card table-wrap">
            <table className="tbl">
              <thead><tr><th>When</th><th>Action</th><th>Change</th><th>By</th><th>Note</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="small nowrap">{dateTime(h.createdAt)}</td>
                    <td className="small strong">{ACTION_LABEL[h.action] || titleCase(h.action.replace(/_/g, ' '))}</td>
                    <td className="small">
                      {h.previousStatus && <span className="muted">{titleCase(h.previousStatus)} → </span>}
                      {h.newStatus ? <b>{titleCase(h.newStatus)}</b> : '—'}
                    </td>
                    <td className="small">{h.adminName || '—'}{h.adminRole ? <span className="tiny muted"> · {ROLE_LABEL[h.adminRole]}</span> : null}</td>
                    <td className="small muted">{h.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
