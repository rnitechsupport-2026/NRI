import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/client.js';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, titleCase } from '../../../utils/format.js';
import { Wrench, ArrowRight } from '../../../components/Icons.jsx';

const STATUSES = ['all', 'draft', 'submitted', 'under_review', 'verified', 'active', 'rejected', 'resubmission_required'];
const TRACK_CLS = { not_submitted: 'badge-outline', submitted: 'badge-blue', under_review: 'badge-amber', verified: 'badge-green', rejected: 'badge-red', expired: 'badge-red' };

export default function AdminServiceApplications() {
  const [status, setStatus] = useState('submitted');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    api.get('/admin/service-applications', { params: { status: status === 'all' ? undefined : status } })
      .then((r) => setRows(r.data.data)).catch(() => setRows([]));
  }, [status]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Service provider applications</h2>
        <p className="muted small mt-1">Identity and category-specific qualification review — what's checked depends on the profession.</p>
      </div>

      <div className="pills">
        {STATUSES.map((s) => (
          <button key={s} className={`pill ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>
            {s === 'all' ? 'All' : titleCase(s)}
          </button>
        ))}
      </div>

      {rows === null ? <PageLoader label="Loading applications…" /> : rows.length === 0 ? (
        <Empty icon={Wrench} title="No applications match this filter" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Provider</th><th>Category</th><th>Identity</th><th>Qualification</th><th>Status</th><th>Submitted</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="nm">{p.name}</div>
                    <div className="tiny muted">{p.email} · {p.phone}</div>
                  </td>
                  <td className="small">{p.categoryLabel}{p.legalEntityName ? ` · ${p.legalEntityName}` : ''}</td>
                  <td><span className={`badge ${TRACK_CLS[p.identityStatus]}`}>{p.identityStatus.replace('_', ' ')}</span></td>
                  <td>
                    {p.qualificationApplicable
                      ? <span className={`badge ${TRACK_CLS[p.qualificationStatus]}`}>{p.qualificationStatus.replace('_', ' ')}</span>
                      : <span className="tiny muted">n/a</span>}
                  </td>
                  <td><span className="badge badge-navy" style={{ background: '#fff', color: 'var(--navy-800)' }}>{titleCase(p.lifecycleStatus)}</span></td>
                  <td className="muted small nowrap">{p.submittedAt ? timeAgo(p.submittedAt) : '—'}</td>
                  <td>
                    <Link to={`/dashboard/admin/service-providers/${p.userId}`} className="btn btn-xs btn-primary">
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
