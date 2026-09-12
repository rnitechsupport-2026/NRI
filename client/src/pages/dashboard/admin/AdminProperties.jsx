import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../../components/ui.jsx';
import { money, timeAgo, titleCase, PORTAL_LABEL } from '../../../utils/format.js';
import { Home, Eye, Trash, Shield, Star } from '../../../components/Icons.jsx';

const STATUSES = ['pending', 'active', 'sold', 'rented', 'inactive'];

export default function AdminProperties() {
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const portals = (isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals)
    .filter((p) => p === 'owner' || p === 'agent');

  const [portal, setPortal] = useState(portals[0] || '');
  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!portal) { setRows([]); return; }
    api.get('/admin/properties', { params: { portal } }).then((r) => setRows(r.data.data)).catch(() => setRows([]));
  };
  useEffect(() => { setRows(null); load(); }, [portal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(row, status) {
    try {
      await api.put(`/admin/properties/${row.id}/status`, { status });
      toast.success(`Marked as ${titleCase(status)}`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function toggleVerify(row) {
    try {
      await api.put(`/admin/properties/${row.id}/verify`, { is_verified: !row.isVerified });
      toast.success(!row.isVerified ? 'Listing verified' : 'Verification removed');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function toggleFeature(row) {
    try {
      await api.put(`/admin/properties/${row.id}/feature`, { is_featured: !row.isFeatured });
      toast.success(!row.isFeatured ? 'Featured' : 'Removed from featured');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/properties/${confirm.id}`);
      toast.success('Listing deleted');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (!portals.length) {
    return <Empty icon={Shield} title="No portal assigned yet">You're not in charge of the Owner or Agent portal.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Manage properties</h2>
        <p className="muted small mt-1">Moderate listings — verify, feature, pause or remove.</p>
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

      {rows === null ? <PageLoader label="Loading listings…" /> : rows.length === 0 ? (
        <Empty icon={Home} title="No listings in this portal yet" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Property</th><th>Owner</th><th>Price</th><th>Status</th><th>Flags</th><th>Posted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="tcell">
                      <img src={p.coverImage} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm clamp-2">{p.title}</div>
                        <div className="tiny muted">{p.locality}, {p.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">{p.ownerName}<div className="tiny muted">{titleCase(p.ownerRole)}</div></td>
                  <td className="strong nowrap">{money(p.price)}</td>
                  <td>
                    <select className="select btn-xs" style={{ height: 32, fontSize: '.78rem', width: 118 }}
                            value={p.status} onChange={(e) => setStatus(p, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                      {p.isVerified && <span className="badge badge-green"><Shield style={{ width: 11, height: 11 }} /></span>}
                      {p.isFeatured && <span className="badge badge-gold"><Star style={{ width: 11, height: 11 }} /></span>}
                    </div>
                  </td>
                  <td className="muted small nowrap">{timeAgo(p.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/property/${p.slug || p.id}`} className="btn btn-xs btn-outline" title="View"><Eye /></Link>
                      <button className="btn btn-xs btn-outline" onClick={() => toggleVerify(p)}>
                        {p.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      <button className="btn btn-xs btn-outline" onClick={() => toggleFeature(p)}>
                        {p.isFeatured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button className="btn btn-xs btn-danger" title="Delete" onClick={() => setConfirm(p)}><Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <p><b>{confirm.title}</b> will be removed. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
