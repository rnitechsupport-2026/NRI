import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { Empty, PageLoader } from '../components/ui.jsx';
import { timeAgo, LEAD_STATUS } from '../utils/format.js';
import { Inbox, Search } from '../components/Icons.jsx';

/**
 * The buyer-side equivalent of the dashboard's "Leads" page — but that page
 * is written entirely from the receiving side (lead scoring, a status
 * dropdown to progress a sales pipeline, a follow-up bot). This is a plain
 * read-only list of what the current user has enquired about and its status,
 * fed by the same GET /leads endpoint (now role-aware: buyers see what they
 * sent, everyone else still sees what they received).
 */
export default function MyEnquiries() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/leads').then((r) => setRows(r.data.data)).catch(() => setRows([]));
  }, []);

  if (rows === null) return <PageLoader label="Loading your enquiries…" />;

  return (
    <div className="container section-sm">
      <div className="stack" style={{ gap: 20 }}>
        <div>
          <h2>My enquiries</h2>
          <p className="muted small mt-1">{rows.length} enquir{rows.length === 1 ? 'y' : 'ies'} sent</p>
        </div>

        {rows.length === 0 ? (
          <Empty icon={Inbox} title="No enquiries sent yet"
                 action={<Link to="/properties" className="btn btn-primary"><Search /> Browse properties</Link>}>
            When you enquire about a property, project or service, it shows up here with its status.
          </Empty>
        ) : (
          <div className="card table-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Interested in</th><th>Status</th><th>Sent</th></tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const meta = LEAD_STATUS[l.status] || { label: l.status, cls: 'badge-outline' };
                  return (
                    <tr key={l.id}>
                      <td className="small clamp-2" style={{ maxWidth: 360 }}>
                        {l.property_id ? (
                          <Link to={`/property/${l.property_slug || l.property_id}`} className="strong">
                            {l.property_title}
                          </Link>
                        ) : (
                          <span className="strong">{l.project_name || l.service_title || 'General enquiry'}</span>
                        )}
                      </td>
                      <td><span className={`badge ${meta.cls}`}>{meta.label}</span></td>
                      <td className="muted small nowrap">{timeAgo(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
