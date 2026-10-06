import { Modal } from '../ui.jsx';
import { Phone, Whatsapp } from '../Icons.jsx';
import { timeAgo, LEAD_STATUS, money } from '../../utils/format.js';

export default function LeadDetailDrawer({ lead, onClose }) {
  return (
    <Modal title={lead.name} onClose={onClose}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge ${LEAD_STATUS[lead.status]?.cls || 'badge-outline'}`}>
            {LEAD_STATUS[lead.status]?.label || lead.status}
          </span>
          <span className={`temp temp-${lead.temperature}`}>{lead.temperature}</span>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <a className="btn btn-sm btn-outline" href={`tel:${lead.phone}`}><Phone style={{ width: 14, height: 14 }} /> {lead.phone}</a>
          <a className="btn btn-sm btn-outline" href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer">
            <Whatsapp style={{ width: 14, height: 14 }} /> WhatsApp
          </a>
        </div>

        {lead.email && <p className="small muted">{lead.email}</p>}
        {lead.about && <p className="small"><b>About:</b> {lead.about}</p>}
        {lead.message && <p className="small">{lead.message}</p>}

        {lead.status === 'booked' && lead.bookingAmount != null && (
          <div className="card card-p" style={{ background: 'var(--green-bg)' }}>
            <div className="strong">{money(lead.bookingAmount)}</div>
            {lead.bookingUnit && <div className="small">Unit {lead.bookingUnit}</div>}
            {lead.bookingDate && <div className="tiny muted">{new Date(lead.bookingDate).toLocaleDateString('en-IN')}</div>}
          </div>
        )}

        <div>
          <div className="tiny muted mb-1" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>Activity</div>
          {!lead.notes?.length ? (
            <p className="small muted">No follow-ups logged yet.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {lead.notes.map((n) => (
                <div key={n.id} className="card card-p" style={{ padding: 10 }}>
                  <p className="small">{n.text}</p>
                  <div className="row-between tiny muted mt-1">
                    <span>{n.authorName || n.author_name || 'Unknown'}</span>
                    <span>{timeAgo(n.createdAt || n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
