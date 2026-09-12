import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { PageLoader, Notice } from '../../../components/ui.jsx';
import { timeAgo, titleCase } from '../../../utils/format.js';
import { ChevronLeft, Document, Eye, Check, X, Clock, Alert } from '../../../components/Icons.jsx';

const STATUS_CLS = { not_submitted: 'badge-outline', submitted: 'badge-blue', under_review: 'badge-amber', verified: 'badge-green', rejected: 'badge-red' };
const DOC_LABEL = { rera_certificate: 'RERA registration certificate', jda_poa: 'JDA / POA', encumbrance_certificate: 'Encumbrance Certificate', approval_doc: 'Government approval', other: 'Document' };

export default function AdminProjectVerification() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/projects/${id}`).then((r) => setData(r.data.data)).catch(() => setData(false));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function viewDocument(doc) {
    try {
      const res = await api.get(`/admin/project-documents/${doc.id}/file`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) { toast.error(errMsg(err, 'Could not open document')); }
  }

  async function review(decision) {
    let reason = '';
    if (decision === 'rejected') {
      reason = window.prompt('Reason for rejecting this project\'s verification (shown to the builder):') || '';
      if (!reason.trim()) return;
    }
    setBusy(true);
    try {
      await api.put(`/admin/projects/${id}/verification`, { decision, reason: reason || undefined });
      toast.success(`Project verification ${decision}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (data === null) return <PageLoader label="Loading project…" />;
  if (data === false) return <Notice type="err">Project not found.</Notice>;

  const { project, builderLegalName, nameMismatch, documents, history } = data;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link to="/dashboard/admin/projects" className="row" style={{ gap: 6, width: 'fit-content' }}>
        <ChevronLeft style={{ width: 16, height: 16 }} /> <span className="small">Back to projects</span>
      </Link>

      <div className="row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2>{project.name}</h2>
          <p className="muted small mt-1">{project.locality}, {project.city}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className={`badge ${STATUS_CLS[project.verificationStatus]}`}>{project.verificationStatus.replace('_', ' ')}</span>
        </div>
      </div>

      {nameMismatch && (
        <Notice type="err">
          <Alert style={{ width: 14, height: 14, display: 'inline', marginRight: 4 }} />
          Name mismatch: the RERA promoter name on this project (<b>{project.reraPromoterName || '—'}</b>) does not match the builder's
          registered legal entity name (<b>{builderLegalName || '—'}</b>). Confirm which entity actually holds the RERA registration before verifying.
        </Notice>
      )}

      <div className="grid g-2">
        <div className="card card-p">
          <h3 className="mb-2">RERA &amp; land details</h3>
          <div className="spec-grid">
            <div className="spec-row"><span>RERA number</span><b>{project.reraNo || '—'}</b></div>
            <div className="spec-row"><span>RERA promoter name</span><b>{project.reraPromoterName || '—'}</b></div>
            <div className="spec-row"><span>Builder's legal entity name</span><b>{builderLegalName || '—'}</b></div>
            <div className="spec-row"><span>Survey numbers</span><b>{(project.surveyNumbers || []).join(', ') || '—'}</b></div>
            <div className="spec-row"><span>Village / Taluk / District</span><b>{[project.village, project.taluk, project.district].filter(Boolean).join(' / ') || '—'}</b></div>
            <div className="spec-row"><span>Land ownership</span><b>{project.landOwnershipType ? titleCase(project.landOwnershipType.replace('_', ' ')) : '—'}</b></div>
            {project.landOwnershipType === 'jda_poa' && (
              <div className="spec-row"><span>Landowner name</span><b>{project.landownerName || '—'}</b></div>
            )}
          </div>
        </div>

        <div className="card card-p">
          <div className="row-between mb-2">
            <b className="small">Verification decision</b>
            <span className={`badge ${STATUS_CLS[project.verificationStatus]}`}>{project.verificationStatus.replace('_', ' ')}</span>
          </div>
          <p className="tiny muted mb-2">Cross-check the RERA promoter name, survey numbers, and documents below before verifying this project.</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-xs btn-primary" onClick={() => review('verified')} disabled={busy || project.verificationStatus === 'verified'}>
              <Check style={{ width: 12, height: 12 }} /> Verify
            </button>
            <button className="btn btn-xs btn-danger" onClick={() => review('rejected')} disabled={busy || project.verificationStatus === 'rejected'}>
              <X style={{ width: 12, height: 12 }} /> Reject
            </button>
            <button className="btn btn-xs btn-outline" onClick={() => review('under_review')} disabled={busy}>
              <Clock style={{ width: 12, height: 12 }} /> Mark under review
            </button>
          </div>
        </div>
      </div>

      <div className="card card-p">
        <h3 className="mb-2">Documents</h3>
        {documents.length === 0 ? <p className="small muted">No documents uploaded.</p> : (
          <div className="card table-wrap" style={{ boxShadow: 'none' }}>
            <table className="tbl">
              <thead><tr><th>Type</th><th>Status</th><th>Note</th><th>Uploaded</th><th></th></tr></thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td className="row" style={{ gap: 6 }}><Document style={{ width: 14, height: 14, color: 'var(--muted)' }} />{DOC_LABEL[d.type] || d.type}</td>
                    <td><span className={`badge ${d.status === 'verified' ? 'badge-green' : d.status === 'rejected' ? 'badge-red' : 'badge-outline'}`}>{d.status}</span></td>
                    <td className="tiny muted">{d.reviewNote || '—'}</td>
                    <td className="muted small nowrap">{timeAgo(d.createdAt)}</td>
                    <td><button className="btn btn-xs btn-outline" onClick={() => viewDocument(d)}><Eye style={{ width: 12, height: 12 }} /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card card-p">
        <h3 className="mb-2">Verification history</h3>
        {history.length === 0 ? <p className="small muted">No admin actions yet.</p> : (
          <ul className="stack" style={{ gap: 10 }}>
            {history.map((h) => (
              <li key={h.id} className="row-between" style={{ borderBottom: '1px solid var(--line-2)', paddingBottom: 8 }}>
                <div>
                  <div className="small strong">{h.action.replace(/_/g, ' ')}{h.previousStatus ? ` — ${h.previousStatus} → ${h.newStatus}` : ''}</div>
                  {h.reason && <div className="tiny muted">{h.reason}</div>}
                </div>
                <div className="tiny muted nowrap">{h.adminName} · {timeAgo(h.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
