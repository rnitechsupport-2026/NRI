import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader, Stars } from '../../../components/ui.jsx';
import { money, timeAgo, titleCase } from '../../../utils/format.js';
import { Wrench, Eye, Trash, Shield } from '../../../components/Icons.jsx';

export default function AdminServices() {
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const hasAccess = isAdmin || managedPortals.includes('service');

  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/services', { params: { portal: 'service' } })
    .then((r) => setRows(r.data.data)).catch(() => setRows([]));
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(row, status) {
    try {
      await api.put(`/admin/services/${row.id}/status`, { status });
      toast.success(`Marked as ${titleCase(status)}`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/services/${confirm.id}`);
      toast.success('Service removed');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (!hasAccess) {
    return <Empty icon={Shield} title="No portal assigned yet">You're not in charge of the Service portal.</Empty>;
  }
  if (rows === null) return <PageLoader label="Loading services…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Manage services</h2>
        <p className="muted small mt-1">Moderate service listings — pause, reactivate or remove.</p>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Wrench} title="No services yet" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Service</th><th>Partner</th><th>Price</th><th>Rating</th><th>Status</th><th>Posted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="tcell">
                      <img src={s.coverImage} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm clamp-2">{s.title}</div>
                        <div className="tiny muted">{s.category} · {s.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">{s.ownerName}<div className="tiny muted">{s.ownerCompany}</div></td>
                  <td className="strong nowrap">{s.priceFrom ? `${money(s.priceFrom)} ${s.priceUnit || ''}` : 'On request'}</td>
                  <td><span className="row" style={{ gap: 5 }}><Stars value={s.rating} /></span></td>
                  <td>
                    <select className="select btn-xs" style={{ height: 32, fontSize: '.78rem', width: 110 }}
                            value={s.status} onChange={(e) => setStatus(s, e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="muted small nowrap">{timeAgo(s.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/service/${s.slug || s.id}`} className="btn btn-xs btn-outline" title="View"><Eye /></Link>
                      <button className="btn btn-xs btn-danger" title="Delete" onClick={() => setConfirm(s)}><Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <Modal title="Delete this service?" onClose={() => setConfirm(null)}
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
