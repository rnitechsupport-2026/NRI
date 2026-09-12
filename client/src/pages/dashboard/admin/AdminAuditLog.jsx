import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../api/client.js';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, shortDate, PORTAL_LABEL } from '../../../utils/format.js';
import { Document } from '../../../components/Icons.jsx';

export default function AdminAuditLog() {
  const { isAdmin, managedPortals } = useAuth();
  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals;

  const [portal, setPortal] = useState(portals[0] || '');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!portal) { setRows([]); return; }
    setRows(null);
    api.get('/admin/audit-logs', { params: { portal } }).then((r) => setRows(r.data.data)).catch(() => setRows([]));
  }, [portal]);

  if (!portals.length) return <Empty icon={Document} title="No portal assigned yet" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Audit log</h2>
        <p className="muted small mt-1">Every verification and status decision, with who did it and when.</p>
      </div>

      {portals.length > 1 && (
        <div className="pills">
          {portals.map((p) => (
            <button key={p} className={`pill ${portal === p ? 'on' : ''}`} onClick={() => setPortal(p)}>{PORTAL_LABEL[p]}</button>
          ))}
        </div>
      )}

      {rows === null ? <PageLoader label="Loading audit log…" /> : rows.length === 0 ? (
        <Empty icon={Document} title="No admin actions recorded yet" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead><tr><th>Action</th><th>Target</th><th>Change</th><th>Reason</th><th>Admin</th><th>When</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="small strong">{r.action.replace(/_/g, ' ')}</td>
                  <td className="small">{r.targetName}<div className="tiny muted">{r.targetRole}</div></td>
                  <td className="tiny muted">{r.previousStatus ? `${r.previousStatus} → ${r.newStatus}` : '—'}</td>
                  <td className="tiny muted">{r.reason || '—'}</td>
                  <td className="small">{r.adminName}</td>
                  <td className="muted small nowrap" title={shortDate(r.createdAt)}>{timeAgo(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
