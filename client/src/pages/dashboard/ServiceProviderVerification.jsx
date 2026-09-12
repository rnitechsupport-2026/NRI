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
  active: 'You are an approved service provider and can post listings.',
  rejected: 'Your application was rejected. See the notes below and resubmit.',
  resubmission_required: 'Some information needs to be corrected — check the notes below and resubmit.',
  suspended: 'Your account has been suspended by an admin.',
  expired: 'Your verification has expired and needs renewal.',
};

const DOC_LABEL = {
  pan: 'PAN card', coi_incorporation: 'Incorporation / registration document', gst_certificate: 'GST certificate',
  partnership_deed: 'Partnership deed', degree_certificate: 'Degree certificate',
  registration_certificate: 'Registration certificate', license_certificate: 'Licence certificate',
  membership_certificate: 'Membership certificate', cop_certificate: 'Certificate of Practice', other: 'Document',
};

export default function ServiceProviderVerification() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);

  const load = () => Promise.all([
    api.get('/service-provider/profile').then((r) => setProfile(r.data.data)),
    api.get('/service-provider/documents').then((r) => setDocuments(r.data.data)),
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
            Service provider verification
            {isActive && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified Provider</span>}
          </h2>
          <p className="muted small mt-1">{LIFECYCLE_META[profile.lifecycleStatus]}</p>
        </div>
        {canResubmit && (
          <Link to="/register/service" className="btn btn-primary btn-sm">
            {profile.lifecycleStatus === 'draft' ? 'Complete application' : 'Resubmit application'} <ArrowRight />
          </Link>
        )}
      </div>

      <div className="grid g-2">
        <div className="card card-p">
          <div className="row-between mb-2">
            <span className="row" style={{ gap: 8 }}><Shield style={{ width: 17, height: 17, color: 'var(--gold-600)' }} /><b className="small">Identity verification</b></span>
            <span className={`badge ${(STATUS_META[profile.identityStatus] || STATUS_META.not_submitted).cls}`}>
              {(STATUS_META[profile.identityStatus] || STATUS_META.not_submitted).label}
            </span>
          </div>
          <p className="tiny muted">Legal name, entity, and PAN/GST checked against MCA/PAN records.</p>
        </div>
        <div className="card card-p">
          <div className="row-between mb-2">
            <span className="row" style={{ gap: 8 }}><Document style={{ width: 17, height: 17, color: 'var(--gold-600)' }} /><b className="small">Qualification</b></span>
            {profile.qualificationApplicable ? (
              <span className={`badge ${(STATUS_META[profile.qualificationStatus] || STATUS_META.not_submitted).cls}`}>
                {(STATUS_META[profile.qualificationStatus] || STATUS_META.not_submitted).label}
              </span>
            ) : <span className="badge badge-outline">Not required for this category</span>}
          </div>
          <p className="tiny muted">
            {profile.qualificationApplicable
              ? 'Reviewed against the professional body for your category.'
              : 'This profession has no statutory licence in India — nothing to review here.'}
          </p>
        </div>
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
