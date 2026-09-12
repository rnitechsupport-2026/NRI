import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg, errFields } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Notice, PageLoader } from '../components/ui.jsx';
import { CITIES } from '../utils/format.js';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, ChevronLeft, Info, Upload, Document,
} from '../components/Icons.jsx';

const STEPS = ['Personal', 'Contact', 'Entity Details', 'Documents', 'Review'];

const ENTITY_TYPES = [
  ['individual', 'Individual'],
  ['proprietorship', 'Proprietorship'],
  ['partnership', 'Partnership'],
  ['llp', 'LLP'],
  ['private_limited', 'Private Limited'],
  ['public_limited', 'Public Limited'],
];

export default function RegisterBuilder() {
  const nav = useNavigate();
  const { user, register: doRegister } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [resuming, setResuming] = useState(true);

  const [personal, setPersonal] = useState({ name: '', email: '', phone: '', password: '', confirm: '', city: '' });
  const [show, setShow] = useState(false);

  const [profile, setProfile] = useState(null);
  const [entity, setEntity] = useState({
    entity_type: 'private_limited', legal_entity_name: '', trade_name: '', cin: '', llpin: '',
    pan: '', gstin: '', registered_address: '',
  });
  const [documents, setDocuments] = useState([]);

  const needsCorporateId = ['llp', 'private_limited', 'public_limited'].includes(entity.entity_type);
  const entityDocType = entity.entity_type === 'partnership' ? 'partnership_deed' : 'coi_incorporation';
  const entityDocLabel = entity.entity_type === 'partnership' ? 'Partnership deed'
    : entity.entity_type === 'individual' ? 'Government ID (Aadhaar / Passport / Voter ID)'
    : entity.entity_type === 'proprietorship' ? 'Proprietorship / GST registration proof'
    : 'Certificate of Incorporation';

  useEffect(() => {
    if (!user) { setResuming(false); return; }
    if (user.role !== 'builder') { nav('/dashboard', { replace: true }); return; }

    api.get('/builder/profile').then((r) => {
      const p = r.data.data;
      setProfile(p);
      setEntity({
        entity_type: p.entityType || 'private_limited',
        legal_entity_name: p.legalEntityName || '',
        trade_name: p.tradeName || '',
        cin: p.cin || '', llpin: p.llpin || '', pan: p.pan || '', gstin: p.gstin || '',
        registered_address: p.registeredAddress || '',
      });

      if (!['draft', 'resubmission_required'].includes(p.lifecycleStatus)) {
        toast.info('Your application is already submitted.');
        nav('/dashboard/builder/verification', { replace: true });
        return;
      }
      setStep(2); // account already exists — skip Personal/Contact
      api.get('/builder/documents').then((dr) => setDocuments(dr.data.data)).catch(() => {});
    }).finally(() => setResuming(false));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setP = (k) => (e) => setPersonal((f) => ({ ...f, [k]: e.target.value }));

  function submitPersonal(e) {
    e.preventDefault();
    if (personal.password !== personal.confirm) { setErrors({ confirm: 'Passwords do not match' }); return; }
    setStep(1);
  }

  async function confirmContact() {
    setBusy(true); setError(''); setErrors({});
    try {
      await doRegister({
        name: personal.name.trim(), email: personal.email.trim(), phone: personal.phone.trim(),
        password: personal.password, role: 'builder', city: personal.city || undefined,
      });
      const r = await api.get('/builder/profile');
      setProfile(r.data.data);
      toast.success('Account created — let\'s verify your company details.');
      setStep(2);
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
      setStep(0);
    } finally {
      setBusy(false);
    }
  }

  async function submitEntity() {
    setBusy(true); setError('');
    try {
      const r = await api.put('/builder/profile', {
        entity_type: entity.entity_type,
        legal_entity_name: entity.legal_entity_name,
        trade_name: entity.trade_name || undefined,
        cin: entity.entity_type === 'private_limited' || entity.entity_type === 'public_limited' ? entity.cin || undefined : undefined,
        llpin: entity.entity_type === 'llp' ? entity.llpin || undefined : undefined,
        pan: entity.pan || undefined,
        gstin: entity.gstin || undefined,
        registered_address: entity.registered_address || undefined,
      });
      setProfile(r.data.data);
      setStep(3);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function finalSubmit() {
    setBusy(true); setError('');
    try {
      await api.post('/builder/submit-for-review');
      toast.success('Application submitted for review');
      nav('/dashboard/builder/verification', { replace: true });
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
          <h2>Become a verified builder</h2>
          <p className="muted small mt-1">Complete every step below — an admin reviews your company/entity details before you can post projects. Each project you add afterwards needs its own RERA/land-rights verification too.</p>
        </div>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} type="button" className={`step ${step === i ? 'on' : ''} ${step > i ? 'done' : ''}`}
                  onClick={() => step > i && setStep(i)} disabled={step < i}>
            <span className="n">{step > i ? '✓' : i + 1}</span> {s}
          </button>
        ))}
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

      {/* ------------------------------------------------ 3 entity details */}
      {step === 2 && (
        <section className="form-sec card">
          <h3>Company / entity details</h3>
          <p className="muted">The legal entity behind your projects — this is what an admin cross-checks every project's RERA filing against.</p>
          <div className="form-grid">
            <div className="full">
              <Field label="Entity type" required>
                <div className="pills">
                  {ENTITY_TYPES.map(([k, l]) => (
                    <button key={k} type="button" className={`pill ${entity.entity_type === k ? 'on' : ''}`}
                            onClick={() => setEntity((d) => ({ ...d, entity_type: k }))}>{l}</button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="Legal entity name" required className="full" hint="Exact name as incorporated / registered — no abbreviations">
              <input className="input" value={entity.legal_entity_name}
                     onChange={(e) => setEntity((d) => ({ ...d, legal_entity_name: e.target.value }))}
                     placeholder="e.g. RNI Constructions Private Limited" />
            </Field>
            <Field label="Trade / brand name" hint="What you market projects under, if different">
              <input className="input" value={entity.trade_name}
                     onChange={(e) => setEntity((d) => ({ ...d, trade_name: e.target.value }))} />
            </Field>
            <Field label="PAN">
              <input className="input" value={entity.pan}
                     onChange={(e) => setEntity((d) => ({ ...d, pan: e.target.value.toUpperCase() }))} maxLength={10} placeholder="ABCDE1234F" />
            </Field>
            {needsCorporateId && entity.entity_type !== 'llp' && (
              <Field label="CIN">
                <input className="input" value={entity.cin}
                       onChange={(e) => setEntity((d) => ({ ...d, cin: e.target.value.toUpperCase() }))} placeholder="U45201TN2015PTC012345" />
              </Field>
            )}
            {entity.entity_type === 'llp' && (
              <Field label="LLPIN">
                <input className="input" value={entity.llpin}
                       onChange={(e) => setEntity((d) => ({ ...d, llpin: e.target.value.toUpperCase() }))} placeholder="AAA-1234" />
              </Field>
            )}
            <Field label="GSTIN">
              <input className="input" value={entity.gstin}
                     onChange={(e) => setEntity((d) => ({ ...d, gstin: e.target.value.toUpperCase() }))} maxLength={15} placeholder="33ABCDE1234F1Z5" />
            </Field>
            <Field label="Registered office address" className="full">
              <input className="input" value={entity.registered_address}
                     onChange={(e) => setEntity((d) => ({ ...d, registered_address: e.target.value }))} />
            </Field>
          </div>
          <div className="row-between mt-3">
            <span />
            <button type="button" className="btn btn-dark" onClick={submitEntity} disabled={busy || !entity.legal_entity_name}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- 4 documents */}
      {step === 3 && (
        <section className="form-sec card">
          <h3>Identity &amp; entity documents</h3>
          <p className="muted">Upload PAN and your entity's registration document — an admin manually verifies these against the details you entered.</p>
          <div className="stack" style={{ gap: 16 }}>
            <DocUploader type="pan" label="PAN card" withIdNumber existing={docFor('pan')}
                         onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
            <DocUploader type={entityDocType} label={entityDocLabel} required
                         existing={docFor(entityDocType)} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
            {entity.gstin && (
              <DocUploader type="gst_certificate" label="GST registration certificate"
                           existing={docFor('gst_certificate')} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
            )}
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={() => setStep(4)} disabled={!docFor(entityDocType)}>
              Continue <ArrowRight />
            </button>
          </div>
          {!docFor(entityDocType) && <p className="tiny muted mt-2">Upload your {entityDocLabel.toLowerCase()} to continue.</p>}
        </section>
      )}

      {/* -------------------------------------------------------- 5 review */}
      {step === 4 && (
        <section className="form-sec card">
          <h3>Review &amp; submit</h3>
          <p className="muted">Once submitted, an admin reviews your company/entity details — you'll be notified either way. You can then add projects, each needing its own RERA/land-rights verification.</p>
          <div className="spec-grid">
            <div className="spec-row"><span>Entity type</span><b>{entity.entity_type.replace('_', ' ')}</b></div>
            <div className="spec-row"><span>Legal entity name</span><b>{entity.legal_entity_name || '—'}</b></div>
            <div className="spec-row"><span>Trade name</span><b>{entity.trade_name || '—'}</b></div>
            <div className="spec-row"><span>PAN document</span><b>{docFor('pan') ? 'Uploaded' : '—'}</b></div>
            <div className="spec-row"><span>{entityDocLabel}</span><b>{docFor(entityDocType) ? 'Uploaded' : '—'}</b></div>
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(3)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={finalSubmit} disabled={busy}>
              {busy ? <><span className="spinner" /> Submitting…</> : <>Submit for review <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {step === 0 && (
        <p className="center small muted mt-3">
          Already have an account? <Link to="/login?role=builder" className="gold strong">Login here</Link>
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
      const { data } = await api.post('/builder/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
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
