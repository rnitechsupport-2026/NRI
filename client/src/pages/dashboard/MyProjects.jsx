import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../components/ui.jsx';
import { money, shortDate, titleCase } from '../../utils/format.js';
import { Building, Plus, Edit, Trash, Eye, Inbox } from '../../components/Icons.jsx';

const STATUS_CLS = { upcoming: 'badge-blue', ongoing: 'badge-amber', completed: 'badge-green' };

export default function MyProjects() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/projects/mine/list')
    .then((r) => setRows(r.data.data)).catch(() => setRows([]));

  useEffect(() => { load(); }, []);

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/projects/${confirm.id}`);
      toast.success('Project deleted');
      setConfirm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  if (rows === null) return <PageLoader label="Loading your projects…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2>My projects</h2>
          <p className="muted small mt-1">{rows.length} project{rows.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/dashboard/project/new" className="btn btn-primary"><Plus /> Add project</Link>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Building} title="No projects added yet"
               action={<Link to="/dashboard/project/new" className="btn btn-primary"><Plus /> Add your first project</Link>}>
          Showcase your developments with configurations, pricing, amenities and possession dates.
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Project</th><th>Configuration</th><th>Price range</th>
                <th>Status</th><th>Possession</th><th>Views</th><th>Leads</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="tcell">
                      <img src={p.cover_image} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm clamp-2">{p.name}</div>
                        <div className="tiny muted">{p.locality}, {p.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">{p.configuration || titleCase(p.project_type)}</td>
                  <td className="strong small nowrap">
                    {p.min_price ? `${money(p.min_price)} – ${money(p.max_price)}` : 'On request'}
                  </td>
                  <td><span className={`badge ${STATUS_CLS[p.status]}`}>{titleCase(p.status)}</span></td>
                  <td className="small muted nowrap">{p.possession_on ? shortDate(p.possession_on) : '—'}</td>
                  <td>{p.views}</td>
                  <td>
                    <span className={`badge ${p.lead_count > 0 ? 'badge-blue' : 'badge-outline'}`}>
                      <Inbox style={{ width: 12, height: 12 }} /> {p.lead_count}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link to={`/project/${p.slug || p.id}`} className="btn btn-xs btn-outline"><Eye /></Link>
                      <Link to={`/dashboard/project/${p.id}/edit`} className="btn btn-xs btn-outline"><Edit /></Link>
                      <button className="btn btn-xs btn-danger" onClick={() => setConfirm(p)}><Trash /></button>
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
                     {busy ? 'Deleting…' : 'Delete permanently'}
                   </button>
                 </>
               }>
          <p><b>{confirm.name}</b> and all its images and leads will be removed. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
