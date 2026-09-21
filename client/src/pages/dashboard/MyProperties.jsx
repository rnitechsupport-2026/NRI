import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../components/ui.jsx';
import { money, timeAgo, titleCase, PURPOSE_LABEL, shareUrl } from '../../utils/format.js';
import { Home, Plus, Edit, Trash, Eye, Inbox, Cube, ArrowRight, Send } from '../../components/Icons.jsx';

const STATUS_CLS = {
  active: 'badge-green', pending: 'badge-amber', sold: 'badge-navy',
  rented: 'badge-blue', inactive: 'badge-outline',
};

export default function MyProperties() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/properties/mine/list')
    .then((r) => setRows(r.data.data))
    .catch(() => setRows([]));

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0 };
    (rows || []).forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const shown = (rows || []).filter((r) => filter === 'all' || r.status === filter);

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/properties/${confirm.id}`);
      toast.success('Listing deleted');
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(row, status) {
    try {
      await api.put(`/properties/${row.id}`, { status });
      toast.success(`Marked as ${titleCase(status)}`);
      load();
    } catch (e) { toast.error(errMsg(e)); }
  }

  async function copyLink(row) {
    try {
      await navigator.clipboard.writeText(shareUrl(row));
      toast.success('Link copied — paste it anywhere, WhatsApp shows the photo & price automatically');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  if (rows === null) return <PageLoader label="Loading your listings…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2>My properties</h2>
          <p className="muted small mt-1">{counts.all} listing{counts.all === 1 ? '' : 's'} total</p>
        </div>
        <Link to="/dashboard/property/new" className="btn btn-primary"><Plus /> Post property</Link>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Home} title="You haven't posted a property yet"
               action={<Link to="/dashboard/property/new" className="btn btn-primary"><Plus /> Post your first property</Link>}>
          Listings are free and go live instantly. Add photos and a 3D walkthrough to get more enquiries.
        </Empty>
      ) : (
        <>
          <div className="pills">
            {['all', 'active', 'inactive', 'sold', 'rented'].map((s) => (
              <button key={s} className={`pill ${filter === s ? 'on' : ''}`} onClick={() => setFilter(s)}>
                {titleCase(s)} <span className="tiny muted">({counts[s] || 0})</span>
              </button>
            ))}
          </div>

          <div className="card table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Property</th><th>Price</th><th>Status</th>
                  <th>Views</th><th>Enquiries</th><th>Posted</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="tcell">
                        <img src={p.cover_image} alt="" />
                        <div style={{ minWidth: 0 }}>
                          <div className="nm clamp-2">{p.title}</div>
                          <div className="tiny muted">
                            {p.locality}, {p.city} · {PURPOSE_LABEL[p.purpose]}
                            {p.tour_url && <span className="gold"> · <Cube style={{ width: 11, height: 11, display: 'inline' }} /> 3D</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="strong nowrap">{money(p.price)}</td>
                    <td>
                      <select className="select btn-xs" style={{ height: 32, fontSize: '.78rem', width: 118 }}
                              value={p.status} onChange={(e) => setStatus(p, e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Paused</option>
                        <option value="sold">Sold</option>
                        <option value="rented">Rented</option>
                      </select>
                    </td>
                    <td><span className="row" style={{ gap: 5 }}><Eye style={{ width: 14, height: 14, color: 'var(--muted)' }} /> {p.views}</span></td>
                    <td>
                      <span className={`badge ${p.lead_count > 0 ? 'badge-blue' : 'badge-outline'}`}>
                        <Inbox style={{ width: 12, height: 12 }} /> {p.lead_count}
                      </span>
                    </td>
                    <td className="muted small nowrap">{timeAgo(p.created_at)}</td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button type="button" className="btn btn-xs btn-outline" title="Copy shareable link"
                                onClick={() => copyLink(p)}>
                          <Send />
                        </button>
                        <Link to={`/property/${p.slug || p.id}`} className="btn btn-xs btn-outline" title="View">
                          <Eye />
                        </Link>
                        <Link to={`/dashboard/property/${p.id}/edit`} className="btn btn-xs btn-outline" title="Edit">
                          <Edit />
                        </Link>
                        <button type="button" className="btn btn-xs btn-danger" title="Delete"
                                onClick={() => setConfirm(p)}>
                          <Trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {shown.length === 0 && (
              <div className="card-p center muted small">No listings with this status.</div>
            )}
          </div>

          <div className="card card-p row-between" style={{ background: 'var(--gold-100)', borderColor: 'var(--gold-500)' }}>
            <div className="row" style={{ gap: 14 }}>
              <Cube style={{ width: 28, height: 28, color: 'var(--gold-700)' }} />
              <div>
                <div className="strong">Add a 3D walkthrough to your listings</div>
                <div className="small" style={{ color: 'var(--gold-700)' }}>
                  Paste a Matterport or Kuula link while editing — listings with tours get 3× more enquiries.
                </div>
              </div>
            </div>
            {shown[0] && (
              <Link to={`/dashboard/property/${shown[0].id}/edit`} className="btn btn-dark btn-sm">
                Add now <ArrowRight />
              </Link>
            )}
          </div>
        </>
      )}

      {confirm && (
        <Modal title="Delete this listing?" onClose={() => setConfirm(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={remove} disabled={busy}>
                     {busy ? <><span className="spinner spinner-dark" /> Deleting…</> : 'Delete permanently'}
                   </button>
                 </>
               }>
          <p>
            <b>{confirm.title}</b> will be removed along with its photos and enquiries.
            This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
