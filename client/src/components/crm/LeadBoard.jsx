import LeadCard from './LeadCard.jsx';
import { LEAD_STATUS, LEAD_BOARD_COLUMNS, normalizeLeadStatus } from '../../utils/format.js';

/** Pure layout — groups already-normalized lead rows into stage columns.
 *  Fed by Leads.jsx (self-service) and AdminLeads.jsx (cross-portal), each
 *  mapping its own API response into the common row shape this expects:
 *  { id, name, phone, temperature, status, about, lastNote, bookingAmount,
 *    createdAt, ...anything LeadCard/extraSlot needs }. */
export default function LeadBoard({ rows, onLogFollowup, onMoveStage, onBook, onOpenDetail, extraSlot }) {
  const columns = [...LEAD_BOARD_COLUMNS, 'lost'];
  const byColumn = Object.fromEntries(columns.map((c) => [c, []]));
  rows.forEach((r) => {
    const col = normalizeLeadStatus(r.status);
    (byColumn[col] || byColumn.new).push(r);
  });

  return (
    <div className="lead-board">
      {columns.map((col) => (
        <div key={col} className="lead-col">
          <div className="lead-col-head">
            <span className={`badge ${LEAD_STATUS[col].cls}`}>{LEAD_STATUS[col].label}</span>
            <span className="tiny muted">{byColumn[col].length}</span>
          </div>
          {byColumn[col].map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onLogFollowup={onLogFollowup}
              onMoveStage={onMoveStage}
              onBook={onBook}
              onOpenDetail={onOpenDetail}
              extraSlot={extraSlot ? extraSlot(lead) : null}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
