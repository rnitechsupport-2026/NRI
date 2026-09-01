import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar, Empty, PageLoader } from '../../components/ui.jsx';
import Recommendations from '../../components/bots/Recommendations.jsx';
import { money, timeAgo, LEAD_STATUS, ROLE_LABEL } from '../../utils/format.js';
import {
  Home, Inbox, Eye, Heart, Building, Wrench, Plus, ArrowRight, Trending, Chart, Shield,
} from '../../components/Icons.jsx';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Overview() {
  const { user } = useAuth();
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/stats/dashboard').then((r) => setD(r.data.data)).catch(() => setD({}));
  }, []);

  if (!d) return <PageLoader label="Loading your dashboard…" />;

  const kpis = [
    { icon: Home, label: 'Total listings', value: d.listings ?? 0, tint: 'var(--blue-bg)', color: 'var(--blue)' },
    { icon: Eye, label: 'Total views', value: (d.views ?? 0).toLocaleString('en-IN'), tint: 'var(--gold-100)', color: 'var(--gold-600)' },
    { icon: Inbox, label: 'Enquiries', value: d.leads ?? 0, tint: 'var(--green-bg)', color: 'var(--green)' },
    { icon: Heart, label: 'Shortlisted', value: d.shortlisted ?? 0, tint: 'var(--red-bg)', color: 'var(--red)' },
    ...(d.projects !== undefined
      ? [{ icon: Building, label: 'Projects', value: d.projects, tint: 'var(--line-2)', color: 'var(--navy-700)' }] : []),
    ...(d.services !== undefined
      ? [{ icon: Wrench, label: 'Services', value: d.services, tint: 'var(--line-2)', color: 'var(--navy-700)' }] : []),
  ];

  const maxTrend = Math.max(1, ...(d.trend || []).map((t) => t.count));

  return (
    <div className="stack" style={{ gap: 22 }}>
      {/* greeting */}
      <div className="card card-p row-between" style={{
        background: 'linear-gradient(118deg, var(--navy-900) 0%, var(--navy-700) 55%, var(--brand-700) 100%)',
        border: 'none', color: '#fff',
      }}>
        <div className="row" style={{ gap: 16 }}>
          <Avatar src={user.avatar_url} name={user.name} size="avatar-lg" className="avatar-ring" />
          <div>
            <h2 style={{ color: '#fff', fontSize: '1.5rem' }}>Hello, {user.name.split(' ')[0]} 👋</h2>
            <p className="small" style={{ color: 'rgba(255,255,255,.72)' }}>
              {d.new_leads > 0
                ? `You have ${d.new_leads} new enquir${d.new_leads === 1 ? 'y' : 'ies'} waiting for a response.`
                : `Here is how your ${ROLE_LABEL[user.role].toLowerCase()} account is performing.`}
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          {['owner', 'agent', 'builder', 'admin'].includes(user.role) && (
            <Link to="/dashboard/property/new" className="btn btn-primary btn-sm"><Plus /> Post property</Link>
          )}
          {['builder', 'admin'].includes(user.role) && (
            <Link to="/dashboard/project/new" className="btn btn-light btn-sm"><Plus /> Add project</Link>
          )}
          {user.role === 'service' && (
            <Link to="/dashboard/service/new" className="btn btn-primary btn-sm"><Plus /> Add service</Link>
          )}
        </div>
      </div>

      {/* kpis */}
      <div className="kpi-grid">
        {kpis.map(({ icon: Icon, label, value, tint, color }) => (
          <div key={label} className="card kpi">
            <div className="ic" style={{ background: tint, color }}><Icon /></div>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 22 }}>
        {/* trend */}
        <div className="card card-p">
          <div className="row-between mb-2">
            <h3 className="row" style={{ gap: 9 }}>
              <Chart style={{ width: 19, height: 19, color: 'var(--gold-600)' }} /> Enquiries — last 6 months
            </h3>
            <span className="badge badge-outline"><Trending style={{ width: 12, height: 12 }} /> {d.leads} total</span>
          </div>
          {(!d.trend || d.trend.length === 0) ? (
            <p className="muted small">No enquiry data yet. Your first lead will show up here.</p>
          ) : (
            <div className="chart">
              {d.trend.map((t) => {
                const [y, m] = t.month.split('-');
                return (
                  <div className="chart-col" key={t.month}>
                    <div className="chart-bar" style={{ height: `${(t.count / maxTrend) * 100}%` }}>
                      <b>{t.count}</b>
                    </div>
                    <span>{MONTH[Number(m) - 1]} {String(y).slice(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* lead status */}
        <div className="card card-p">
          <h3 className="mb-2">Enquiry pipeline</h3>
          {(!d.leads_by_status || d.leads_by_status.length === 0) ? (
            <p className="muted small">No enquiries yet.</p>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {d.leads_by_status.map((s) => {
                const meta = LEAD_STATUS[s.status] || { label: s.status, cls: 'badge-outline' };
                const pct = Math.round((s.count / Math.max(1, d.leads)) * 100);
                return (
                  <div key={s.status}>
                    <div className="row-between small mb-1">
                      <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      <span className="strong">{s.count}</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--line-2)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--navy-700)', borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link to="/dashboard/leads" className="btn btn-outline btn-sm btn-block mt-3">
            Manage enquiries <ArrowRight />
          </Link>
        </div>
      </div>

      {/* recent leads */}
      <div className="card">
        <div className="row-between card-p" style={{ paddingBottom: 0 }}>
          <h3>Recent enquiries</h3>
          <Link to="/dashboard/leads" className="btn btn-xs btn-ghost">View all <ArrowRight /></Link>
        </div>
        {(!d.recent_leads || d.recent_leads.length === 0) ? (
          <div className="card-p"><p className="muted small">No enquiries received yet.</p></div>
        ) : (
          <div className="table-wrap card-p">
            <table className="tbl">
              <thead>
                <tr><th>Name</th><th>Interested in</th><th>Phone</th><th>Status</th><th>Received</th></tr>
              </thead>
              <tbody>
                {d.recent_leads.map((l) => {
                  const meta = LEAD_STATUS[l.status] || { label: l.status, cls: 'badge-outline' };
                  return (
                    <tr key={l.id}>
                      <td><span className="nm">{l.name}</span></td>
                      <td className="muted small clamp-2" style={{ maxWidth: 260 }}>
                        {l.property_title || l.project_name || l.service_title || 'General enquiry'}
                      </td>
                      <td><a href={`tel:${l.phone}`} className="strong small">{l.phone}</a></td>
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

      {/* top listings */}
      <div className="card">
        <div className="row-between card-p" style={{ paddingBottom: 0 }}>
          <h3>Top performing listings</h3>
          <Link to="/dashboard/properties" className="btn btn-xs btn-ghost">Manage <ArrowRight /></Link>
        </div>
        {(!d.top_listings || d.top_listings.length === 0) ? (
          <div className="card-p">
            <Empty icon={Home} title="No listings yet"
                   action={<Link to="/dashboard/property/new" className="btn btn-primary"><Plus /> Post your first property</Link>}>
              Post a property to start receiving enquiries from verified buyers.
            </Empty>
          </div>
        ) : (
          <div className="table-wrap card-p">
            <table className="tbl">
              <thead>
                <tr><th>Property</th><th>Price</th><th>Views</th><th>Enquiries</th><th /></tr>
              </thead>
              <tbody>
                {d.top_listings.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="tcell">
                        <img src={p.cover_image} alt="" />
                        <div style={{ minWidth: 0 }}>
                          <div className="nm clamp-2">{p.title}</div>
                          <div className="tiny muted">{p.locality}, {p.city}</div>
                        </div>
                      </div>
                    </td>
                    <td className="strong nowrap">{money(p.price)}</td>
                    <td>{p.views}</td>
                    <td><span className="badge badge-blue">{p.lead_count}</span></td>
                    <td><Link to={`/property/${p.slug || p.id}`} className="btn btn-xs btn-outline">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendation bot — built from shortlist + enquiry history */}
      <Recommendations
        source="me"
        title="Picked for you"
        subtitle="Based on what you've shortlisted and enquired about."
        cols="g-3"
        limit={3}
      />

      {!user.is_verified && (
        <div className="card card-p row-between" style={{ background: 'var(--gold-100)', borderColor: 'var(--gold-500)' }}>
          <div className="row" style={{ gap: 14 }}>
            <Shield style={{ width: 26, height: 26, color: 'var(--gold-700)' }} />
            <div>
              <div className="strong">Get the verified badge</div>
              <div className="small" style={{ color: 'var(--gold-700)' }}>
                Add your RERA number and complete your profile — verified accounts get 3× more enquiries.
              </div>
            </div>
          </div>
          <Link to="/dashboard/profile" className="btn btn-dark btn-sm">Complete profile</Link>
        </div>
      )}
    </div>
  );
}
