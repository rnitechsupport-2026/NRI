import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { PageLoader, Notice } from '../../../components/ui.jsx';
import { timeAgo, titleCase, shortDate } from '../../../utils/format.js';
import { ChevronLeft, Shield, Document, Eye, Check, X, Clock } from '../../../components/Icons.jsx';

const TRACK_CLS = { not_submitted: 'badge-outline', submitted: 'badge-blue', under_review: 'badge-amber', verified: 'badge-green', rejected: 'badge-red', expired: 'badge-red' };
const DOC_LABEL = {
  pan: 'PAN card', coi_incorporation: 'Incorporation / registration document', gst_certificate: 'GST certificate',
  partnership_deed: 'Partnership deed', degree_certificate: 'Degree certificate',
  registration_certificate: 'Registration certificate', license_certificate: 'Licence certificate',
  membership_certificate: 'Membership certificate', cop_certificate: 'Certificate of Practice', other: 'Document',
};

export default function AdminServiceProviderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState({});

  const load = () => api.get(`/admin/service-applications/${id}`).then((r) => setData(r.data.data)).catch(() => setData(false));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function viewDocument(doc) {
    try {
      const res = await api.get(`/admin/service-documents/${doc.id}/file`, { responseType: 'blob' });
      window.open(URL.createObjectURL(res.data), '_blank');
    } catch (err) { toast.error(errMsg(err, 'Could not open document')); }
  }

  async function reveal(doc) {
    try {
      const { data: r } = await api.get(`/admin/service-documents/${doc.id}/reveal`);
      setRevealed((v) => ({ ...v, [doc.id]: r.data.idNumber || '—' }));
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function review(track, decision) {
    let reason = '';
    if (decision === 'rejected') {
      reason = window.prompt(`Reason for rejecting ${track} (shown to the provider):`) || '';
      if (!reason.trim()) return;
    }
    setBusy(true);
    try {
      await api.put(`/admin/service-applications/${id}/${track}`, { decision, reason: reason || undefined });
      toast.success(`${titleCase(track)} ${decision}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  async function approve() {
    setBusy(true);
    try {
      await api.put(`/admin/service-applications/${id}/approve`);
      toast.success('Provider approved — they can post listings now');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  async function toggleSuspend(nextStatus) {
    setBusy(true);
    try {
      await api.put(`/admin/users/${id}/status`, { status: nextStatus });
      toast.success(nextStatus === 'suspended' ? 'Provider suspended' : 'Provider reactivated');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  }

  if (data === null) return <PageLoader label="Loading application…" />;
  if (data === false) return <Notice type="err">Application not found.</Notice>;

  const { profile, user, documents, history, categoryRule } = data;
  const qualApplicable = categoryRule?.qualificationRequirement !== 'not_applicable';
  const qualRequired = categoryRule?.qualificationRequirement === 'required';
  const canApprove = profile.identityStatus === 'verified'
    && (!qualRequired || profile.qualificationStatus === 'verified')
    && profile.lifecycleStatus !== 'active';

  return (
    <div className="stack" style={{ gap: 20 }}>
      <Link to="/dashboard/admin/service-providers" className="row" style={{ gap: 6, width: 'fit-content' }}>
        <ChevronLeft style={{ width: 16, height: 16 }} /> <span className="small">Back to applications</span>
      </Link>

      <div className="row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="row" style={{ gap: 10 }}>
            {user.name}
            {profile.lifecycleStatus === 'active' && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified Provider</span>}
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
            {profile.lifecycleStatus === 'active' ? 'Approved' : 'Approve provider'}
          </button>
        </div>
      </div>

      {!canApprove && profile.lifecycleStatus !== 'active' && (
        <Notice type="info">
          Identity{qualRequired ? ' and qualification' : ''} must be marked "Verified" before you can approve this provider.
          {!qualRequired && qualApplicable && ' Qualification is optional for this category and does not block approval.'}
        </Notice>
      )}

      {categoryRule && (
        <div className="card card-p" style={{ background: 'var(--line-2)' }}>
          <div className="row-between mb-1">
            <b className="small">{titleCase((profile.category || '').replace('_', ' '))} — what this category requires</b>
          </div>
          {qualApplicable ? (
            <p className="tiny muted">
              {categoryRule.registrationLabel} from <b>{categoryRule.authority}</b>.
              {qualRequired ? ' Required before approval.' : ' Optional — a quality signal, not a legal requirement.'}
            </p>
          ) : (
            <p className="tiny muted">No statutory qualification exists for this category — nothing to check here beyond identity.</p>
          )}
          {categoryRule.note && <p className="tiny muted mt-1">{categoryRule.note}</p>}
        </div>
      )}

      <div className="grid g-2">
        <div className="card card-p">
          <h3 className="mb-2">Identity &amp; business</h3>
          <div className="spec-grid">
            <div className="spec-row"><span>Entity type</span><b>{titleCase((profile.entityType || '').replace('_', ' '))}</b></div>
            <div className="spec-row"><span>Legal name</span><b>{profile.legalEntityName || '—'}</b></div>
            <div className="spec-row"><span>Trade name</span><b>{profile.tradeName || '—'}</b></div>
            <div className="spec-row"><span>PAN</span><b>{profile.pan || '—'}</b></div>
            <div className="spec-row"><span>GSTIN</span><b>{profile.gstin || '—'}</b></div>
            <div className="spec-row"><span>Registered address</span><b>{profile.registeredAddress || '—'}</b></div>
            {qualApplicable && (
              <>
                <div className="spec-row"><span>Registration number</span><b>{profile.professionalRegistrationNumber || '—'}</b></div>
                <div className="spec-row"><span>Issuing authority</span><b>{profile.issuingAuthority || '—'}</b></div>
                <div className="spec-row"><span>Registration date</span><b>{profile.registrationDate ? shortDate(profile.registrationDate) : '—'}</b></div>
                <div className="spec-row"><span>Expiry date</span><b>{profile.expiryDate ? shortDate(profile.expiryDate) : '—'}</b></div>
              </>
            )}
          </div>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <div className="card card-p">
            <div className="row-between mb-2">
              <b className="small">Identity</b>
              <span className={`badge ${TRACK_CLS[profile.identityStatus]}`}>{profile.identityStatus.replace('_', ' ')}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-xs btn-primary" onClick={() => review('identity', 'verified')} disabled={busy || profile.identityStatus === 'verified'}>
                <Check style={{ width: 12, height: 12 }} /> Verify
              </button>
              <button className="btn btn-xs btn-danger" onClick={() => review('identity', 'rejected')} disabled={busy || profile.identityStatus === 'rejected'}>
                <X style={{ width: 12, height: 12 }} /> Reject
              </button>
              <button className="btn btn-xs btn-outline" onClick={() => review('identity', 'under_review')} disabled={busy}>
                <Clock style={{ width: 12, height: 12 }} /> Mark under review
              </button>
            </div>
          </div>

          {qualApplicable && (
            <div className="card card-p">
              <div className="row-between mb-2">
                <b className="small">Qualification</b>
                <span className={`badge ${TRACK_CLS[profile.qualificationStatus]}`}>{profile.qualificationStatus.replace('_', ' ')}</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn-xs btn-primary" onClick={() => review('qualification', 'verified')} disabled={busy || profile.qualificationStatus === 'verified'}>
                  <Check style={{ width: 12, height: 12 }} /> Verify
                </button>
                <button className="btn btn-xs btn-danger" onClick={() => review('qualification', 'rejected')} disabled={busy || profile.qualificationStatus === 'rejected'}>
                  <X style={{ width: 12, height: 12 }} /> Reject
                </button>
                <button className="btn btn-xs btn-outline" onClick={() => review('qualification', 'under_review')} disabled={busy}>
                  <Clock style={{ width: 12, height: 12 }} /> Mark under review
                </button>
              </div>
            </div>
          )}
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
