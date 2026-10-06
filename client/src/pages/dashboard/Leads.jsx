import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, PageLoader } from '../../components/ui.jsx';
import { Inbox } from '../../components/Icons.jsx';
import LeadBoard from '../../components/crm/LeadBoard.jsx';
import LeadFollowupModal from '../../components/crm/LeadFollowupModal.jsx';
import LeadBookModal from '../../components/crm/LeadBookModal.jsx';
import LeadDetailDrawer from '../../components/crm/LeadDetailDrawer.jsx';

function toBoardRow(l) {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    message: l.message,
    temperature: l.temperature,
    status: l.status,
    about: l.property_title || l.project_name || l.service_title || null,
    lastNote: l.notes?.[0]?.text || null,
    notes: l.notes || [],
    bookingAmount: l.booking_amount,
    bookingUnit: l.booking_unit,
    bookingDate: l.booking_date,
    createdAt: l.created_at,
  };
}

export default function Leads() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [followupFor, setFollowupFor] = useState(null);
  const [bookFor, setBookFor] = useState(null);
  const [detailFor, setDetailFor] = useState(null);

  const load = () => {
    api.get('/leads/mine')
      .then((r) => setRows(r.data.data.map(toBoardRow)))
      .catch(() => setRows([]));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function logFollowup(lead, payload) {
    await api.post(`/leads/${lead.id}/notes`, payload);
    toast.success('Follow-up logged');
    load();
  }

  async function moveStage(lead, status) {
    try {
      await api.patch(`/leads/${lead.id}/stage`, { status });
      toast.success('Lead moved');
      load();
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function book(lead, payload) {
    await api.post(`/leads/${lead.id}/book`, payload);
    toast.success('Marked as booked');
    load();
  }

  if (rows === null) return <PageLoader label="Loading leads…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Leads</h2>
        <p className="muted small mt-1">Enquiries on your listings — log follow-ups, track temperature, and move them through to booking.</p>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Inbox} title="No leads yet">Enquiries on your listings will appear here.</Empty>
      ) : (
        <LeadBoard
          rows={rows}
          onLogFollowup={setFollowupFor}
          onMoveStage={moveStage}
          onBook={setBookFor}
          onOpenDetail={setDetailFor}
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
      {detailFor && <LeadDetailDrawer lead={detailFor} onClose={() => setDetailFor(null)} />}
    </div>
  );
}
