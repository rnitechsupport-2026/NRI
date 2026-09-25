import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Empty, Modal, PageLoader } from '../../components/ui.jsx';
import { timeAgo } from '../../utils/format.js';
import { Layers, Eye, Trash, Send, ArrowRight } from '../../components/Icons.jsx';

const clientOrigin = window.location.origin;

export default function MyMicrosites() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/microsites/mine')
    .then((r) => setRows(r.data.data))
    .catch(() => setRows([]));

  useEffect(() => { load(); }, []);

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/microsites/${confirm.id}`);
      toast.success('Microsite deleted');
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(row) {
    try {
      await navigator.clipboard.writeText(`${clientOrigin}/site/${row.slug}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  if (rows === null) return <PageLoader label="Loading your microsites…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2>My microsites</h2>
          <p className="muted small mt-1">{rows.length} microsite{rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Layers} title="No microsites yet">
          Post a property, then use "Create Microsite" from My Properties to build one.
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Property</th><th>Template</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="tcell">
                      {m.propertyImage && <img src={m.propertyImage} alt="" />}
                      <div className="nm clamp-2">{m.propertyTitle || 'Untitled property'}</div>
                    </div>
                  </td>
                  <td className="small muted">{m.templateId}</td>
                  <td>
                    <span className={`badge ${m.status === 'published' ? 'badge-green' : 'badge-outline'}`}>
                      {m.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="muted small nowrap">{timeAgo(m.updatedAt || m.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Link to={`/dashboard/microsites/${m.id}/build`} className="btn btn-xs btn-outline" title="Edit">
                        <ArrowRight />
                      </Link>
                      {m.status === 'published' && (
                        <>
                          <button type="button" className="btn btn-xs btn-outline" title="Copy link" onClick={() => copyLink(m)}>
                            <Send />
                          </button>
                          <a href={`${clientOrigin}/site/${m.slug}`} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline" title="View live">
                            <Eye />
                          </a>
                        </>
                      )}
                      <button type="button" className="btn btn-xs btn-danger" title="Delete" onClick={() => setConfirm(m)}>
                        <Trash />
                      </button>
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
          <p>This microsite and its published link will be removed. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
