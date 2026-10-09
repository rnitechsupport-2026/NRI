import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api, { errMsg, TOKEN_KEY } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { Notice, PageLoader } from '../components/ui.jsx';
import { Mail, Lock, Eye, EyeOff, Shield, Users, Home, Inbox, ArrowRight } from '../components/Icons.jsx';
import './staff.css';

const STAFF_ROLES = ['employee', 'admin'];
// Where each kind of staff account works from.
const homeFor = (user) => (user.role === 'admin' ? '/dashboard/admin' : user.must_change_password ? '/staff/profile?first=1' : '/staff');

/**
 * /staff/login — the sign-in for RNI staff only. Same authentication as the
 * rest of the site, but nothing here offers customer registration or the
 * Owner / Agent / Builder / Service Provider sign-ins, and a customer account
 * is turned away without being signed in.
 */
export default function StaffLogin() {
  const { user, ready, setUser } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Staff sign in · RNI Real Estates'; }, []);

  if (!ready) return <PageLoader label="Checking your session…" />;
  if (user && STAFF_ROLES.includes(user.role)) return <Navigate to={homeFor(user)} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email: form.email.trim(), password: form.password });
      if (!STAFF_ROLES.includes(data.user.role)) {
        // a customer account: not signed in here at all
        setError('This sign-in is for RNI staff only. Customer accounts sign in from the main site.');
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      nav(homeFor(data.user), { replace: true });
    } catch (err) {
      setError(errMsg(err, 'Could not sign in'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="staff-login">
      <aside className="staff-login-side">
        <LogoMark size={46} />
        <div>
          <span className="staff-login-tag"><Shield /> Staff Portal</span>
          <h1>RNI Real Estates<br />team workspace</h1>
          <p>Review the users assigned to you, verify new accounts and properties, and keep every lead moving.</p>
          <ul>
            <li><Users /> Your assigned Owners, Agents, Builders and Service Providers</li>
            <li><Shield /> User and property verification with a full approval history</li>
            <li><Home /> Properties stay off the public site until you approve them</li>
            <li><Inbox /> Leads and their status for every user you manage</li>
          </ul>
        </div>
        <small>Authorised staff only. Activity in this portal is recorded.</small>
      </aside>

      <main className="staff-login-main">
        <form className="staff-login-card card" onSubmit={submit} noValidate>
          <div className="staff-login-mobile-logo"><LogoMark size={38} /></div>
          <h2>Staff sign in</h2>
          <p className="muted small">Use the email your administrator registered for you.</p>

          {user && !STAFF_ROLES.includes(user.role) && (
            <Notice type="info">You are signed in with a customer account on this browser. Signing in here switches to your staff account.</Notice>
          )}
          {error && <Notice type="err">{error}</Notice>}

          <label className="field">
            <span>Work email</span>
            <div className="input-icon">
              <Mail />
              <input className="input" type="email" autoComplete="username" required autoFocus
                     value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                     placeholder="name@company.com" />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-icon" style={{ position: 'relative' }}>
              <Lock />
              <input className="input" type={show ? 'text' : 'password'} autoComplete="current-password" required
                     value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                     placeholder="Your password" style={{ paddingRight: 44 }} />
              <button type="button" className="staff-login-eye" onClick={() => setShow((s) => !s)}
                      aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <button className="btn btn-dark btn-block btn-lg" disabled={busy}>
            {busy ? <><span className="spinner" /> Signing in…</> : <>Sign in <ArrowRight /></>}
          </button>

          <p className="tiny muted">
            New here? Your administrator creates your account and gives you a starting password — you can change it
            from Profile after your first sign-in. Forgotten it? Ask your administrator to reset it.
          </p>
          <Link to="/" className="tiny muted" style={{ textDecoration: 'underline' }}>← Back to the RNI Real Estates website</Link>
        </form>
      </main>
    </div>
  );
}
