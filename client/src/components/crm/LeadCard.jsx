import { Phone, Whatsapp, ArrowRight, Check } from '../Icons.jsx';
import { timeAgo, money } from '../../utils/format.js';

// The primary "advance" action per stage — everything else (log a
// follow-up, mark lost) is available from every card regardless of stage.
const NEXT_STAGE = {
  new: { to: 'contacted', label: 'Mark Contacted' },
  contacted: { to: 'visit-scheduled', label: 'Mark Visit Scheduled' },
  'visit-scheduled': { to: 'nurturing', label: 'Move to Nurturing' },
  nurturing: { to: 'negotiation', label: 'Move to Negotiation' },
};

export default function LeadCard({ lead, onLogFollowup, onMoveStage, onBook, onOpenDetail, extraSlot }) {
  const next = NEXT_STAGE[lead.status];
  const showBook = lead.status === 'negotiation';
  const showLost = lead.status !== 'booked' && lead.status !== 'lost';

  return (
    <div className="card lead-card">
      <div className="row-between" style={{ alignItems: 'flex-start', gap: 8 }}>
        <button type="button" className="lead-card-name" onClick={() => onOpenDetail(lead)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}>
          <div className="nm">{lead.name}</div>
          <div className="tiny muted">{lead.phone}</div>
        </button>
        <span className={`temp temp-${lead.temperature}`}>{lead.temperature}</span>
      </div>

      {lead.about && <div className="small clamp-2">{lead.about}</div>}

      {lead.status === 'booked' && lead.bookingAmount != null && (
        <div className="small strong" style={{ color: 'var(--green)' }}>{money(lead.bookingAmount)}</div>
      )}

      {lead.lastNote && <div className="tiny muted clamp-2">{lead.lastNote}</div>}

      <div className="tiny muted">{timeAgo(lead.createdAt)}</div>

      {extraSlot}

      <div className="lead-card-actions">
        <button type="button" className="btn btn-xs btn-outline" onClick={() => onLogFollowup(lead)}>
          <Phone style={{ width: 12, height: 12 }} /> Log follow-up
        </button>
        {lead.phone && (
          <a className="btn btn-xs btn-outline" href={`https://wa.me/91${lead.phone}`} target="_blank" rel="noreferrer">
            <Whatsapp style={{ width: 12, height: 12 }} />
          </a>
        )}
        {next && (
          <button type="button" className="btn btn-xs btn-dark" onClick={() => onMoveStage(lead, next.to)}>
            {next.label} <ArrowRight style={{ width: 12, height: 12 }} />
          </button>
        )}
        {showBook && (
          <button type="button" className="btn btn-xs btn-primary" onClick={() => onBook(lead)}>
            <Check style={{ width: 12, height: 12 }} /> Mark Booked
          </button>
        )}
        {showLost && (
          <button type="button" className="btn btn-xs" style={{ background: 'transparent', color: 'var(--red-600, #dc2626)' }}
                  onClick={() => onMoveStage(lead, 'lost')}>
            Mark Lost
          </button>
        )}
      </div>
    </div>
  );
}
