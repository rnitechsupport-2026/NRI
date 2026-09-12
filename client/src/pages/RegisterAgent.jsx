import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg, errFields } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Notice, PageLoader } from '../components/ui.jsx';
import { CITIES } from '../utils/format.js';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, Check, ArrowRight, ChevronLeft,
  Shield, Info, Upload, Document,
} from '../components/Icons.jsx';

const STEPS = ['Personal', 'Contact', 'Agent Details', 'KYC', 'RERA', 'Business', 'Review'];

const PROPERTY_TYPES = [
  { key: 'residential', label: 'Residential' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'land', label: 'Land / Plots' },
  { key: 'rental', label: 'Rental' },
  { key: 'industrial', label: 'Industrial' },
  { key: 'other', label: 'Other' },
];

const TRACK_LABEL = { not_submitted: 'Not submitted', submitted: 'Submitted', under_review: 'Under review', verified: 'Verified', rejected: 'Rejected', expired: 'Expired' };

export default function RegisterAgent() {
  const nav = useNavigate();
  const { user, register: doRegister } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [resuming, setResuming] = useState(true);

  const [personal, setPersonal] = useState({
    name: '', email: '', phone: '', password: '', confirm: '', city: '', preferred_language: '',
  });
  const [show, setShow] = useState(false);

  const [profile, setProfile] = useState(null);
  const [details, setDetails] = useState({
    agent_type: 'individual', company_name: '', office_address: '', operating_areas: '', property_types_handled: [],
  });
  const [rera, setRera] = useState({ rera_number: '', rera_registered_name: '', rera_authority: '', rera_expiry_date: '' });
  const [business, setBusiness] = useState({ business_reg_no: '', authorized_rep_name: '' });
  const [documents, setDocuments] = useState([]);

  const isPro = details.agent_type !== 'individual';
  const visibleSteps = isPro ? STEPS : STEPS.filter((s) => s !== 'Business');

  // Resume an in-progress application, or bounce non-agents / completed agents away.
  useEffect(() => {
    if (!user) { setResuming(false); return; }
    if (user.role !== 'agent') { nav('/dashboard', { replace: true }); return; }

    api.get('/agent/profile').then((r) => {
      const p = r.data.data;
      setProfile(p);
      setDetails((d) => ({
        ...d,
        agent_type: p.agentType || 'individual',
        company_name: p.companyName || '',
        office_address: p.officeAddress || '',
        operating_areas: (p.operatingAreas || []).join(', '),
        property_types_handled: p.propertyTypesHandled || [],
      }));
      setRera({
        rera_number: p.reraNumber || '', rera_registered_name: p.reraRegisteredName || '',
        rera_authority: p.reraAuthority || '', rera_expiry_date: p.reraExpiryDate ? p.reraExpiryDate.slice(0, 10) : '',
      });
      setBusiness({ business_reg_no: p.businessRegNo || '', authorized_rep_name: p.authorizedRepName || '' });

      if (!['draft', 'resubmission_required'].includes(p.lifecycleStatus)) {
        toast.info('Your application is already submitted.');
        nav('/dashboard/agent/verification', { replace: true });
        return;
      }
      setStep(2); // account already exists — skip Personal/Contact
      api.get('/agent/documents').then((dr) => setDocuments(dr.data.data)).catch(() => {});
    }).finally(() => setResuming(false));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setP = (k) => (e) => setPersonal((f) => ({ ...f, [k]: e.target.value }));

  async function submitPersonal(e) {
    e.preventDefault();
    if (personal.password !== personal.confirm) { setErrors({ confirm: 'Passwords do not match' }); return; }
    setStep(1);
  }

  async function confirmContact() {
    setBusy(true); setError(''); setErrors({});
    try {
      await doRegister({
        name: personal.name.trim(), email: personal.email.trim(), phone: personal.phone.trim(),
        password: personal.password, role: 'agent', city: personal.city || undefined,
      });
      const r = await api.get('/agent/profile');
      setProfile(r.data.data);
      toast.success('Account created — let\'s finish your agent profile.');
      setStep(2);
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
      setStep(0);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(patch, nextStep) {
    setBusy(true); setError('');
    try {
      const r = await api.put('/agent/profile', patch);
      setProfile(r.data.data);
      setStep(nextStep);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  function submitDetails() {
    saveProfile({
      agent_type: details.agent_type,
      company_name: details.company_name || undefined,
      office_address: details.office_address || undefined,
      operating_areas: details.operating_areas.split(',').map((s) => s.trim()).filter(Boolean),
      property_types_handled: details.property_types_handled,
      preferred_language: personal.preferred_language || undefined,
    }, 3);
  }

  function submitRera() {
    saveProfile({
      rera_number: rera.rera_number || undefined,
      rera_registered_name: rera.rera_registered_name || undefined,
      rera_authority: rera.rera_authority || undefined,
      rera_expiry_date: rera.rera_expiry_date || undefined,
    }, isPro ? 5 : 6);
  }

  function submitBusiness() {
    saveProfile({
      business_reg_no: business.business_reg_no || undefined,
      authorized_rep_name: business.authorized_rep_name || undefined,
    }, 6);
  }

  async function finalSubmit() {
    setBusy(true); setError('');
    try {
      await api.post('/agent/submit-for-review');
      toast.success('Application submitted for review');
      nav('/dashboard/agent/verification', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  const docFor = (type) => documents.find((d) => d.type === type);

  if (resuming) return <PageLoader label="Loading your application…" />;

  return (
    <div className="container section-sm">
      <div className="row-between mb-3">
        <div>
          <h2>Become a verified agent</h2>
          <p className="muted small mt-1">Complete every step below — an admin reviews your KYC and RERA details before you can post listings.</p>
        </div>
      </div>

      <div className="steps">
        {visibleSteps.map((s) => {
          const i = STEPS.indexOf(s);
          return (
            <button key={s} type="button" className={`step ${step === i ? 'on' : ''} ${step > i ? 'done' : ''}`}
                    onClick={() => step > i && setStep(i)} disabled={step < i}>
              <span className="n">{step > i ? '✓' : i + 1}</span> {s}
            </button>
          );
        })}
      </div>

      {error && <div className="mb-2"><Notice type="err">{error}</Notice></div>}

      {/* ---------------------------------------------------- 1 personal */}
      {step === 0 && (
        <form onSubmit={submitPersonal} className="form-sec card">
          <h3>Personal details</h3>
          <p className="muted">Your name and login details.</p>
          <div className="form-grid">
            <Field label="Full name" required error={errors.name} className="full">
              <div className="input-icon"><User />
                <input className="input" value={personal.name} onChange={setP('name')} required />
              </div>
            </Field>
            <Field label="Email" required error={errors.email}>
              <div className="input-icon"><Mail />
                <input className="input" type="email" value={personal.email} onChange={setP('email')} required />
              </div>
            </Field>
            <Field label="Mobile" required error={errors.phone}>
              <div className="input-icon"><Phone />
                <input className="input" value={personal.phone} onChange={setP('phone')} maxLength={10} inputMode="numeric" required />
              </div>
            </Field>
            <Field label="City">
              <select className="select" value={personal.city} onChange={setP('city')}>
                <option value="">Select your city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Preferred language">
              <input className="input" value={personal.preferred_language} onChange={setP('preferred_language')} placeholder="e.g. Tamil, English" />
            </Field>
            <Field label="Password" required error={errors.password} hint="Minimum 6 characters">
              <div className="input-icon"><Lock />
                <input className="input" type={show ? 'text' : 'password'} value={personal.password}
                       onChange={setP('password')} minLength={6} required style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toggle password"
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  {show ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                </button>
              </div>
            </Field>
            <Field label="Confirm password" required error={errors.confirm}>
              <div className="input-icon"><Lock />
                <input className="input" type={show ? 'text' : 'password'} value={personal.confirm} onChange={setP('confirm')} required />
              </div>
            </Field>
          </div>
          <div className="row-between mt-3">
            <span />
            <button className="btn btn-dark">Continue <ArrowRight /></button>
          </div>
        </form>
      )}

      {/* --------------------------------------------------- 2 contact */}
      {step === 1 && (
        <section className="form-sec card">
          <h3>Contact verification</h3>
          <div className="alert alert-info mb-3">
            <Info />
            <span>
              OTP verification for mobile/email isn't enabled on this platform yet (no SMS/email provider is configured).
              Your registration goes to manual admin review instead — double-check the details below are correct.
            </span>
          </div>
          <div className="form-grid">
            <Field label="Email"><input className="input" value={personal.email} disabled /></Field>
            <Field label="Mobile"><input className="input" value={personal.phone} disabled /></Field>
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(0)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={confirmContact} disabled={busy}>
              {busy ? <><span className="spinner" /> Creating account…</> : <>Confirm &amp; continue <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ 3 agent details */}
      {step === 2 && (
        <section className="form-sec card">
          <h3>Agent / business details</h3>
          <p className="muted">Who you are and what you handle.</p>
          <div className="form-grid">
            <div className="full">
              <Field label="Agent type" required>
                <div className="pills">
                  {[['individual', 'Individual Agent'], ['agency', 'Agency Agent'], ['company', 'Company Representative']].map(([k, l]) => (
                    <button key={k} type="button" className={`pill ${details.agent_type === k ? 'on' : ''}`}
                            onClick={() => setDetails((d) => ({ ...d, agent_type: k }))}>{l}</button>
                  ))}
                </div>
              </Field>
            </div>
            {isPro && (
              <Field label="Agency / company name" required className="full">
                <input className="input" value={details.company_name}
                       onChange={(e) => setDetails((d) => ({ ...d, company_name: e.target.value }))} />
              </Field>
            )}
            <Field label="Office address" className="full">
              <input className="input" value={details.office_address}
                     onChange={(e) => setDetails((d) => ({ ...d, office_address: e.target.value }))} />
            </Field>
            <Field label="Areas of operation" hint="Comma separated, e.g. Adyar, Velachery" className="full">
              <input className="input" value={details.operating_areas}
                     onChange={(e) => setDetails((d) => ({ ...d, operating_areas: e.target.value }))} />
            </Field>
            <div className="full">
              <Field label="Property types handled" hint={`${details.property_types_handled.length} selected`}>
                <div className="pills">
                  {PROPERTY_TYPES.map((t) => (
                    <button key={t.key} type="button"
                            className={`pill ${details.property_types_handled.includes(t.key) ? 'on' : ''}`}
                            onClick={() => setDetails((d) => ({
                              ...d,
                              property_types_handled: d.property_types_handled.includes(t.key)
                                ? d.property_types_handled.filter((x) => x !== t.key)
                                : [...d.property_types_handled, t.key],
                            }))}>
                      {details.property_types_handled.includes(t.key) && <Check style={{ width: 13, height: 13 }} />} {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
          <div className="row-between mt-3">
            <span />
            <button type="button" className="btn btn-dark" onClick={submitDetails} disabled={busy}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ 4 kyc */}
      {step === 3 && (
        <section className="form-sec card">
          <h3>KYC — identity verification</h3>
          <p className="muted">Upload a government ID; PAN and a selfie are optional but speed up review.</p>
          <div className="stack" style={{ gap: 16 }}>
            <DocUploader type="gov_id" label="Government ID (Aadhaar / Passport / Voter ID / DL)" required
                         withIdNumber existing={docFor('gov_id')} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
            <DocUploader type="pan" label="PAN card" withIdNumber existing={docFor('pan')}
                         onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
            <DocUploader type="selfie" label="Selfie (liveness check)" existing={docFor('selfie')}
                         onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={() => setStep(4)} disabled={!docFor('gov_id')}>
              Continue <ArrowRight />
            </button>
          </div>
          {!docFor('gov_id') && <p className="tiny muted mt-2">Upload your government ID to continue.</p>}
        </section>
      )}

      {/* ----------------------------------------------------------- 5 rera */}
      {step === 4 && (
        <section className="form-sec card">
          <h3>RERA / license verification</h3>
          <div className="alert alert-info mb-3">
            <Shield />
            <span>An admin manually reviews your RERA number against the certificate you upload. This platform does not have an automated
              government-registry check — a document upload alone is never treated as "officially verified."</span>
          </div>
          <div className="form-grid">
            <Field label="RERA registration number"><input className="input" value={rera.rera_number}
              onChange={(e) => setRera((r) => ({ ...r, rera_number: e.target.value }))} placeholder="TN/AGENT/0000/2024" /></Field>
            <Field label="Registered name"><input className="input" value={rera.rera_registered_name}
              onChange={(e) => setRera((r) => ({ ...r, rera_registered_name: e.target.value }))} /></Field>
            <Field label="State / authority"><input className="input" value={rera.rera_authority}
              onChange={(e) => setRera((r) => ({ ...r, rera_authority: e.target.value }))} placeholder="TNRERA" /></Field>
            <Field label="Registration validity / expiry"><input className="input" type="date" value={rera.rera_expiry_date}
              onChange={(e) => setRera((r) => ({ ...r, rera_expiry_date: e.target.value }))} /></Field>
          </div>
          <div className="mt-2">
            <DocUploader type="rera_certificate" label="RERA registration certificate" required
                         existing={docFor('rera_certificate')} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(3)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={submitRera} disabled={busy || !docFor('rera_certificate')}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- 6 business */}
      {step === 5 && isPro && (
        <section className="form-sec card">
          <h3>Business verification</h3>
          <p className="muted">Required for agency and company accounts.</p>
          <div className="form-grid">
            <Field label="Business registration number"><input className="input" value={business.business_reg_no}
              onChange={(e) => setBusiness((b) => ({ ...b, business_reg_no: e.target.value }))} /></Field>
            <Field label="Authorized representative name"><input className="input" value={business.authorized_rep_name}
              onChange={(e) => setBusiness((b) => ({ ...b, authorized_rep_name: e.target.value }))} /></Field>
          </div>
          <div className="mt-2">
            <DocUploader type="business_doc" label="Business registration document" required
                         existing={docFor('business_doc')} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(4)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={submitBusiness} disabled={busy || !docFor('business_doc')}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- 7 review */}
      {step === 6 && (
        <section className="form-sec card">
          <h3>Review &amp; submit</h3>
          <p className="muted">Once submitted, an admin reviews your KYC and RERA details — you'll be notified either way.</p>
          <div className="spec-grid">
            <div className="spec-row"><span>Agent type</span><b>{details.agent_type}</b></div>
            {isPro && <div className="spec-row"><span>Company</span><b>{details.company_name || '—'}</b></div>}
            <div className="spec-row"><span>Operating areas</span><b>{details.operating_areas || '—'}</b></div>
            <div className="spec-row"><span>Property types</span><b>{details.property_types_handled.join(', ') || '—'}</b></div>
            <div className="spec-row"><span>RERA number</span><b>{rera.rera_number || '—'}</b></div>
            <div className="spec-row"><span>KYC document</span><b>{docFor('gov_id') ? TRACK_LABEL.submitted : '—'}</b></div>
            <div className="spec-row"><span>RERA certificate</span><b>{docFor('rera_certificate') ? TRACK_LABEL.submitted : '—'}</b></div>
            {isPro && <div className="spec-row"><span>Business document</span><b>{docFor('business_doc') ? TRACK_LABEL.submitted : '—'}</b></div>}
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(isPro ? 5 : 4)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={finalSubmit} disabled={busy}>
              {busy ? <><span className="spinner" /> Submitting…</> : <>Submit for review <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {step === 0 && (
        <p className="center small muted mt-3">
          Already have an account? <Link to="/login?role=agent" className="gold strong">Login here</Link>
        </p>
      )}
    </div>
  );
}

/** One document-type upload row: file input + optional ID number + status. */
function DocUploader({ type, label, required, withIdNumber, existing, onUploaded }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [idNumber, setIdNumber] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('type', type);
      form.append('file', file);
      if (withIdNumber && idNumber) form.append('id_number', idNumber);
      const { data } = await api.post('/agent/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(data.data);
      setFile(null);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(errMsg(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-p" style={{ background: 'var(--line-2)' }}>
      <div className="row-between mb-2">
        <div className="row" style={{ gap: 8 }}>
          <Document style={{ width: 17, height: 17, color: 'var(--gold-600)' }} />
          <b className="small">{label}</b>{required && <span className="req">*</span>}
        </div>
        {existing && (
          <span className={`badge ${existing.status === 'verified' ? 'badge-green' : existing.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
            {existing.status === 'submitted' ? 'Uploaded' : existing.status}
          </span>
        )}
      </div>
      {existing?.status === 'rejected' && existing.reviewNote && (
        <p className="tiny" style={{ color: 'var(--red)' }}>Rejected: {existing.reviewNote} — upload a new file to resubmit.</p>
      )}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
               onChange={(e) => setFile(e.target.files?.[0] || null)} />
        {withIdNumber && (
          <input className="input" style={{ maxWidth: 220, height: 38 }} placeholder="ID / PAN number (optional)"
                 value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        )}
        <button type="button" className="btn btn-xs btn-dark" onClick={upload} disabled={!file || busy}>
          {busy ? <span className="spinner" /> : <Upload style={{ width: 14, height: 14 }} />} {existing ? 'Replace' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
