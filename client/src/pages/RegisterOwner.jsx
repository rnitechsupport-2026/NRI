import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errMsg, errFields } from '../api/client.js';
import { Field, Notice, PageLoader } from '../components/ui.jsx';
import { CITIES, TYPE_LABEL, PURPOSE_LABEL } from '../utils/format.js';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, Check, ArrowRight, ChevronLeft, Key,
} from '../components/Icons.jsx';

const STEPS = ['Basic details', 'Your property', 'Review'];

const PURPOSE_OPTIONS = [
  { key: 'sale', label: 'Sell' },
  { key: 'rent', label: PURPOSE_LABEL.rent },
  { key: 'pg', label: PURPOSE_LABEL.pg },
  { key: 'lease', label: PURPOSE_LABEL.lease },
];

const PROPERTY_TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([key, label]) => ({ key, label }));

export default function RegisterOwner() {
  const nav = useNavigate();
  const { user, register: doRegister } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [resuming, setResuming] = useState(true);
  const [show, setShow] = useState(false);

  const [personal, setPersonal] = useState({
    name: '', email: '', phone: '', password: '', confirm: '', city: '',
  });
  const [listing, setListing] = useState({ purpose: 'sale', type: '', locality: '' });

  // An owner who's already logged in doesn't need to register again — skip
  // straight to the "what are you listing" step. Anyone else gets bounced.
  useEffect(() => {
    if (!user) { setResuming(false); return; }
    if (user.role !== 'owner') { nav('/dashboard', { replace: true }); return; }
    setPersonal((f) => ({ ...f, city: user.city || f.city }));
    setStep(1);
    setResuming(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const setP = (k) => (e) => setPersonal((f) => ({ ...f, [k]: e.target.value }));

  async function submitPersonal(e) {
    e.preventDefault();
    if (personal.password !== personal.confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    setBusy(true); setError(''); setErrors({});
    try {
      const created = await doRegister({
        name: personal.name.trim(), email: personal.email.trim(), phone: personal.phone.trim(),
        password: personal.password, role: 'owner', city: personal.city || undefined,
      });
      toast.success(`Account created. Welcome, ${created.name.split(' ')[0]}!`);
      setStep(1);
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
    } finally {
      setBusy(false);
    }
  }

  function goToPropertyForm() {
    const q = new URLSearchParams();
    q.set('purpose', listing.purpose);
    if (listing.type) q.set('type', listing.type);
    if (personal.city) q.set('city', personal.city);
    if (listing.locality) q.set('locality', listing.locality);
    nav(`/dashboard/property/new?${q.toString()}`);
  }

  if (resuming) return <PageLoader label="Loading…" />;

  return (
    <div className="container section-sm">
      <div className="row-between mb-3">
        <div>
          <h2>List your property</h2>
          <p className="muted small mt-1">No documents, no approval — your listing goes live as soon as you post it.</p>
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

      {/* --------------------------------------------------- 1 basic details */}
      {step === 0 && (
        <form onSubmit={submitPersonal} className="form-sec card">
          <h3>Your details</h3>
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
            <button className="btn btn-dark" disabled={busy}>
              {busy ? <><span className="spinner" /> Creating account…</> : <>Continue <ArrowRight /></>}
            </button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------- 2 what are you listing */}
      {step === 1 && (
        <section className="form-sec card">
          <h3>What are you listing?</h3>
          <p className="muted">This just pre-fills your first listing — you can change any of it before you post.</p>
          <div className="form-grid">
            <div className="full">
              <Field label="I want to" required>
                <div className="pills">
                  {PURPOSE_OPTIONS.map((o) => (
                    <button key={o.key} type="button" className={`pill ${listing.purpose === o.key ? 'on' : ''}`}
                            onClick={() => setListing((p) => ({ ...p, purpose: o.key }))}>{o.label}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="full">
              <Field label="Property type" hint="Optional">
                <div className="pills">
                  {PROPERTY_TYPE_OPTIONS.map((t) => (
                    <button key={t.key} type="button" className={`pill ${listing.type === t.key ? 'on' : ''}`}
                            onClick={() => setListing((p) => ({ ...p, type: p.type === t.key ? '' : t.key }))}>
                      {listing.type === t.key && <Check style={{ width: 13, height: 13 }} />} {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <Field label="City">
              <select className="select" value={personal.city} onChange={setP('city')}>
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Locality" hint="Optional">
              <input className="input" value={listing.locality}
                     onChange={(e) => setListing((p) => ({ ...p, locality: e.target.value }))}
                     placeholder="e.g. Anna Nagar" />
            </Field>
          </div>
          <div className="row-between mt-3">
            <span />
            <button type="button" className="btn btn-dark" onClick={() => setStep(2)}>
              Continue <ArrowRight />
            </button>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- 3 review */}
      {step === 2 && (
        <section className="form-sec card">
          <h3>You're all set</h3>
          <p className="muted">Here's what we'll use to start your listing.</p>
          <div className="spec-grid">
            <div className="spec-row"><span>Purpose</span><b>{PURPOSE_OPTIONS.find((o) => o.key === listing.purpose)?.label}</b></div>
            <div className="spec-row"><span>Property type</span><b>{TYPE_LABEL[listing.type] || 'Not set yet'}</b></div>
            <div className="spec-row"><span>City</span><b>{personal.city || 'Not set yet'}</b></div>
            <div className="spec-row"><span>Locality</span><b>{listing.locality || '—'}</b></div>
          </div>
          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={goToPropertyForm}>
              <Key /> List your property <ArrowRight />
            </button>
          </div>
          <p className="center small muted mt-3">
            Not ready yet? <Link to="/dashboard" className="gold strong">Go to your dashboard</Link>
          </p>
        </section>
      )}

      {step === 0 && (
        <p className="center small muted mt-3">
          Already have an account? <Link to="/login?role=owner" className="gold strong">Login here</Link>
        </p>
      )}
    </div>
  );
}
