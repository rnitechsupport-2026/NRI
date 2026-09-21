import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, LEAD_STATUS, PORTAL_LABEL } from '../../../utils/format.js';
import { Inbox, Shield } from '../../../components/Icons.jsx';

const STATUSES = ['new', 'contacted', 'visit-scheduled', 'closed', 'lost'];

export default function AdminLeads() {
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals;

  const [portal, setPortal] = useState(portals[0] || '');
  const [rows, setRows] = useState(null);
  const [listers, setListers] = useState([]);

  const load = () => {
    if (!portal) { setRows([]); return; }
    setRows(null);
    Promise.all([
      api.get('/admin/leads', { params: { portal } }),
      api.get('/admin/users', { params: { portal } }),
    ]).then(([leadsRes, usersRes]) => {
      setRows(leadsRes.data.data);
      setListers(usersRes.data.data);
    }).catch(() => { setRows([]); setListers([]); });
  };

  useEffect(load, [portal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(lead, status) {
    try {
      await api.patch(`/admin/leads/${lead.id}`, { status });
      setRows((rs) => rs.map((r) => (r.id === lead.id ? { ...r, status } : r)));
      toast.success(`Marked as ${LEAD_STATUS[status].label}`);
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function setAssignee(lead, assignedTo) {
    try {
      await api.patch(`/admin/leads/${lead.id}`, { assigned_to: assignedTo || null });
      const lister = listers.find((u) => u.id === assignedTo);
      setRows((rs) => rs.map((r) => (r.id === lead.id
        ? { ...r, assignedTo: assignedTo || null, assignedToName: lister?.name || null } : r)));
      toast.success(assignedTo ? `Assigned to ${lister?.name}` : 'Unassigned');
    } catch (err) { toast.error(errMsg(err)); }
  }

  if (!portals.length) {
    return <Empty icon={Shield} title="No portal assigned yet">Ask a super admin to put you in charge of a portal.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>All enquiries</h2>
        <p className="muted small mt-1">
          Enquiries are managed centrally here — listers no longer see them directly. Update status and assign each one to whoever's handling it.
        </p>
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
              <tr><th>Enquirer</th><th>About</th><th>Sent to</th><th>Score</th><th>Status</th><th>Assigned to</th><th>Received</th></tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id}>
                  <td><div className="nm">{l.name}</div><div className="tiny muted">{l.phone}</div></td>
                  <td className="small clamp-2" style={{ maxWidth: 220 }}>{l.about || 'General enquiry'}</td>
                  <td className="small">{l.receiverName}<div className="tiny muted">{l.receiverRole}</div></td>
                  <td>
                    <span className={`temp temp-${l.temperature}`}>{l.temperature}</span>
                    <span className="tiny muted" style={{ display: 'block', marginTop: 3 }}>{l.score}/100</span>
                  </td>
                  <td>
                    <select className="select" style={{ height: 34, fontSize: 13, paddingTop: 0, paddingBottom: 0 }}
                            value={l.status} onChange={(e) => setStatus(l, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s].label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="select" style={{ height: 34, fontSize: 13, paddingTop: 0, paddingBottom: 0 }}
                            value={l.assignedTo || ''} onChange={(e) => setAssignee(l, e.target.value)}>
                      <option value="">Unassigned</option>
                      {listers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </td>
                  <td className="muted small nowrap">{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
