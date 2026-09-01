import { useState } from 'react';
import api, { errMsg, errFields } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Avatar, Field, Notice } from '../../components/ui.jsx';
import { CITIES, ROLE_LABEL } from '../../utils/format.js';
import { Shield, Lock, Check } from '../../components/Icons.jsx';

const SERVICE_CATEGORIES = [
  'Interior Design', 'Legal & Documentation', 'Home Loan', 'Packers & Movers',
  'Vaastu', 'Home Services', 'Property Management', 'Architecture', 'Valuation',
];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [f, setF] = useState({
    name: user.name || '', phone: user.phone || '',
    company_name: user.company_name || '', rera_id: user.rera_id || '',
    service_category: user.service_category || '',
    experience_years: user.experience_years ?? '',
    city: user.city || '', locality: user.locality || '',
    about: user.about || '', avatar_url: user.avatar_url || '', website: user.website || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState('');

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setP = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  const isPro = ['agent', 'builder', 'service'].includes(user.role);

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    try {
      await updateProfile({
        ...f,
        experience_years: f.experience_years === '' ? null : Number(f.experience_years),
      });
      toast.success('Profile updated');
    } catch (err) {
      setError(errMsg(err)); setErrors(errFields(err));
    } finally { setBusy(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) { setPwError('New passwords do not match'); return; }
    setPwBusy(true); setPwError('');
    try {
      await api.put('/auth/password', {
        current_password: pw.current_password, new_password: pw.new_password,
      });
      toast.success('Password changed');
      setPw({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setPwError(errMsg(err));
    } finally { setPwBusy(false); }
  }

  const completion = (() => {
    const fields = [f.name, f.phone, f.city, f.about, f.avatar_url,
      ...(isPro ? [f.company_name, f.experience_years] : []),
      ...(user.role !== 'service' && isPro ? [f.rera_id] : [])];
    const done = fields.filter((v) => v !== '' && v !== null && v !== undefined).length;
    return Math.round((done / fields.length) * 100);
  })();

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Account settings</h2>
        <p className="muted small mt-1">Keep your profile complete — it directly affects how many enquiries you get.</p>
      </div>

      <div className="card card-p">
        <div className="row-between mb-2">
          <div className="row" style={{ gap: 14 }}>
            <Avatar src={f.avatar_url} name={f.name} size="avatar-lg" className="avatar-ring" />
            <div>
              <div className="strong">{f.name}</div>
              <div className="small muted">{ROLE_LABEL[user.role]} · {user.email}</div>
              {!!user.is_verified && (
                <span className="badge badge-green mt-1"><Shield style={{ width: 11, height: 11 }} /> Verified</span>
              )}
            </div>
          </div>
          <div style={{ minWidth: 180 }}>
            <div className="row-between tiny mb-1">
              <span className="muted">Profile completion</span>
              <b className="strong">{completion}%</b>
            </div>
            <div style={{ height: 7, background: 'var(--line-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${completion}%`, height: '100%', borderRadius: 99,
                background: completion === 100 ? 'var(--green)' : 'var(--gold-500)',
              }} />
            </div>
          </div>
        </div>
      </div>

      <form className="form-sec card" onSubmit={save}>
        <h3>Profile information</h3>
        <p className="muted">This is what buyers see on your public profile.</p>

        {error && <div className="mb-2"><Notice type="err">{error}</Notice></div>}

        <div className="form-grid">
          <Field label="Full name" required error={errors.name}>
            <input className={`input ${errors.name ? 'invalid' : ''}`} value={f.name} onChange={set('name')} required />
          </Field>

          <Field label="Mobile number" required error={errors.phone}>
            <input className={`input ${errors.phone ? 'invalid' : ''}`} value={f.phone} onChange={set('phone')}
                   inputMode="numeric" maxLength={10} required />
          </Field>

          {isPro && (
            <>
              <Field label={user.role === 'builder' ? 'Company name' : 'Business / firm name'}>
                <input className="input" value={f.company_name} onChange={set('company_name')} />
              </Field>

              {user.role === 'service' ? (
                <Field label="Service category">
                  <select className="select" value={f.service_category} onChange={set('service_category')}>
                    <option value="">Select</option>
                    {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="RERA registration number" hint="Verified accounts get 3× more enquiries">
                  <input className="input" value={f.rera_id} onChange={set('rera_id')}
                         placeholder="TN/AGENT/0000/2024" />
                </Field>
              )}

              <Field label="Experience (years)">
                <input className="input" value={f.experience_years} onChange={set('experience_years')}
                       inputMode="numeric" />
              </Field>

              <Field label="Website">
                <input className="input" value={f.website} onChange={set('website')} placeholder="https://" />
              </Field>
            </>
          )}

          <Field label="City">
            <select className="select" value={f.city} onChange={set('city')}>
              <option value="">Select city</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Locality">
            <input className="input" value={f.locality} onChange={set('locality')} placeholder="e.g. Adyar" />
          </Field>

          <Field label="Profile photo URL" className="full" hint="Paste a hosted image link">
            <input className="input" value={f.avatar_url} onChange={set('avatar_url')} placeholder="https://…" />
          </Field>

          <Field label="About" className="full" hint="A short introduction shown on your public profile">
            <textarea className="textarea" rows={4} value={f.about} onChange={set('about')}
                      placeholder="Tell buyers who you are, what areas you cover and what you specialise in." />
          </Field>
        </div>

        <div className="row-between mt-3">
          <span className="small muted">Email cannot be changed. Contact support if needed.</span>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <><span className="spinner" /> Saving…</> : <><Check /> Save changes</>}
          </button>
        </div>
      </form>

      <form className="form-sec card" onSubmit={changePassword}>
        <h3 className="row" style={{ gap: 9 }}>
          <Lock style={{ width: 19, height: 19, color: 'var(--gold-600)' }} /> Change password
        </h3>
        <p className="muted">Use at least 6 characters with a mix of letters and numbers.</p>

        {pwError && <div className="mb-2"><Notice type="err">{pwError}</Notice></div>}

        <div className="form-grid">
          <Field label="Current password" required>
            <input className="input" type="password" value={pw.current_password}
                   onChange={setP('current_password')} required autoComplete="current-password" />
          </Field>
          <Field label="New password" required>
            <input className="input" type="password" value={pw.new_password}
                   onChange={setP('new_password')} minLength={6} required autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" required>
            <input className="input" type="password" value={pw.confirm}
                   onChange={setP('confirm')} minLength={6} required autoComplete="new-password" />
          </Field>
        </div>

        <div className="row-between mt-3">
          <span />
          <button className="btn btn-dark" disabled={pwBusy}>
            {pwBusy ? <><span className="spinner" /> Updating…</> : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
