import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, PORTAL_LABEL } from '../../../utils/format.js';
import { Users, Shield, Search, ArrowRight } from '../../../components/Icons.jsx';

import { APPROVAL } from './verificationLabels.js';
import { useStaffBase } from '../../../staff/staffBase.js';

const APPROVAL_CLS = Object.fromEntries(Object.values(APPROVAL).map((a) => [a.key, a.cls]));
const APPROVAL_LABEL = Object.fromEntries(Object.values(APPROVAL).map((a) => [a.key, a.label]));

/** `queue`: open as the verification queue — Under Verification first. */
export default function AdminUsers({ queue = false }) {
  const base = useStaffBase();
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const portals = isAdmin ? ['owner', 'buyer', 'agent', 'builder', 'service'] : managedPortals;

  const [params] = useSearchParams();
  const [portal, setPortal] = useState(portals[0] || '');
  const [approval, setApproval] = useState(params.get('approval') || (queue ? 'pending' : 'all'));
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);

  const load = () => {
    if (!portal) { setRows([]); return; }
    api.get('/admin/users', { params: { portal, q: q || undefined, approval: approval === 'all' ? undefined : approval } })
      .then((r) => setRows(r.data.data))
      .catch(() => setRows([]));
  };

  useEffect(() => { setRows(null); load(); }, [portal, approval]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleStatus(row) {
    const next = row.status === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/admin/users/${row.id}/status`, { status: next });
      toast.success(next === 'active' ? 'User reactivated' : 'User suspended');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function toggleVerified(row) {
    try {
      await api.put(`/admin/users/${row.id}/verify`, { is_verified: !row.isVerified });
      toast.success(!row.isVerified ? 'User verified' : 'Verification removed');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function setApprovalStatus(row, status) {
    // a rejection always carries the reason the user will see
    let reason;
    if (status === 'rejected') {
      reason = window.prompt(`Why is ${row.name}'s account being rejected? They see this reason.`);
      if (!reason || !reason.trim()) return;
    }
    try {
      await api.put(`/admin/users/${row.id}/approval`, { approval_status: status, reason: reason?.trim() });
      toast.success(status === 'approved' ? `${row.name} approved` : status === 'rejected' ? `${row.name} rejected` : 'Moved back to pending');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  if (!portals.length) {
    return <Empty icon={Shield} title="No users assigned yet">Ask an admin to assign users to your account.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2>{queue ? 'User verification' : isAdmin ? 'Manage users' : 'Assigned users'}</h2>
          <p className="muted small mt-1">
            {queue ? 'New accounts stay Under Verification — and cannot post properties — until you approve them.'
              : isAdmin ? 'Approve new registrations, verify or suspend accounts.' : 'Only the users assigned to you. Open one to see their profile, properties, leads and approval history.'}
          </p>
        </div>
        <div className="input-icon" style={{ maxWidth: 260 }}>
          <Search />
          <input className="input" placeholder="Search name, email, phone"
                 value={q} onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && load()} />
        </div>
      </div>

      {portals.length > 1 && (
        <div className="pills">
          {portals.map((p) => (
            <button key={p} className={`pill ${portal === p ? 'on' : ''}`} onClick={() => setPortal(p)}>
              {PORTAL_LABEL[p]}
            </button>
          ))}
        </div>
      )}

      <div className="pills">
        {['all', 'pending', 'approved', 'rejected'].map((a) => (
          <button key={a} className={`pill ${approval === a ? 'on' : ''}`} onClick={() => setApproval(a)}>
            {a === 'all' ? 'All' : APPROVAL_LABEL[a]}
          </button>
        ))}
      </div>

      {rows === null ? <PageLoader label="Loading users…" /> : rows.length === 0 ? (
        <Empty icon={Users} title={approval === 'pending' ? 'No accounts are waiting for verification' : 'No users match this filter'} />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>User</th><th>Company</th><th>Approval</th><th>Verified</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`${base}/users/${r.id}`} className="nm" style={{ textDecoration: 'underline' }}>{r.name}</Link>
                    <div className="tiny muted">{r.email} · {r.phone}</div>
                  </td>
                  <td className="small">{r.companyName || '—'}</td>
                  <td>
                    <span className={`badge ${APPROVAL_CLS[r.approvalStatus] || 'badge-outline'}`}>
                      {APPROVAL_LABEL[r.approvalStatus] || r.approvalStatus}
                    </span>
                    {r.approvedByName && r.approvalStatus !== 'pending' && (
                      <div className="tiny muted mt-1">by {r.approvedByName} · {timeAgo(r.approvedAt)}</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${r.isVerified ? 'badge-green' : 'badge-outline'}`}>
                      {r.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {r.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="muted small nowrap">{timeAgo(r.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`${base}/users/${r.id}`} className="btn btn-xs btn-outline">Open</Link>
                      {portal === 'buyer' ? null : ['agent', 'builder', 'service'].includes(portal) ? (
                        <Link to={`${base}/${portal === 'agent' ? 'agents' : portal === 'builder' ? 'builders' : 'service-providers'}/${r.id}`} className="btn btn-xs btn-primary">
                          Review application <ArrowRight style={{ width: 12, height: 12 }} />
                        </Link>
                      ) : (
                        <>
                          {r.approvalStatus !== 'approved' && (
                            <button className="btn btn-xs btn-primary" onClick={() => setApprovalStatus(r, 'approved')}>Approve</button>
                          )}
                          {r.approvalStatus !== 'rejected' && (
                            <button className="btn btn-xs btn-danger" onClick={() => setApprovalStatus(r, 'rejected')}>Reject</button>
                          )}
                          <button className="btn btn-xs btn-outline" onClick={() => toggleVerified(r)}>
                            {r.isVerified ? 'Unverify' : 'Verify'}
                          </button>
                        </>
                      )}
                      <button className="btn btn-xs btn-outline" onClick={() => toggleStatus(r)}>
                        {r.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
