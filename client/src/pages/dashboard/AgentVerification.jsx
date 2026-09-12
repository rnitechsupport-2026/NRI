import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import { PageLoader, Notice } from '../../components/ui.jsx';
import { Shield, Document, Check, Clock, Alert, ArrowRight } from '../../components/Icons.jsx';

const STATUS_META = {
  not_submitted: { label: 'Not submitted', cls: 'badge-outline' },
  submitted: { label: 'Submitted', cls: 'badge-blue' },
  under_review: { label: 'Under review', cls: 'badge-amber' },
  verified: { label: 'Verified', cls: 'badge-green' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
  expired: { label: 'Expired', cls: 'badge-red' },
};

const LIFECYCLE_META = {
  draft: 'Complete your application to submit it for review.',
  submitted: 'Your application is in the queue for admin review.',
  under_review: 'An admin is currently reviewing your documents.',
  verified: 'Your documents are verified — final approval is pending.',
  active: 'You are a verified agent and can post listings.',
  rejected: 'Your application was rejected. See the notes below and resubmit.',
  resubmission_required: 'Some information needs to be corrected — check the notes below and resubmit.',
  suspended: 'Your account has been suspended by an admin.',
  expired: 'Your verification has expired and needs renewal.',
};

const DOC_LABEL = { gov_id: 'Government ID', pan: 'PAN card', selfie: 'Selfie', rera_certificate: 'RERA certificate', business_doc: 'Business document' };

export default function AgentVerification() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);

  const load = () => Promise.all([
    api.get('/agent/profile').then((r) => setProfile(r.data.data)),
    api.get('/agent/documents').then((r) => setDocuments(r.data.data)),
  ]);

  useEffect(() => { load(); }, []);

  if (!profile) return <PageLoader label="Loading verification status…" />;

  const canResubmit = ['draft', 'resubmission_required'].includes(profile.lifecycleStatus);
  const isActive = profile.lifecycleStatus === 'active';

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 className="row" style={{ gap: 10 }}>
            Agent verification
            {isActive && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified Agent</span>}
          </h2>
          <p className="muted small mt-1">{LIFECYCLE_META[profile.lifecycleStatus]}</p>
        </div>
        {canResubmit && (
          <Link to="/register/agent" className="btn btn-primary btn-sm">
            {profile.lifecycleStatus === 'draft' ? 'Complete application' : 'Resubmit application'} <ArrowRight />
          </Link>
        )}
      </div>

      <div className="grid g-3">
        {[
          { key: 'kycStatus', label: 'KYC', icon: Shield },
          { key: 'reraStatus', label: 'RERA / License', icon: Document },
          { key: 'businessStatus', label: 'Business verification', icon: Check, hide: profile.agentType === 'individual' },
        ].filter((c) => !c.hide).map(({ key, label, icon: Icon }) => {
          const meta = STATUS_META[profile[key]] || STATUS_META.not_submitted;
          return (
            <div key={key} className="card card-p">
              <div className="row-between mb-2">
                <span className="row" style={{ gap: 8 }}><Icon style={{ width: 17, height: 17, color: 'var(--gold-600)' }} /><b className="small">{label}</b></span>
                <span className={`badge ${meta.cls}`}>{meta.label}</span>
              </div>
              <p className="tiny muted">
                {profile[key] === 'verified' ? 'Reviewed and approved by an admin.'
                  : profile[key] === 'rejected' ? 'See document notes below for what to fix.'
                  : profile[key] === 'under_review' ? 'Waiting on admin review.'
                  : 'Upload documents in the application to start this check.'}
              </p>
            </div>
          );
        })}
      </div>

      {profile.lifecycleStatus === 'resubmission_required' && (
        <Notice type="err">
          One or more sections were rejected — check the notes on each document below, then resubmit your application.
        </Notice>
      )}

      <div className="card card-p">
        <h3 className="mb-2">Profile completion</h3>
        <div className="score-bar"><span className="score-fill temp-fill-warm" style={{ width: `${profile.completionPct}%` }} /></div>
        <p className="tiny muted mt-1">{profile.completionPct}% complete</p>
      </div>

      <div className="card card-p">
        <h3 className="mb-2">Your documents</h3>
        {documents.length === 0 ? (
          <p className="small muted">No documents uploaded yet.</p>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {documents.map((d) => (
              <div key={d.id} className="row-between" style={{ borderBottom: '1px solid var(--line-2)', paddingBottom: 10 }}>
                <div>
                  <div className="small strong">{DOC_LABEL[d.type] || d.type}</div>
                  {d.reviewNote && (
                    <div className="tiny" style={{ color: d.status === 'rejected' ? 'var(--red)' : 'var(--muted)' }}>
                      <Alert style={{ width: 11, height: 11, display: 'inline' }} /> {d.reviewNote}
                    </div>
                  )}
                </div>
                <span className={`badge ${d.status === 'verified' ? 'badge-green' : d.status === 'rejected' ? 'badge-red' : 'badge-outline'}`}>
                  {d.status === 'verified' ? <Check style={{ width: 11, height: 11 }} /> : d.status === 'rejected' ? null : <Clock style={{ width: 11, height: 11 }} />}
                  {' '}{d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
