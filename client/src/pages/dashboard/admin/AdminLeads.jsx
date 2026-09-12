import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../api/client.js';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, LEAD_STATUS, PORTAL_LABEL } from '../../../utils/format.js';
import { Inbox, Shield } from '../../../components/Icons.jsx';

export default function AdminLeads() {
  const { isAdmin, managedPortals } = useAuth();
  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals;

  const [portal, setPortal] = useState(portals[0] || '');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!portal) { setRows([]); return; }
    setRows(null);
    api.get('/admin/leads', { params: { portal } }).then((r) => setRows(r.data.data)).catch(() => setRows([]));
  }, [portal]);

  if (!portals.length) {
    return <Empty icon={Shield} title="No portal assigned yet">Ask a super admin to put you in charge of a portal.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>All enquiries</h2>
        <p className="muted small mt-1">Read-only oversight — the receiving partner handles each enquiry themselves.</p>
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

      {rows === null ? <PageLoader label="Loading enquiries…" /> : rows.length === 0 ? (
        <Empty icon={Inbox} title="No enquiries in this portal yet" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Enquirer</th><th>About</th><th>Sent to</th><th>Score</th><th>Status</th><th>Received</th></tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const meta = LEAD_STATUS[l.status] || { label: l.status, cls: 'badge-outline' };
                return (
                  <tr key={l.id}>
                    <td><div className="nm">{l.name}</div><div className="tiny muted">{l.phone}</div></td>
                    <td className="small clamp-2" style={{ maxWidth: 220 }}>{l.about || 'General enquiry'}</td>
                    <td className="small">{l.receiverName}<div className="tiny muted">{l.receiverRole}</div></td>
                    <td>
                      <span className={`temp temp-${l.temperature}`}>{l.temperature}</span>
                      <span className="tiny muted" style={{ display: 'block', marginTop: 3 }}>{l.score}/100</span>
                    </td>
                    <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                    <td className="muted small nowrap">{timeAgo(l.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
