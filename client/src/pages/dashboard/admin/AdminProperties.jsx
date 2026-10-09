import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../../components/ui.jsx';
import { money, timeAgo, titleCase, PORTAL_LABEL } from '../../../utils/format.js';
import { Home, Eye, Trash, Shield, Star } from '../../../components/Icons.jsx';

import { propertyReview } from './verificationLabels.js';
import { useStaffBase } from '../../../staff/staffBase.js';

// After approval a listing can be moved between these; "Under Verification"
// and "Rejected" are only ever set by the review itself.
const LIVE_STATUSES = ['active', 'inactive', 'sold', 'rented'];
const FILTERS = [['pending', 'Under Verification'], ['active', 'Approved · Live'], ['rejected', 'Rejected'], ['', 'All']];

/** `queue`: open as the verification queue — only listings Under Verification. */
export default function AdminProperties({ queue = false }) {
  const base = useStaffBase();
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const portals = (isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals)
    .filter((p) => p === 'owner' || p === 'agent' || p === 'builder');

  const [params] = useSearchParams();
  const [portal, setPortal] = useState(portals[0] || '');
  const [status, setStatusFilter] = useState(queue ? 'pending' : (params.get('status') || ''));
  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!portal) { setRows([]); return; }
    api.get('/admin/properties', { params: { portal, status: status || undefined, limit: 60 } }).then((r) => setRows(r.data.data)).catch(() => setRows([]));
  };
  useEffect(() => { setRows(null); load(); }, [portal, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function review(row, decision) {
    // a rejection always carries the reason the lister will see
    let reason;
    if (decision === 'rejected') {
      reason = window.prompt(`Why is "${row.title}" being rejected? The lister sees this reason.`);
      if (!reason || !reason.trim()) return;
    }
    try {
      await api.put(`/admin/properties/${row.id}/review`, { decision, reason: reason?.trim() });
      toast.success(decision === 'approved' ? 'Property approved — it is live now' : 'Property rejected');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function setStatus(row, status) {
    try {
      await api.put(`/admin/properties/${row.id}/status`, { status });
      toast.success(`Marked as ${titleCase(status)}`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function toggleVerify(row) {
    try {
      await api.put(`/admin/properties/${row.id}/verify`, { is_verified: !row.isVerified });
      toast.success(!row.isVerified ? 'Listing verified' : 'Verification removed');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function toggleFeature(row) {
    try {
      await api.put(`/admin/properties/${row.id}/feature`, { is_featured: !row.isFeatured });
      toast.success(!row.isFeatured ? 'Featured' : 'Removed from featured');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/properties/${confirm.id}`);
      toast.success('Listing deleted');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (!portals.length) {
    return <Empty icon={Shield} title="No users assigned yet">You have no Owner, Agent or Builder users assigned.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>{queue ? 'Properties under verification' : isAdmin ? 'Manage properties' : 'Property verification'}</h2>
        <p className="muted small mt-1">A new listing stays Under Verification and off the public site until it is approved here.</p>
      </div>

      {!queue && <div className="pills">
        {FILTERS.map(([key, label]) => (
          <button key={key || 'all'} className={`pill ${status === key ? 'on' : ''}`} onClick={() => setStatusFilter(key)}>{label}</button>
        ))}
      </div>}

      {portals.length > 1 && (
        <div className="pills">
          {portals.map((p) => (
            <button key={p} className={`pill ${portal === p ? 'on' : ''}`} onClick={() => setPortal(p)}>
              {PORTAL_LABEL[p]}
            </button>
          ))}
        </div>
      )}

      {rows === null ? <PageLoader label="Loading listings…" /> : rows.length === 0 ? (
        <Empty icon={Home} title={status === 'pending' ? 'Nothing waiting for verification' : 'No listings match this filter'} />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Property</th><th>Owner</th><th>Price</th><th>Status</th><th>Flags</th><th>Posted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="tcell">
                      <img src={p.coverImage} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm clamp-2">{p.title}</div>
                        <div className="tiny muted">{p.locality}, {p.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">
                    <Link to={`${base}/users/${p.ownerId}`} style={{ textDecoration: 'underline' }}>{p.ownerName}</Link>
                    <div className="tiny muted">{titleCase(p.ownerRole)}</div>
                  </td>
                  <td className="strong nowrap">{money(p.price)}</td>
                  <td>
                    <span className={`badge ${propertyReview(p.status).cls}`}>{propertyReview(p.status).label}</span>
                    {LIVE_STATUSES.includes(p.status) && (
                      <select className="select btn-xs mt-1" style={{ height: 30, fontSize: '.76rem', width: 118, display: 'block' }}
                              value={p.status} onChange={(e) => setStatus(p, e.target.value)} aria-label="Listing status">
                        {LIVE_STATUSES.map((s) => <option key={s} value={s}>{s === 'inactive' ? 'Paused' : titleCase(s)}</option>)}
                      </select>
                    )}
                    {p.reviewedByName && <div className="tiny muted mt-1">by {p.reviewedByName} · {timeAgo(p.reviewedAt)}</div>}
                    {p.status === 'rejected' && p.reviewNote && <div className="tiny mt-1" style={{ color: '#b42318' }}>{p.reviewNote}</div>}
                  </td>
                  <td>
                    <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                      {p.isVerified && <span className="badge badge-green"><Shield style={{ width: 11, height: 11 }} /></span>}
                      {p.isFeatured && <span className="badge badge-gold"><Star style={{ width: 11, height: 11 }} /></span>}
                    </div>
                  </td>
                  <td className="muted small nowrap">{timeAgo(p.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/property/${p.slug || p.id}`} className="btn btn-xs btn-outline" title="View"><Eye /></Link>
                      {(p.status === 'pending' || p.status === 'rejected') && (
                        <button className="btn btn-xs btn-primary" onClick={() => review(p, 'approved')}>Approve</button>
                      )}
                      {p.status !== 'rejected' && (
                        <button className="btn btn-xs btn-danger" onClick={() => review(p, 'rejected')}>Reject</button>
                      )}
                      <button className="btn btn-xs btn-outline" onClick={() => toggleVerify(p)}>
                        {p.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button className="btn btn-xs btn-outline" onClick={() => toggleFeature(p)}>
                        {p.isFeatured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button className="btn btn-xs btn-danger" title="Delete" onClick={() => setConfirm(p)}><Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <Modal title="Delete this listing?" onClose={() => setConfirm(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={remove} disabled={busy}>
                     {busy ? <><span className="spinner spinner-dark" /> Deleting…</> : 'Delete permanently'}
                   </button>
                 </>
               }>
          <p><b>{confirm.title}</b> will be removed. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
