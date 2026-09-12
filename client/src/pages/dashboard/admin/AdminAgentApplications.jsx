import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/client.js';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, titleCase } from '../../../utils/format.js';
import { Users, ArrowRight } from '../../../components/Icons.jsx';

const STATUSES = ['all', 'draft', 'submitted', 'under_review', 'verified', 'active', 'rejected', 'resubmission_required'];
const TRACK_CLS = { not_submitted: 'badge-outline', submitted: 'badge-blue', under_review: 'badge-amber', verified: 'badge-green', rejected: 'badge-red', expired: 'badge-red' };

export default function AdminAgentApplications() {
  const [status, setStatus] = useState('submitted');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    api.get('/admin/agent-applications', { params: { status: status === 'all' ? undefined : status } })
      .then((r) => setRows(r.data.data)).catch(() => setRows([]));
  }, [status]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Agent applications</h2>
        <p className="muted small mt-1">KYC, RERA and business verification review.</p>
      </div>

      <div className="pills">
        {STATUSES.map((s) => (
          <button key={s} className={`pill ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
            {s === 'all' ? 'All' : titleCase(s)}
          </button>
        ))}
      </div>

      {rows === null ? <PageLoader label="Loading applications…" /> : rows.length === 0 ? (
        <Empty icon={Users} title="No applications match this filter" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Agent</th><th>Type</th><th>KYC</th><th>RERA</th><th>Business</th><th>Status</th><th>Submitted</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="nm">{a.name}</div>
                    <div className="tiny muted">{a.email} · {a.phone}</div>
                  </td>
                  <td className="small">{titleCase(a.agentType)}{a.companyName ? ` · ${a.companyName}` : ''}</td>
                  <td><span className={`badge ${TRACK_CLS[a.kycStatus]}`}>{a.kycStatus.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${TRACK_CLS[a.reraStatus]}`}>{a.reraStatus.replace('_', ' ')}</span></td>
                  <td>
                    {a.agentType === 'individual' ? <span className="tiny muted">n/a</span>
                      : <span className={`badge ${TRACK_CLS[a.businessStatus]}`}>{a.businessStatus.replace('_', ' ')}</span>}
                  </td>
                  <td><span className="badge badge-navy" style={{ background: '#fff', color: 'var(--navy-800)' }}>{titleCase(a.lifecycleStatus)}</span></td>
                  <td className="muted small nowrap">{a.submittedAt ? timeAgo(a.submittedAt) : '—'}</td>
                  <td>
                    <Link to={`/dashboard/admin/agents/${a.userId}`} className="btn btn-xs btn-primary">
                      Review <ArrowRight style={{ width: 12, height: 12 }} />
                    </Link>
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
