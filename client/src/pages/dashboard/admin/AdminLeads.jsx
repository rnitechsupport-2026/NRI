import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, PageLoader } from '../../../components/ui.jsx';
import { PORTAL_LABEL } from '../../../utils/format.js';
import { Inbox, Shield } from '../../../components/Icons.jsx';
import LeadBoard from '../../../components/crm/LeadBoard.jsx';
import LeadFollowupModal from '../../../components/crm/LeadFollowupModal.jsx';
import LeadBookModal from '../../../components/crm/LeadBookModal.jsx';
import LeadDetailDrawer from '../../../components/crm/LeadDetailDrawer.jsx';

function toBoardRow(l) {
  return {
    id: l.id, name: l.name, phone: l.phone, email: l.email,
    temperature: l.temperature, status: l.status, about: l.about,
    lastNote: l.lastNote, bookingAmount: l.bookingAmount, bookingDate: l.bookingDate,
    createdAt: l.createdAt, assignedTo: l.assignedTo, assignedToName: l.assignedToName,
    receiverName: l.receiverName, receiverRole: l.receiverRole,
  };
}

export default function AdminLeads() {
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals;

  const [portal, setPortal] = useState(portals[0] || '');
  const [rows, setRows] = useState(null);
  const [listers, setListers] = useState([]);
  const [followupFor, setFollowupFor] = useState(null);
  const [bookFor, setBookFor] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    if (!portal) { setRows([]); return; }
    setRows(null);
    Promise.all([
      api.get('/admin/leads', { params: { portal } }),
      api.get('/admin/users', { params: { portal } }),
    ]).then(([leadsRes, usersRes]) => {
      setRows(leadsRes.data.data.map(toBoardRow));
      setListers(usersRes.data.data);
    }).catch(() => { setRows([]); setListers([]); });
  };

  useEffect(load, [portal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(lead, status) {
    try {
      await api.patch(`/admin/leads/${lead.id}`, { status });
      load();
      toast.success('Lead moved');
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

  async function logFollowup(lead, payload) {
    await api.post(`/admin/leads/${lead.id}/notes`, payload);
    toast.success('Follow-up logged');
    load();
  }

  async function book(lead, payload) {
    await api.post(`/admin/leads/${lead.id}/book`, payload);
    toast.success('Marked as booked');
    load();
  }

  async function openDetail(lead) {
    setDetailFor({ ...lead, notes: [] });
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/admin/leads/${lead.id}`);
      setDetailFor(data.data);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setDetailLoading(false);
    }
  }

  if (!portals.length) {
    return <Empty icon={Shield} title="No portal assigned yet">Ask a super admin to put you in charge of a portal.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>All enquiries</h2>
        <p className="muted small mt-1">
          Every lead across this portal — listers also manage their own under "Leads" in their dashboard.
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
        <LeadBoard
          rows={rows}
          onLogFollowup={setFollowupFor}
          onMoveStage={setStatus}
          onBook={setBookFor}
          onOpenDetail={openDetail}
          extraSlot={(lead) => (
            <select className="select" style={{ height: 32, fontSize: 13, paddingTop: 0, paddingBottom: 0 }}
                    value={lead.assignedTo || ''} onChange={(e) => setAssignee(lead, e.target.value)}>
              <option value="">Unassigned</option>
              {listers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
        />
      )}

      {followupFor && (
        <LeadFollowupModal lead={followupFor} onClose={() => setFollowupFor(null)}
                            onSubmit={(payload) => logFollowup(followupFor, payload)} />
      )}
      {bookFor && (
        <LeadBookModal lead={bookFor} onClose={() => setBookFor(null)}
                        onSubmit={(payload) => book(bookFor, payload)} />
      )}
      {detailFor && (
        <LeadDetailDrawer lead={detailLoading ? { ...detailFor, notes: [] } : detailFor} onClose={() => setDetailFor(null)} />
      )}
    </div>
  );
}
