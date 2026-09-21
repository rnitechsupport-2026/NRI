import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader, Stars } from '../../components/ui.jsx';
import { rupees, titleCase } from '../../utils/format.js';
import { Wrench, Plus, Edit, Trash, Eye, Inbox } from '../../components/Icons.jsx';

export default function MyServices() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/services/mine/list')
    .then((r) => setRows(r.data.data)).catch(() => setRows([]));

  useEffect(() => { load(); }, []);

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/services/${confirm.id}`);
      toast.success('Service removed');
      setConfirm(null);
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  if (rows === null) return <PageLoader label="Loading your services…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2>My services</h2>
          <p className="muted small mt-1">{rows.length} service{rows.length === 1 ? '' : 's'} listed</p>
        </div>
        <Link to="/dashboard/service/new" className="btn btn-primary"><Plus /> Add service</Link>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Wrench} title="No services listed yet"
               action={<Link to="/dashboard/service/new" className="btn btn-primary"><Plus /> Add your first service</Link>}>
          List what you offer — interiors, legal, loans, moving — and get discovered by home buyers.
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Service</th><th>Category</th><th>Price from</th><th>Rating</th><th>Status</th><th>Leads</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="tcell">
                      <img src={s.cover_image} alt="" />
                      <div style={{ minWidth: 0 }}>
                        <div className="nm clamp-2">{s.title}</div>
                        <div className="tiny muted">{s.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="small">{s.category}</td>
                  <td className="strong nowrap">{s.price_from > 0 ? rupees(s.price_from) : 'Free'}</td>
                  <td><Stars value={s.rating} /></td>
                  <td><span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-outline'}`}>{titleCase(s.status)}</span></td>
                  <td>
                    <span className={`badge ${s.lead_count > 0 ? 'badge-blue' : 'badge-outline'}`}>
                      <Inbox style={{ width: 12, height: 12 }} /> {s.lead_count}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link to={`/service/${s.slug || s.id}`} className="btn btn-xs btn-outline"><Eye /></Link>
                      <Link to={`/dashboard/service/${s.id}/edit`} className="btn btn-xs btn-outline"><Edit /></Link>
                      <button className="btn btn-xs btn-danger" onClick={() => setConfirm(s)}><Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <Modal title="Remove this service?" onClose={() => setConfirm(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={remove} disabled={busy}>
                     {busy ? 'Removing…' : 'Remove'}
                   </button>
                 </>
               }>
          <p><b>{confirm.title}</b> will no longer appear in search results.</p>
        </Modal>
      )}
    </div>
  );
}
