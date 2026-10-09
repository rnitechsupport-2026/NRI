import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Notice, PageLoader } from '../components/ui.jsx';
import { timeAgo, PORTAL_LABEL, ROLE_LABEL } from '../utils/format.js';
import { Users, Shield, Clock, Inbox, Trending, CheckCircle, ArrowRight, Home } from '../components/Icons.jsx';

const APPROVED_WHAT = {
  approval_status: 'Account approved', property_review: 'Property approved', agent_approve: 'Agent approved',
  builder_approve: 'Builder approved', service_provider_approve: 'Service provider approved',
};

/** /staff — the employee's home: what is waiting on them, across their assigned users only. */
export default function StaffDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/staff-dashboard').then((r) => setD(r.data.data)).catch((e) => setError(errMsg(e, 'Could not load your dashboard')));
  }, []);

  if (error) return <Notice type="err">{error}</Notice>;
  if (!d) return <PageLoader label="Loading your dashboard…" />;

  const tiles = [
    { label: 'Assigned Users', value: d.assignedUsers, icon: Users, to: '/staff/users', tint: 'var(--blue-bg)', color: 'var(--blue)' },
    { label: 'Pending User Verifications', value: d.pendingUsers, icon: Shield, to: '/staff/user-verification', tint: 'var(--amber-bg)', color: '#b54708', urgent: d.pendingUsers > 0 },
    { label: 'Properties Under Verification', value: d.pendingProperties, icon: Clock, to: '/staff/properties-under-verification', tint: 'var(--amber-bg)', color: '#b54708', urgent: d.pendingProperties > 0 },
    { label: 'Active Leads', value: d.activeLeads, icon: Trending, to: '/staff/leads', tint: 'var(--green-bg)', color: 'var(--green)', hint: 'In progress' },
    { label: 'Pending Leads', value: d.pendingLeads, icon: Inbox, to: '/staff/leads', tint: 'var(--gold-100)', color: 'var(--gold-600)', hint: 'New, not yet contacted' },
    { label: 'Recently Approved', value: d.approvedThisWeek, icon: CheckCircle, to: '/staff/history', tint: 'var(--green-bg)', color: 'var(--green)', hint: 'Last 7 days' },
  ];

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div>
        <h2>Welcome, {user.name.split(' ')[0]}</h2>
        <p className="muted small mt-1">
          You manage {d.assignedUsers} user{d.assignedUsers === 1 ? '' : 's'}
          {d.portals.length ? ` — ${d.portals.map((p) => `${d.usersByRole[p] || 0} ${PORTAL_LABEL[p]}`).join(' · ')}` : ''}.
          Only the users assigned to you appear anywhere in this portal.
        </p>
      </div>

      <div className="kpi-grid staff-kpis">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className={`card kpi card-hover ${t.urgent ? 'staff-kpi-urgent' : ''}`}>
            <div className="ic" style={{ background: t.tint, color: t.color }}><t.icon /></div>
            <b>{t.value ?? 0}</b>
            <span>{t.label}</span>
            {t.hint && <span className="tiny muted">{t.hint}</span>}
          </Link>
        ))}
      </div>

      <div className="staff-queues">
        <section className="card card-p stack" style={{ gap: 12 }}>
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Users waiting for verification</h3>
            <Link to="/staff/user-verification" className="small strong">View all <ArrowRight style={{ width: 13, height: 13, display: 'inline' }} /></Link>
          </div>
          {d.userQueue.length === 0 ? <p className="small muted">No accounts are waiting. You're all caught up.</p> : (
            <ul className="staff-list">
              {d.userQueue.map((u) => (
                <li key={u.id}>
                  <Link to={`/staff/users/${u.id}`}>
                    <span style={{ minWidth: 0 }}>
                      <b>{u.name}</b>
                      <span className="tiny muted" style={{ display: 'block' }}>{ROLE_LABEL[u.role]} · registered {timeAgo(u.createdAt)}</span>
                    </span>
                    <span className="badge badge-amber">Under Verification</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card card-p stack" style={{ gap: 12 }}>
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Properties under verification</h3>
            <Link to="/staff/properties-under-verification" className="small strong">View all <ArrowRight style={{ width: 13, height: 13, display: 'inline' }} /></Link>
          </div>
          {d.propertyQueue.length === 0 ? <p className="small muted">No properties are waiting. Nothing is held back from the public site.</p> : (
            <ul className="staff-list">
              {d.propertyQueue.map((p) => (
                <li key={p.id}>
                  <Link to={`/staff/users/${p.ownerId}`}>
                    <span style={{ minWidth: 0 }}>
                      <b className="clamp-1">{p.title}</b>
                      <span className="tiny muted" style={{ display: 'block' }}>{p.ownerName} ({ROLE_LABEL[p.ownerRole]}) · {p.place} · {timeAgo(p.createdAt)}</span>
                    </span>
                    <Home style={{ width: 16, height: 16, color: 'var(--muted)', flexShrink: 0 }} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card card-p stack" style={{ gap: 12 }}>
        <div className="row-between">
          <h3 style={{ margin: 0 }}>Recently approved</h3>
          <Link to="/staff/history" className="small strong">Approval history <ArrowRight style={{ width: 13, height: 13, display: 'inline' }} /></Link>
        </div>
        {d.recentlyApproved.length === 0 ? <p className="small muted">No approvals recorded for your users yet.</p> : (
          <ul className="staff-list">
            {d.recentlyApproved.map((r) => (
              <li key={r.id}>
                <Link to={`/staff/users/${r.targetId}`}>
                  <span style={{ minWidth: 0 }}>
                    <b>{APPROVED_WHAT[r.action] || 'Approved'} — {r.targetName}</b>
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {r.action === 'property_review' && r.reason ? `${r.reason} · ` : ''}by {r.adminName || '—'}{r.adminRole ? ` (${ROLE_LABEL[r.adminRole]})` : ''} · {timeAgo(r.createdAt)}
                    </span>
                  </span>
                  <span className="badge badge-green">Approved</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
