import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errMsg, errFields } from '../api/client.js';
import RoleTabs, { roleInfo } from '../components/RoleTabs.jsx';
import { Field, Notice } from '../components/ui.jsx';
import { CITIES } from '../utils/format.js';
import { User, Mail, Lock, Phone, Eye, EyeOff, Check, ArrowRight } from '../components/Icons.jsx';

const SERVICE_CATEGORIES = [
  'Interior Design', 'Legal & Documentation', 'Home Loan', 'Packers & Movers',
  'Vaastu', 'Home Services', 'Property Management', 'Architecture', 'Valuation',
];

export default function Register() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { register, isAuthed } = useAuth();
  const toast = useToast();

  const [role, setRole] = useState(params.get('role') || 'owner');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
    company_name: '', rera_id: '', service_category: '', experience_years: '', city: '',
  });
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const info = roleInfo(role);
  const isPro = role === 'agent' || role === 'builder' || role === 'service';

  useEffect(() => { if (isAuthed) nav('/dashboard', { replace: true }); }, [isAuthed, nav]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setErrors({ confirm: 'Passwords do not match' });
      return;
    }
    if (!agree) { setError('Please accept the terms to continue'); return; }

    setBusy(true); setError(''); setErrors({});
    const payload = {
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
      password: form.password, role,
      city: form.city || undefined,
    };
    if (isPro) {
      payload.company_name = form.company_name || undefined;
      payload.rera_id = form.rera_id || undefined;
      payload.experience_years = form.experience_years || undefined;
    }
    if (role === 'service') payload.service_category = form.service_category || undefined;

    try {
      const user = await register(payload);
      toast.success(`Account created. Welcome, ${user.name.split(' ')[0]}!`);
      nav('/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <div>
          <span className="eyebrow" style={{ color: 'var(--gold-400)' }}>Join RNI Realestate</span>
          <h2>{info.title}</h2>
          <p>{info.blurb}</p>

          <ul className="auth-points">
            {info.perks.map((perk) => (
              <li key={perk}>
                <span className="ic"><Check /></span>
                <span><b>{perk}</b></span>
              </li>
            ))}
            <li>
              <span className="ic"><Check /></span>
              <span>
                <b>Free forever</b>
                <span>No listing fee, no subscription, no hidden charges.</span>
              </span>
            </li>
          </ul>
        </div>

        <div className="row" style={{ gap: 26, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-300)' }}>2L+</div>
            <div className="small" style={{ color: 'rgba(255,255,255,.62)' }}>Monthly visitors</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-300)' }}>15k+</div>
            <div className="small" style={{ color: 'rgba(255,255,255,.62)' }}>Deals closed</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-300)' }}>4.8/5</div>
            <div className="small" style={{ color: 'rgba(255,255,255,.62)' }}>Partner rating</div>
          </div>
        </div>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="muted">Pick the account type that fits you.</p>

          <RoleTabs value={role} onChange={setRole} className="mb-3" />

          <form onSubmit={submit} className="stack">
            {error && <Notice type="err">{error}</Notice>}

            <Field label="Full name" required error={errors.name}>
              <div className="input-icon">
                <User />
                <input className={`input ${errors.name ? 'invalid' : ''}`} value={form.name}
                       onChange={set('name')} placeholder="Your full name" required />
              </div>
            </Field>

            <div className="grid g-2" style={{ gap: 14 }}>
              <Field label="Email" required error={errors.email}>
                <div className="input-icon">
                  <Mail />
                  <input className={`input ${errors.email ? 'invalid' : ''}`} type="email" value={form.email}
                         onChange={set('email')} placeholder="you@example.com" required />
                </div>
              </Field>

              <Field label="Mobile" required error={errors.phone}>
                <div className="input-icon">
                  <Phone />
                  <input className={`input ${errors.phone ? 'invalid' : ''}`} value={form.phone}
                         onChange={set('phone')} placeholder="10 digit number" inputMode="numeric"
                         maxLength={10} required />
                </div>
              </Field>
            </div>

            {isPro && (
              <>
                <Field
                  label={role === 'builder' ? 'Company name' : role === 'service' ? 'Business name' : 'Firm / agency name'}
                  required={role === 'builder'}
                  error={errors.company_name}
                >
                  <input className={`input ${errors.company_name ? 'invalid' : ''}`} value={form.company_name}
                         onChange={set('company_name')}
                         placeholder={role === 'builder' ? 'e.g. RNI Constructions Pvt Ltd' : 'e.g. Prasad Property Consultants'}
                         required={role === 'builder'} />
                </Field>

                <div className="grid g-2" style={{ gap: 14 }}>
                  {role === 'service' ? (
                    <Field label="Service category" required error={errors.service_category}>
                      <select className={`select ${errors.service_category ? 'invalid' : ''}`}
                              value={form.service_category} onChange={set('service_category')} required>
                        <option value="">Select category</option>
                        {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  ) : (
                    <Field label="RERA registration no." hint="Boosts trust — shows a verified badge">
                      <input className="input" value={form.rera_id} onChange={set('rera_id')}
                             placeholder="TN/AGENT/0000/2024" />
                    </Field>
                  )}

                  <Field label="Experience (years)">
                    <input className="input" value={form.experience_years} onChange={set('experience_years')}
                           placeholder="e.g. 6" inputMode="numeric" />
                  </Field>
                </div>
              </>
            )}

            <Field label="City">
              <select className="select" value={form.city} onChange={set('city')}>
                <option value="">Select your city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <div className="grid g-2" style={{ gap: 14 }}>
              <Field label="Password" required error={errors.password} hint="Minimum 6 characters">
                <div className="input-icon">
                  <Lock />
                  <input className={`input ${errors.password ? 'invalid' : ''}`}
                         type={show ? 'text' : 'password'} value={form.password} onChange={set('password')}
                         placeholder="Create a password" minLength={6} required style={{ paddingRight: 42 }} />
                  <button type="button" onClick={() => setShow((s) => !s)} aria-label="Toggle password"
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                    {show ? <EyeOff style={{ width: 17, height: 17, color: 'var(--muted)' }} />
                          : <Eye style={{ width: 17, height: 17, color: 'var(--muted)' }} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm password" required error={errors.confirm}>
                <div className="input-icon">
                  <Lock />
                  <input className={`input ${errors.confirm ? 'invalid' : ''}`} type={show ? 'text' : 'password'}
                         value={form.confirm} onChange={set('confirm')} placeholder="Re-enter password" required />
                </div>
              </Field>
            </div>

            <label className="checkline">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="small muted">
                I agree to the <a href="#" className="gold strong">Terms of Use</a> and{' '}
                <a href="#" className="gold strong">Privacy Policy</a>.
              </span>
            </label>

            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? <><span className="spinner" /> Creating account…</>
                    : <>Create {info.label} account <ArrowRight /></>}
            </button>
          </form>

          <p className="center small muted mt-3">
            Already registered? <Link to={`/login?role=${role}`} className="gold strong">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
