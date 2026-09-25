import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../../components/ui.jsx';
import { timeAgo, titleCase, PORTAL_LABEL } from '../../../utils/format.js';
import { Layers, Eye, Trash, Shield } from '../../../components/Icons.jsx';

const clientOrigin = window.location.origin;

export default function AdminMicrosites() {
  const { isAdmin, managedPortals } = useAuth();
  const toast = useToast();
  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : managedPortals;

  const [portal, setPortal] = useState(portals[0] || '');
  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!portal) { setRows([]); return; }
    api.get('/admin/microsites', { params: { portal } }).then((r) => setRows(r.data.data)).catch(() => setRows([]));
  };
  useEffect(() => { setRows(null); load(); }, [portal]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleStatus(row) {
    const next = row.status === 'published' ? 'draft' : 'published';
    try {
      await api.put(`/admin/microsites/${row.id}/status`, { status: next });
      toast.success(next === 'published' ? 'Microsite published' : 'Microsite unpublished');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/microsites/${confirm.id}`);
      toast.success('Microsite deleted');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (!portals.length) {
    return <Empty icon={Shield} title="No portal assigned yet">You're not in charge of any portal.</Empty>;
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Manage microsites</h2>
        <p className="muted small mt-1">Every microsite built across listers — publish, unpublish or remove.</p>
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

      {rows === null ? <PageLoader label="Loading microsites…" /> : rows.length === 0 ? (
        <Empty icon={Layers} title="No microsites in this portal yet" />
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Property</th><th>Created by</th><th>Template</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="nm clamp-2">{m.propertyTitle || 'Untitled property'}</td>
                  <td className="small">{m.createdByName}<div className="tiny muted">{titleCase(m.createdByRole || '')}</div></td>
                  <td className="small muted">{m.templateId}</td>
                  <td>
                    <span className={`badge ${m.status === 'published' ? 'badge-green' : 'badge-outline'}`}>
                      {m.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="muted small nowrap">{timeAgo(m.publishedAt || m.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {m.status === 'published' && (
                        <a href={`${clientOrigin}/site/${m.slug}`} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline" title="View live"><Eye /></a>
                      )}
                      <button className="btn btn-xs btn-outline" onClick={() => toggleStatus(m)}>
                        {m.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="btn btn-xs btn-danger" title="Delete" onClick={() => setConfirm(m)}><Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <Modal title="Delete this microsite?" onClose={() => setConfirm(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={remove} disabled={busy}>
                     {busy ? <><span className="spinner spinner-dark" /> Deleting…</> : 'Delete permanently'}
                   </button>
                 </>
               }>
          <p><b>{confirm.propertyTitle}</b>'s microsite will be removed. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
