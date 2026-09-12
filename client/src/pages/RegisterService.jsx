import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errMsg, errFields } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Field, Notice, PageLoader } from '../components/ui.jsx';
import { CITIES } from '../utils/format.js';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, ChevronLeft, Info, Upload, Document, Shield,
} from '../components/Icons.jsx';

const STEPS = ['Personal', 'Contact', 'Category', 'Identity', 'Qualification', 'Review'];

const CATEGORY_ORDER = [
  'architect', 'civil_engineer', 'contractor', 'chartered_accountant', 'advocate',
  'surveyor', 'valuer', 'pmc', 'interior_designer', 'property_management', 'facility_management', 'other',
];

const ENTITY_TYPES = [
  ['individual', 'Individual'], ['proprietorship', 'Proprietorship'], ['partnership', 'Partnership'],
  ['llp', 'LLP'], ['private_limited', 'Private Limited'], ['public_limited', 'Public Limited'],
];

const DOC_LABEL = {
  degree_certificate: 'Degree certificate', registration_certificate: 'Registration certificate',
  license_certificate: 'Licence certificate', membership_certificate: 'Membership certificate',
  cop_certificate: 'Certificate of Practice', other: 'Supporting document',
};

export default function RegisterService() {
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

  const [rules, setRules] = useState(null);
  const [profile, setProfile] = useState(null);
  const [category, setCategory] = useState('');
  const [entity, setEntity] = useState({
    entity_type: 'individual', legal_entity_name: '', trade_name: '', pan: '', gstin: '', registered_address: '',
  });
  const [qual, setQual] = useState({
    degree: '', professional_registration_number: '', license_number: '', membership_number: '',
    issuing_authority: '', registration_date: '', expiry_date: '',
  });
  const [documents, setDocuments] = useState([]);

  const rule = category && rules ? rules[category] : null;
  const qualApplicable = rule && rule.qualificationRequirement !== 'not_applicable';
  const qualRequired = rule && rule.qualificationRequirement === 'required';

  useEffect(() => {
    if (!user) { setResuming(false); return; }
    if (user.role !== 'service') { nav('/dashboard', { replace: true }); return; }

    Promise.all([
      api.get('/service-provider/category-rules').then((r) => setRules(r.data.data)),
      api.get('/service-provider/profile').then((r) => r.data.data),
    ]).then(([, p]) => {
      setProfile(p);
      setCategory(p.category || '');
      setEntity({
        entity_type: p.entityType || 'individual', legal_entity_name: p.legalEntityName || '',
        trade_name: p.tradeName || '', pan: p.pan || '', gstin: p.gstin || '', registered_address: p.registeredAddress || '',
      });
      setQual({
        degree: p.degree || '', professional_registration_number: p.professionalRegistrationNumber || '',
        license_number: p.licenseNumber || '', membership_number: p.membershipNumber || '',
        issuing_authority: p.issuingAuthority || '',
        registration_date: p.registrationDate ? p.registrationDate.slice(0, 10) : '',
        expiry_date: p.expiryDate ? p.expiryDate.slice(0, 10) : '',
      });

      if (!['draft', 'resubmission_required'].includes(p.lifecycleStatus)) {
        toast.info('Your application is already submitted.');
        nav('/dashboard/service/verification', { replace: true });
        return;
      }
      setStep(2);
      api.get('/service-provider/documents').then((dr) => setDocuments(dr.data.data)).catch(() => {});
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
        password: personal.password, role: 'service', city: personal.city || undefined,
      });
      const [r, p] = await Promise.all([
        api.get('/service-provider/category-rules'),
        api.get('/service-provider/profile'),
      ]);
      setRules(r.data.data);
      setProfile(p.data.data);
      toast.success('Account created — let\'s verify your credentials.');
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
      const r = await api.put('/service-provider/profile', patch);
      setProfile(r.data.data);
      setStep(nextStep);
    } catch (err) {
      setError(errMsg(err));
    } finally { setBusy(false); }
  }

  function submitCategory() {
    if (!category) { setError('Choose a category to continue'); return; }
    saveProfile({ category }, 3);
  }

  function submitEntity() {
    saveProfile({
      entity_type: entity.entity_type,
      legal_entity_name: entity.legal_entity_name,
      trade_name: entity.trade_name || undefined,
      pan: entity.pan || undefined,
      gstin: entity.gstin || undefined,
      registered_address: entity.registered_address || undefined,
    }, 4);
  }

  function submitQualification() {
    saveProfile({
      degree: qual.degree || undefined,
      professional_registration_number: qual.professional_registration_number || undefined,
      license_number: qual.license_number || undefined,
      membership_number: qual.membership_number || undefined,
      issuing_authority: qual.issuing_authority || undefined,
      registration_date: qual.registration_date || undefined,
      expiry_date: qual.expiry_date || undefined,
    }, 5);
  }

  async function finalSubmit() {
    setBusy(true); setError('');
    try {
      await api.post('/service-provider/submit-for-review');
      toast.success('Application submitted for review');
      nav('/dashboard/service/verification', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally { setBusy(false); }
  }

  const docFor = (type) => documents.find((d) => d.type === type);
  const hasIdentityDoc = !!(docFor('pan') || docFor('coi_incorporation') || docFor('gst_certificate') || docFor('partnership_deed'));
  const requiredQualDocUploaded = !rule?.requiredDocTypes?.length || rule.requiredDocTypes.some((t) => docFor(t));

  // `rules` only exists once an account is registered (fetched in confirmContact
  // or the resume-effect above) — a fresh, not-yet-registered visitor must still
  // see the Personal step, so only `resuming` gates the initial loading screen.
  if (resuming) return <PageLoader label="Loading your application…" />;
  if (step >= 2 && !rules) return <PageLoader label="Loading your application…" />;

  return (
    <div className="container section-sm">
      <div className="row-between mb-3">
        <div>
          <h2>Become a verified service provider</h2>
          <p className="muted small mt-1">Complete every step below — what's asked for after Category depends on your profession, not a one-size-fits-all checklist.</p>
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

      {step === 0 && (
        <form onSubmit={submitPersonal} className="form-sec card">
          <h3>Personal details</h3>
          <p className="muted">Your name and login details.</p>
          <div className="form-grid">
            <Field label="Full name" required error={errors.name} className="full">
              <div className="input-icon"><User /><input className="input" value={personal.name} onChange={setP('name')} required /></div>
            </Field>
            <Field label="Email" required error={errors.email}>
              <div className="input-icon"><Mail /><input className="input" type="email" value={personal.email} onChange={setP('email')} required /></div>
            </Field>
            <Field label="Mobile" required error={errors.phone}>
              <div className="input-icon"><Phone /><input className="input" value={personal.phone} onChange={setP('phone')} maxLength={10} inputMode="numeric" required /></div>
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
              <div className="input-icon"><Lock /><input className="input" type={show ? 'text' : 'password'} value={personal.confirm} onChange={setP('confirm')} required /></div>
            </Field>
          </div>
          <div className="row-between mt-3">
            <span />
            <button className="btn btn-dark">Continue <ArrowRight /></button>
          </div>
        </form>
      )}

      {step === 1 && (
        <section className="form-sec card">
          <h3>Contact verification</h3>
          <div className="alert alert-info mb-3">
            <Info />
            <span>OTP verification isn't enabled on this platform yet — your registration goes to manual admin review instead. Double-check the details below are correct.</span>
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

      {step === 2 && (
        <section className="form-sec card">
          <h3>What service do you provide?</h3>
          <p className="muted">This decides what's actually asked for next — a licence check only applies where one legally exists.</p>
          <div className="pills" style={{ flexWrap: 'wrap' }}>
            {CATEGORY_ORDER.map((k) => (
              <button key={k} type="button" className={`pill ${category === k ? 'on' : ''}`} onClick={() => setCategory(k)}>
                {rules[k]?.label || k}
              </button>
            ))}
          </div>
          {category && rules[category] && (
            <div className="alert alert-info mt-3">
              <Shield />
              <span>
                {rules[category].qualificationRequirement === 'not_applicable'
                  ? `${rules[category].label} has no statutory licence in India — you'll skip the qualification step.`
                  : rules[category].qualificationRequirement === 'optional'
                  ? `A ${rules[category].registrationLabel || 'registration'} isn't legally mandatory for ${rules[category].label}, but you can add one — it strengthens your verified badge.`
                  : `${rules[category].label} requires ${rules[category].registrationLabel} from ${rules[category].authority}.`}
              </span>
            </div>
          )}
          <div className="row-between mt-3">
            <span />
            <button type="button" className="btn btn-dark" onClick={submitCategory} disabled={busy || !category}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="form-sec card">
          <h3>Identity &amp; business details</h3>
          <p className="muted">Who you are, legally — this is what your qualification documents get checked against.</p>
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
            <Field label="Legal / full name" required className="full">
              <input className="input" value={entity.legal_entity_name}
                     onChange={(e) => setEntity((d) => ({ ...d, legal_entity_name: e.target.value }))} />
            </Field>
            <Field label="Trade / firm name" hint="If different from your legal name">
              <input className="input" value={entity.trade_name}
                     onChange={(e) => setEntity((d) => ({ ...d, trade_name: e.target.value }))} />
            </Field>
            <Field label="PAN">
              <input className="input" value={entity.pan}
                     onChange={(e) => setEntity((d) => ({ ...d, pan: e.target.value.toUpperCase() }))} maxLength={10} placeholder="ABCDE1234F" />
            </Field>
            <Field label="GSTIN">
              <input className="input" value={entity.gstin}
                     onChange={(e) => setEntity((d) => ({ ...d, gstin: e.target.value.toUpperCase() }))} maxLength={15} placeholder="33ABCDE1234F1Z5" />
            </Field>
            <Field label="Registered / business address" className="full">
              <input className="input" value={entity.registered_address}
                     onChange={(e) => setEntity((d) => ({ ...d, registered_address: e.target.value }))} />
            </Field>
          </div>
          <div className="mt-2">
            <DocUploader type="pan" label="PAN card" required withIdNumber existing={docFor('pan')}
                         onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
            {entity.entity_type !== 'individual' && (
              <div className="mt-2">
                <DocUploader type="coi_incorporation" label="Incorporation / registration document"
                             existing={docFor('coi_incorporation')} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
              </div>
            )}
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={submitEntity} disabled={busy || !entity.legal_entity_name || !hasIdentityDoc}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
          {!hasIdentityDoc && <p className="tiny muted mt-2">Upload your PAN card to continue.</p>}
        </section>
      )}

      {step === 4 && (
        <section className="form-sec card">
          <h3>Qualification — {rule?.label}</h3>
          {!qualApplicable ? (
            <div className="alert alert-info">
              <Shield />
              <span>{rule?.label} has no statutory qualification or licence in India. Nothing to upload here — continue to review.</span>
            </div>
          ) : (
            <>
              <div className="alert alert-info mb-3">
                <Shield />
                <span>An admin manually reviews this against {rule?.authority || 'the relevant authority'} — a document upload alone is never treated as "officially verified."</span>
              </div>
              <div className="form-grid">
                <Field label={rule?.registrationLabel || 'Registration number'}>
                  <input className="input" value={qual.professional_registration_number}
                         onChange={(e) => setQual((q) => ({ ...q, professional_registration_number: e.target.value }))} />
                </Field>
                <Field label="Issuing authority">
                  <input className="input" value={qual.issuing_authority} placeholder={rule?.authority || ''}
                         onChange={(e) => setQual((q) => ({ ...q, issuing_authority: e.target.value }))} />
                </Field>
                <Field label="Registration date"><input className="input" type="date" value={qual.registration_date}
                  onChange={(e) => setQual((q) => ({ ...q, registration_date: e.target.value }))} /></Field>
                <Field label="Expiry / renewal date"><input className="input" type="date" value={qual.expiry_date}
                  onChange={(e) => setQual((q) => ({ ...q, expiry_date: e.target.value }))} /></Field>
              </div>
              <div className="stack mt-2" style={{ gap: 14 }}>
                {(rule?.docTypes || []).map((t) => (
                  <DocUploader key={t} type={t} label={DOC_LABEL[t] || t} required={rule.requiredDocTypes?.includes(t)}
                               existing={docFor(t)} onUploaded={(d) => setDocuments((ds) => [...ds, d])} />
                ))}
              </div>
            </>
          )}
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(3)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark"
                    onClick={() => qualApplicable ? saveProfile({}, 5) : setStep(5)}
                    disabled={busy || (qualRequired && !requiredQualDocUploaded)}>
              {busy ? <><span className="spinner" /> Saving…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
          {qualRequired && !requiredQualDocUploaded && <p className="tiny muted mt-2">Upload the required document(s) above to continue.</p>}
        </section>
      )}

      {step === 5 && (
        <section className="form-sec card">
          <h3>Review &amp; submit</h3>
          <p className="muted">Once submitted, an admin reviews your identity{qualApplicable ? ' and qualification' : ''} — you'll be notified either way.</p>
          <div className="spec-grid">
            <div className="spec-row"><span>Category</span><b>{rule?.label}</b></div>
            <div className="spec-row"><span>Legal name</span><b>{entity.legal_entity_name || '—'}</b></div>
            <div className="spec-row"><span>Identity document</span><b>{hasIdentityDoc ? 'Uploaded' : '—'}</b></div>
            <div className="spec-row"><span>Qualification</span><b>{!qualApplicable ? 'Not applicable' : requiredQualDocUploaded ? 'Uploaded' : 'Optional — not uploaded'}</b></div>
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(4)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={finalSubmit} disabled={busy}>
              {busy ? <><span className="spinner" /> Submitting…</> : <>Submit for review <ArrowRight /></>}
            </button>
          </div>
        </section>
      )}

      {step === 0 && (
        <p className="center small muted mt-3">
          Already have an account? <Link to="/login?role=service" className="gold strong">Login here</Link>
        </p>
      )}
    </div>
  );
}

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
      const { data } = await api.post('/service-provider/documents', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(data.data);
      setFile(null);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(errMsg(err, 'Upload failed'));
    } finally { setBusy(false); }
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
