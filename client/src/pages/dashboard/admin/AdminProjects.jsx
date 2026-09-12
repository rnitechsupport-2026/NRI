import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../../components/ui.jsx';
import { money, timeAgo, titleCase } from '../../../utils/format.js';
import { Building, Eye, Trash, Shield, Star, Alert } from '../../../components/Icons.jsx';

const STATUSES = ['upcoming', 'ongoing', 'completed'];
const VERIF_CLS = { not_submitted: 'badge-outline', submitted: 'badge-blue', under_review: 'badge-amber', verified: 'badge-green', rejected: 'badge-red' };

export default function AdminProjects() {
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const hasAccess = isAdmin || managedPortals.includes('builder');

  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/projects', { params: { portal: 'builder' } })
    .then((r) => setRows(r.data.data)).catch(() => setRows([]));
  useEffect(() => { if (hasAccess) load(); }, [hasAccess]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(row, status) {
    try {
      await api.put(`/admin/projects/${row.id}/status`, { status });
      toast.success(`Marked as ${titleCase(status)}`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function toggleFeature(row) {
    try {
      await api.put(`/admin/projects/${row.id}/feature`, { is_featured: !row.isFeatured });
      toast.success(!row.isFeatured ? 'Featured' : 'Removed from featured');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/projects/${confirm.id}`);
      toast.success('Project deleted');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (!hasAccess) {
    return <Empty icon={Shield} title="No portal assigned yet">You're not in charge of the Builder portal.</Empty>;
  }
  if (rows === null) return <PageLoader label="Loading projects…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Manage projects</h2>
        <p className="muted small mt-1">Moderate builder projects — feature, update status or remove.</p>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Building} title="No projects yet" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Project</th><th>Builder</th><th>Price range</th><th>Status</th><th>Verification</th><th>Flags</th><th>Posted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="tcell">
                      <img src={p.coverImage} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm clamp-2">{p.name}</div>
                        <div className="tiny muted">{p.locality}, {p.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">{p.builderName}<div className="tiny muted">{p.builderCompany}</div></td>
                  <td className="strong nowrap">{p.minPrice ? `${money(p.minPrice)} – ${money(p.maxPrice)}` : '—'}</td>
                  <td>
                    <select className="select btn-xs" style={{ height: 32, fontSize: '.78rem', width: 118 }}
                            value={p.status} onChange={(e) => setStatus(p, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${VERIF_CLS[p.verificationStatus] || 'badge-outline'}`}>{(p.verificationStatus || 'not_submitted').replace('_', ' ')}</span>
                    {p.nameMismatch && (
                      <div className="tiny mt-1" style={{ color: 'var(--red)' }}>
                        <Alert style={{ width: 11, height: 11, display: 'inline' }} /> Name mismatch
                      </div>
                    )}
                  </td>
                  <td>{p.isFeatured && <span className="badge badge-gold"><Star style={{ width: 11, height: 11 }} /></span>}</td>
                  <td className="muted small nowrap">{timeAgo(p.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Link to={`/project/${p.slug || p.id}`} className="btn btn-xs btn-outline" title="View"><Eye /></Link>
                      <Link to={`/dashboard/admin/projects/${p.id}/verification`} className="btn btn-xs btn-primary">Review</Link>
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
        <Modal title="Delete this project?" onClose={() => setConfirm(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={remove} disabled={busy}>
                     {busy ? <><span className="spinner spinner-dark" /> Deleting…</> : 'Delete permanently'}
                   </button>
                 </>
               }>
          <p><b>{confirm.name}</b> will be removed. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
