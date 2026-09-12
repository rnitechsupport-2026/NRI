import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { PageLoader } from '../../../components/ui.jsx';
import { PORTAL_LABEL } from '../../../utils/format.js';
import api from '../../../api/client.js';
import { Users, Home, Building, Wrench, Inbox, Shield, Alert, ArrowRight } from '../../../components/Icons.jsx';

const TILES = [
  { key: 'users', label: 'Users in scope', icon: Users },
  { key: 'properties', label: 'Properties', icon: Home },
  { key: 'projects', label: 'Projects', icon: Building },
  { key: 'services', label: 'Services', icon: Wrench },
  { key: 'leads', label: 'Enquiries', icon: Inbox },
];

export default function AdminOverview() {
  const { user, isAdmin, managedPortals } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/overview').then((r) => setData(r.data.data)).catch(() => setData({}));
  }, []);

  if (!data) return <PageLoader label="Loading admin overview…" />;

  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Admin overview</h2>
        <p className="muted small mt-1">
          {isAdmin ? 'Full platform access.' : `In charge of: ${portals.map((p) => PORTAL_LABEL[p]).join(', ') || 'no portal yet'}.`}
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {portals.map((p) => (
          <span key={p} className="badge badge-navy" style={{ background: '#fff', color: 'var(--navy-800)' }}>
            <Shield style={{ width: 12, height: 12 }} /> {PORTAL_LABEL[p]} portal
          </span>
        ))}
      </div>

      {data.pendingApprovals > 0 && (
        <Link to="/dashboard/admin/users?approval=pending"
              className="card card-p row-between card-hover"
              style={{ background: 'var(--amber-bg)', borderColor: '#f3c98a' }}>
          <div className="row" style={{ gap: 14 }}>
            <Alert style={{ width: 22, height: 22, color: '#b54708' }} />
            <div>
              <div className="strong">{data.pendingApprovals} registration{data.pendingApprovals === 1 ? '' : 's'} waiting for approval</div>
              <div className="small" style={{ color: '#b54708' }}>They can't post listings until you review them.</div>
            </div>
          </div>
          <span className="btn btn-dark btn-sm">Review now <ArrowRight /></span>
        </Link>
      )}

      <div className="kpi-grid">
        {TILES.map(({ key, label, icon: Icon }) => (
          <div key={key} className="card kpi">
            <div className="ic" style={{ background: 'var(--gold-100)', color: 'var(--gold-700)' }}><Icon /></div>
            <b>{data[key] ?? 0}</b>
            <span>{label}</span>
          </div>
        ))}
        {isAdmin && (
          <div className="card kpi">
            <div className="ic" style={{ background: 'var(--gold-100)', color: 'var(--gold-700)' }}><Users /></div>
            <b>{data.employees ?? 0}</b>
            <span>Employees</span>
          </div>
        )}
      </div>
    </div>
  );
}
