import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { PageLoader, Notice } from '../../../components/ui.jsx';
import { timeAgo, titleCase, shortDate } from '../../../utils/format.js';
import { ChevronLeft, Shield, Document, Eye, Check, X, Clock } from '../../../components/Icons.jsx';

const TRACK_CLS = { not_submitted: 'badge-outline', submitted: 'badge-blue', under_review: 'badge-amber', verified: 'badge-green', rejected: 'badge-red', expired: 'badge-red' };
const DOC_LABEL = { gov_id: 'Government ID', pan: 'PAN card', selfie: 'Selfie', rera_certificate: 'RERA certificate', business_doc: 'Business document' };

export default function AdminAgentDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState({});

  const load = () => api.get(`/admin/agent-applications/${id}`).then((r) => setData(r.data.data)).catch(() => setData(false));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function viewDocument(doc) {
    try {
      const res = await api.get(`/admin/agent-documents/${doc.id}/file`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) { toast.error(errMsg(err, 'Could not open document')); }
  }

  async function reveal(doc) {
    try {
      const { data: r } = await api.get(`/admin/agent-documents/${doc.id}/reveal`);
      setRevealed((v) => ({ ...v, [doc.id]: r.data.idNumber || '—' }));
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function review(track, decision) {
    let reason = '';
    if (decision === 'rejected') {
      reason = window.prompt(`Reason for rejecting ${track.toUpperCase()} (shown to the agent):`) || '';
      if (!reason.trim()) return;
    }
    setBusy(true);
    try {
      await api.put(`/admin/agent-applications/${id}/${track}`, { decision, reason: reason || undefined });
      toast.success(`${track.toUpperCase()} ${decision}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  async function approve() {
    setBusy(true);
    try {
      await api.put(`/admin/agent-applications/${id}/approve`);
      toast.success('Agent approved — they can post listings now');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  async function toggleSuspend(nextStatus) {
    setBusy(true);
    try {
      await api.put(`/admin/users/${id}/status`, { status: nextStatus });
      toast.success(nextStatus === 'suspended' ? 'Agent suspended' : 'Agent reactivated');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (data === null) return <PageLoader label="Loading application…" />;
  if (data === false) return <Notice type="err">Application not found.</Notice>;

  const { profile, user, documents, history } = data;
  const canApprove = profile.kycStatus === 'verified' && profile.reraStatus === 'verified'
    && (profile.agentType === 'individual' || profile.businessStatus === 'verified')
    && profile.lifecycleStatus !== 'active';

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link to="/dashboard/admin/agents" className="row" style={{ gap: 6, width: 'fit-content' }}>
        <ChevronLeft style={{ width: 16, height: 16 }} /> <span className="small">Back to applications</span>
      </Link>

      <div className="row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="row" style={{ gap: 10 }}>
            {user.name}
            {profile.lifecycleStatus === 'active' && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified Agent</span>}
          </h2>
          <p className="muted small mt-1">{user.email} · {user.phone} · joined {shortDate(user.createdAt)}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {user.status === 'active' ? (
            <button className="btn btn-outline btn-sm" onClick={() => toggleSuspend('suspended')} disabled={busy}>Suspend</button>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => toggleSuspend('active')} disabled={busy}>Reactivate</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={approve} disabled={busy || !canApprove}>
            {profile.lifecycleStatus === 'active' ? 'Approved' : 'Approve agent'}
          </button>
        </div>
      </div>

      {!canApprove && profile.lifecycleStatus !== 'active' && (
        <Notice type="info">KYC, RERA{profile.agentType !== 'individual' ? ' and business verification' : ''} must all be marked "Verified" before you can approve this agent.</Notice>
      )}

      <div className="grid g-2">
        <div className="card card-p">
          <h3 className="mb-2">Agent profile</h3>
          <div className="spec-grid">
            <div className="spec-row"><span>Type</span><b>{titleCase(profile.agentType)}</b></div>
            {profile.companyName && <div className="spec-row"><span>Company</span><b>{profile.companyName}</b></div>}
            <div className="spec-row"><span>Office address</span><b>{profile.officeAddress || '—'}</b></div>
            <div className="spec-row"><span>Operating areas</span><b>{(profile.operatingAreas || []).join(', ') || '—'}</b></div>
            <div className="spec-row"><span>Property types</span><b>{(profile.propertyTypesHandled || []).join(', ') || '—'}</b></div>
            <div className="spec-row"><span>RERA number</span><b>{profile.reraNumber || '—'}</b></div>
            <div className="spec-row"><span>RERA registered name</span><b>{profile.reraRegisteredName || '—'}</b></div>
            <div className="spec-row"><span>RERA authority</span><b>{profile.reraAuthority || '—'}</b></div>
            <div className="spec-row"><span>RERA expiry</span><b>{profile.reraExpiryDate ? shortDate(profile.reraExpiryDate) : '—'}</b></div>
            {profile.agentType !== 'individual' && (
              <>
                <div className="spec-row"><span>Business reg. no.</span><b>{profile.businessRegNo || '—'}</b></div>
                <div className="spec-row"><span>Authorized rep</span><b>{profile.authorizedRepName || '—'}</b></div>
              </>
            )}
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          {[
            { track: 'kyc', label: 'KYC', status: profile.kycStatus },
            { track: 'rera', label: 'RERA / License', status: profile.reraStatus },
            ...(profile.agentType !== 'individual' ? [{ track: 'business', label: 'Business verification', status: profile.businessStatus }] : []),
          ].map(({ track, label, status }) => (
            <div key={track} className="card card-p">
              <div className="row-between mb-2">
                <b className="small">{label}</b>
                <span className={`badge ${TRACK_CLS[status]}`}>{status.replace('_', ' ')}</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-xs btn-primary" onClick={() => review(track, 'verified')} disabled={busy || status === 'verified'}>
                  <Check style={{ width: 12, height: 12 }} /> Verify
                </button>
                <button className="btn btn-xs btn-danger" onClick={() => review(track, 'rejected')} disabled={busy || status === 'rejected'}>
                  <X style={{ width: 12, height: 12 }} /> Reject
                </button>
                <button className="btn btn-xs btn-outline" onClick={() => review(track, 'under_review')} disabled={busy}>
                  <Clock style={{ width: 12, height: 12 }} /> Mark under review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-p">
        <h3 className="mb-2">Documents</h3>
        {documents.length === 0 ? <p className="small muted">No documents uploaded.</p> : (
          <div className="card table-wrap" style={{ boxShadow: 'none' }}>
            <table className="tbl">
              <thead><tr><th>Type</th><th>ID number</th><th>Status</th><th>Note</th><th>Uploaded</th><th></th></tr></thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td className="row" style={{ gap: 6 }}><Document style={{ width: 14, height: 14, color: 'var(--muted)' }} />{DOC_LABEL[d.type] || d.type}</td>
                    <td className="small">
                      {d.idNumber ? (revealed[d.id] || d.idNumber) : '—'}
                      {d.idNumber && !revealed[d.id] && (
                        <button className="btn btn-xs btn-ghost" onClick={() => reveal(d)} style={{ marginLeft: 6 }}>Reveal</button>
                      )}
                    </td>
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
