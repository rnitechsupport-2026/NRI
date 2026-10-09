import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Avatar, Field, Notice } from '../components/ui.jsx';
import { PORTAL_LABEL } from '../utils/format.js';
import { Lock, Mail, Phone, Shield } from '../components/Icons.jsx';

/** /staff/profile — who the employee is, what they manage, and their password. */
export default function StaffProfile() {
  const { user, setUser, managedPortals } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setPw((p) => ({ ...p, [k]: e.target.value }));

  async function changePassword(e) {
    e.preventDefault();
    setError('');
    if (pw.new_password.length < 6) { setError('The new password must be at least 6 characters'); return; }
    if (pw.new_password !== pw.confirm) { setError('The two new passwords do not match'); return; }
    setBusy(true);
    try {
      await api.put('/auth/password', { current_password: pw.current_password, new_password: pw.new_password });
      const { data } = await api.get('/auth/me'); // clears the "starting password" flag in the session
      setUser(data.user);
      setPw({ current_password: '', new_password: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 720, textAlign: 'left' }}>
      <div>
        <h2>Profile</h2>
        <p className="muted small mt-1">Your staff account. Assignments are managed by an administrator.</p>
      </div>

      <div className="card card-p">
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar src={user.avatar_url} name={user.name} size="avatar-lg" style={{ width: 60, height: 60 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>{user.name}</h3>
              <span className="badge badge-navy">Employee</span>
            </div>
            <div className="row small muted mt-1" style={{ gap: 14, flexWrap: 'wrap' }}>
              <span className="row" style={{ gap: 5 }}><Mail style={{ width: 14, height: 14 }} /> {user.email}</span>
              <span className="row" style={{ gap: 5 }}><Phone style={{ width: 14, height: 14 }} /> {user.phone}</span>
            </div>
            <div className="row mt-2" style={{ gap: 6, flexWrap: 'wrap' }}>
              <span className="small muted row" style={{ gap: 5 }}><Shield style={{ width: 14, height: 14 }} /> You manage:</span>
              {managedPortals.length
                ? managedPortals.map((p) => <span key={p} className="badge badge-gold">{PORTAL_LABEL[p]} users</span>)
                : <span className="small muted">no users assigned yet</span>}
            </div>
          </div>
        </div>
      </div>

      <form className="card card-p stack" style={{ gap: 14 }} onSubmit={changePassword}>
        <div className="row" style={{ gap: 9 }}>
          <Lock style={{ width: 19, height: 19, color: 'var(--gold-600)' }} />
          <h3 style={{ margin: 0 }}>Change password</h3>
        </div>
        {(user.must_change_password || params.get('first')) && user.must_change_password && (
          <Notice type="info">You are still using the starting password your administrator gave you. Choose your own now.</Notice>
        )}
        {error && <Notice type="err">{error}</Notice>}

        <Field label="Current password" required>
          <input className="input" type="password" value={pw.current_password} onChange={set('current_password')} required autoComplete="current-password" />
        </Field>
        <div className="form-grid">
          <Field label="New password" required hint="At least 6 characters">
            <input className="input" type="password" value={pw.new_password} onChange={set('new_password')} required autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" required>
            <input className="input" type="password" value={pw.confirm} onChange={set('confirm')} required autoComplete="new-password" />
          </Field>
        </div>
        <div>
          <button className="btn btn-dark" disabled={busy}>
            {busy ? <><span className="spinner" /> Saving…</> : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}
