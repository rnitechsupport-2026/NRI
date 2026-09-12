import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { errMsg, errFields } from '../api/client.js';
import RoleTabs, { roleInfo } from '../components/RoleTabs.jsx';
import { Field, Notice } from '../components/ui.jsx';
import { Mail, Lock, Eye, EyeOff, Shield, Cube, Handshake, ArrowRight } from '../components/Icons.jsx';

const DEMO = {
  buyer: 'buyer@demo.com',
  owner: 'owner@demo.com',
  agent: 'agent@demo.com',
  builder: 'builder@demo.com',
  service: 'service@demo.com',
};

const POINTS = [
  { icon: Shield, title: 'Verified listings', text: 'Documents and ownership checked before going live.' },
  { icon: Cube, title: '3D walkthroughs', text: 'Tour any home in 360° before you step out.' },
  { icon: Handshake, title: 'Direct connect', text: 'Talk to owners, agents and builders with no middleman.' },
];

export default function Login() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { login, isAuthed, user } = useAuth();
  const toast = useToast();

  const [role, setRole] = useState(params.get('role') || 'buyer');
  const [staffMode, setStaffMode] = useState(params.get('staff') === '1');
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState(params.get('expired') ? 'Your session expired. Please login again.' : '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Buyers have no dashboard shell — land them on the homepage instead,
  // unless the caller asked for somewhere specific via ?next=.
  const explicitNext = params.get('next');
  const destFor = (u) => explicitNext || (u.role === 'buyer' ? '/' : '/dashboard');
  const info = roleInfo(role);

  useEffect(() => { if (isAuthed) nav(destFor(user), { replace: true }); }, [isAuthed, user, nav, explicitNext]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    try {
      const payload = staffMode ? { email: form.email, password: form.password } : { ...form, role };
      const loggedInUser = await login(payload);
      toast.success(`Welcome back, ${loggedInUser.name.split(' ')[0]}!`);
      nav(destFor(loggedInUser), { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
    } finally {
      setBusy(false);
    }
  }

  function useDemo() {
    setForm({ email: staffMode ? 'admin@demo.com' : (DEMO[role] || DEMO.owner), password: 'Test@123' });
    setError('');
  }

  function toggleStaffMode() {
    setStaffMode((s) => !s);
    setError(''); setErrors({});
  }

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <div>
          <span className="eyebrow" style={{ color: 'var(--gold-400)' }}>Welcome back</span>
          <h2>Your property journey continues here.</h2>
          <p>
            Manage listings, track enquiries and close deals faster — all from one dashboard
            built for owners, agents, builders and service partners.
          </p>

          <ul className="auth-points">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.title}>
                  <span className="ic"><Icon /></span>
                  <span>
                    <b>{p.title}</b>
                    <span>{p.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <blockquote className="auth-quote">
          &ldquo;Listed my flat on a Monday and had four genuine site visits by the weekend.&rdquo;
          <footer className="small mt-1" style={{ color: 'rgba(255,255,255,.6)' }}>
            — Lakshmi N., Owner, Coimbatore
          </footer>
        </blockquote>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <h1>Login to your account</h1>
              <p className="muted">
                {staffMode ? 'Sign in with your staff or admin account.' : 'Choose your account type and continue.'}
              </p>
            </div>
            <button type="button" className="small gold strong" onClick={toggleStaffMode} style={{ whiteSpace: 'nowrap' }}>
              {staffMode ? '← Back to account login' : 'Staff / Admin login'}
            </button>
          </div>

          {!staffMode && (
            <>
              <RoleTabs value={role} onChange={setRole} className="mb-3 mt-3" />
              <div className="alert alert-info mb-3" style={{ padding: '10px 14px' }}>
                <span className="tiny"><b>{info.title}</b> — {info.blurb}</span>
              </div>
            </>
          )}
          {staffMode && <div className="mt-3" />}

          <form onSubmit={submit} className="stack">
            {error && (
              <Notice type="err">
                {error}
                {!staffMode && /registered as (admin|employee)/i.test(error) && (
                  <>
                    {' '}
                    <button type="button" className="strong" style={{ textDecoration: 'underline' }}
                            onClick={toggleStaffMode}>
                      Switch to Staff / Admin login
                    </button>
                  </>
                )}
              </Notice>
            )}

            <Field label="Email or mobile number" required error={errors.email}>
              <div className="input-icon">
                <Mail />
                <input className={`input ${errors.email ? 'invalid' : ''}`} value={form.email}
                       onChange={set('email')} placeholder="you@example.com" autoComplete="username" required />
              </div>
            </Field>

            <Field label="Password" required error={errors.password}>
              <div className="input-icon">
                <Lock />
                <input className={`input ${errors.password ? 'invalid' : ''}`}
                       type={show ? 'text' : 'password'} value={form.password} onChange={set('password')}
                       placeholder="Enter your password" autoComplete="current-password" required
                       style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShow((s) => !s)}
                        aria-label={show ? 'Hide password' : 'Show password'}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  {show ? <EyeOff style={{ width: 18, height: 18, color: 'var(--muted)' }} />
                        : <Eye style={{ width: 18, height: 18, color: 'var(--muted)' }} />}
                </button>
              </div>
            </Field>

            <div className="row-between" style={{ marginTop: -4 }}>
              <label className="checkline"><input type="checkbox" defaultChecked /> Keep me signed in</label>
              <a href="#" className="small gold strong">Forgot password?</a>
            </div>

            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? <><span className="spinner" /> Signing in…</> : staffMode
                ? <>Login <ArrowRight /></> : <>Login as {info.label} <ArrowRight /></>}
            </button>
          </form>

          <div className="auth-sep">or</div>

          <div className="demo-box">
            <b>Demo accounts</b>
            <div className="demo-row">
              <span><code>{staffMode ? 'admin@demo.com' : DEMO[role]}</code> / <code>Test@123</code></span>
              <button className="btn btn-xs btn-dark" onClick={useDemo}>Use</button>
            </div>
            <p className="tiny muted">
              {staffMode ? 'Platform admin demo login — employee accounts are added by an admin.'
                         : 'Switch the tab above to try the owner, agent, builder or services dashboard.'}
            </p>
          </div>

          {!staffMode && (
            <p className="center small muted mt-3">
              New to RNI Realestate?{' '}
              <Link to={`/register?role=${role}`} className="gold strong">Create a free account</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
