import { useEffect, useState } from 'react';
import api, { errMsg, errFields } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Field, Modal, PageLoader, Notice } from '../../../components/ui.jsx';
import { timeAgo, PORTAL_LABEL } from '../../../utils/format.js';
import { Users, Plus, Edit, Trash, Shield, Search, X, Lock } from '../../../components/Icons.jsx';

// The user types an employee can be put in charge of. Buyers are not managed
// users — their interest reaches staff as leads.
const PORTALS = [
  { key: 'owner', label: 'All Owner users' },
  { key: 'agent', label: 'All Agent users' },
  { key: 'builder', label: 'All Builder users' },
  { key: 'service', label: 'All Service Provider users' },
];

const EMPTY_FORM = { name: '', email: '', phone: '', managed_portals: [], assigned: [] };

/** Search-and-pick for assigning specific users to an employee. */
function UserPicker({ value, onChange, coveredTypes }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  async function search(e) {
    e?.preventDefault();
    e?.stopPropagation();
    setBusy(true);
    try {
      const { data } = await api.get('/admin/assignable-users', { params: { q: q.trim() || undefined } });
      setResults(data.data);
    } catch { setResults([]); } finally { setBusy(false); }
  }

  const picked = (id) => value.some((u) => u.id === id);

  return (
    <div className="stack" style={{ gap: 8 }}>
      {value.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {value.map((u) => (
            <span key={u.id} className="badge badge-outline" style={{ gap: 6 }}>
              {u.name} · {PORTAL_LABEL[u.role] || u.role}
              <button type="button" aria-label={`Remove ${u.name}`} onClick={() => onChange(value.filter((x) => x.id !== u.id))}
                      style={{ display: 'inline-flex' }}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <div className="input-icon" style={{ flex: 1 }}>
          <Search />
          <input className="input" placeholder="Search a user by name, email or phone" value={q}
                 onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter') search(e); }} />
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={search} disabled={busy}>
          {busy ? <span className="spinner spinner-dark" /> : 'Search'}
        </button>
      </div>
      {results && (
        results.length === 0 ? <p className="tiny muted">No matching users.</p> : (
          <div className="stack" style={{ gap: 4, maxHeight: 190, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: 6 }}>
            {results.map((u) => {
              const covered = coveredTypes.includes(u.role);
              const on = picked(u.id);
              return (
                <button key={u.id} type="button" disabled={covered || on}
                        onClick={() => onChange([...value, { id: u.id, name: u.name, email: u.email, role: u.role }])}
                        className="row-between" style={{ padding: '6px 8px', borderRadius: 6, textAlign: 'left', opacity: covered || on ? 0.55 : 1 }}>
                  <span style={{ minWidth: 0 }}>
                    <span className="small strong">{u.name}</span>
                    <span className="tiny muted"> · {u.email}</span>
                  </span>
                  <span className="tiny muted nowrap">
                    {covered ? `covered by ${PORTAL_LABEL[u.role]} type` : on ? 'added' : PORTAL_LABEL[u.role] || u.role}
                  </span>
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default function AdminEmployees() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [editing, setEditing] = useState(null); // employee row being edited, or 'new'
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [created, setCreated] = useState(null); // just-added employee: show their login once

  const load = () => api.get('/admin/employees')
    .then((r) => { setRows(r.data.data); setDefaultPassword(r.data.meta?.defaultPassword || ''); })
    .catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setError(''); setErrors({});
    setEditing('new');
  }

  function openEdit(row) {
    setForm({ name: row.name, email: row.email, phone: row.phone, managed_portals: row.managedPortals || [], assigned: row.assignedUsers || [] });
    setError(''); setErrors({});
    setEditing(row);
  }

  function togglePortal(key) {
    setForm((f) => ({
      ...f,
      managed_portals: f.managed_portals.includes(key)
        ? f.managed_portals.filter((p) => p !== key)
        : [...f.managed_portals, key],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    // a user whose whole type is assigned needs no entry of their own
    const assigned_users = form.assigned.filter((u) => !form.managed_portals.includes(u.role)).map((u) => u.id);
    const { name, email, phone, managed_portals } = form;
    try {
      if (editing === 'new') {
        const { data } = await api.post('/admin/employees', { name, email, phone, managed_portals, assigned_users });
        setCreated(data.data);
      } else {
        await api.put(`/admin/employees/${editing.id}`, { name, phone, managed_portals, assigned_users });
        toast.success('Employee updated');
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(row) {
    const next = row.status === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/admin/employees/${row.id}`, { status: next });
      toast.success(next === 'active' ? 'Employee reactivated' : 'Employee suspended');
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function resetPassword(row) {
    if (!window.confirm(`Reset ${row.name}'s password to the default (${defaultPassword})?`)) return;
    try {
      await api.put(`/admin/employees/${row.id}`, { reset_password: true });
      toast.success(`Password reset to ${defaultPassword}`);
      load();
    } catch (err) { toast.error(errMsg(err)); }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/admin/employees/${confirm.id}`);
      toast.success('Employee removed');
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) return <PageLoader label="Loading employees…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2>Employees</h2>
          <p className="muted small mt-1">
            {rows.length} employee{rows.length === 1 ? '' : 's'} · each sees only the users assigned to them, by type or one by one
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus /> Add employee</button>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Users} title="No employees yet"
               action={<button className="btn btn-primary" onClick={openNew}><Plus /> Add your first employee</button>}>
          Add staff and assign them Owner, Agent, Builder or Service Provider users to verify and manage.
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Employee</th><th>Assigned to</th><th>Password</th><th>Status</th><th>Added</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="nm">{r.name}</div>
                    <div className="tiny muted">{r.email} · {r.phone}</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                      {(r.managedPortals || []).map((p) => (
                        <span key={p} className="badge badge-gold">All {PORTAL_LABEL[p]}s</span>
                      ))}
                      {(r.assignedUsers || []).map((u) => (
                        <span key={u.id} className="badge badge-outline" title={u.email}>{u.name} · {PORTAL_LABEL[u.role] || u.role}</span>
                      ))}
                      {!(r.managedPortals || []).length && !(r.assignedUsers || []).length && <span className="tiny muted">Nothing assigned</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.mustChangePassword ? 'badge-amber' : 'badge-green'}`}>
                      {r.mustChangePassword ? 'Default — not changed yet' : 'Changed'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {r.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="muted small nowrap">{timeAgo(r.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-xs btn-outline" title="Edit assignment" onClick={() => openEdit(r)}><Edit /></button>
                      <button className="btn btn-xs btn-outline" title="Reset password to the default" onClick={() => resetPassword(r)}><Lock /></button>
                      <button className="btn btn-xs btn-outline" onClick={() => toggleStatus(r)}>
                        {r.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button className="btn btn-xs btn-danger" title="Remove" onClick={() => setConfirm(r)}><Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Add employee' : `Edit ${editing.name}`} onClose={() => setEditing(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                   <button className="btn btn-primary" form="employee-form" disabled={busy}>
                     {busy ? <><span className="spinner" /> Saving…</> : editing === 'new' ? 'Add employee' : 'Save changes'}
                   </button>
                 </>
               }>
          <form id="employee-form" onSubmit={submit} className="stack" style={{ gap: 14 }}>
            {error && <Notice type="err">{error}</Notice>}

            <Field label="Full name" required error={errors.name}>
              <input className={`input ${errors.name ? 'invalid' : ''}`} value={form.name}
                     onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </Field>

            {editing === 'new' && (
              <Field label="Email" required error={errors.email} hint="This is the employee's login.">
                <input type="email" className={`input ${errors.email ? 'invalid' : ''}`} value={form.email}
                       onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </Field>
            )}

            <Field label="Phone" required={editing === 'new'} error={errors.phone} hint="10 digit mobile number">
              <input className={`input ${errors.phone ? 'invalid' : ''}`} value={form.phone}
                     onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required={editing === 'new'} />
            </Field>

            {editing === 'new' && (
              <Notice type="info">
                The account is created with the default password <b>{defaultPassword}</b>. The employee signs in with their
                email and is asked to change it.
              </Notice>
            )}

            <Field label="Assign whole user types" error={errors.managed_portals}
                   hint="The employee sees every user of a ticked type, including ones who register later.">
              <div className="stack" style={{ gap: 8 }}>
                {PORTALS.map((p) => (
                  <label key={p.key} className="checkline">
                    <input type="checkbox" checked={form.managed_portals.includes(p.key)}
                           onChange={() => togglePortal(p.key)} />
                    <Shield style={{ width: 14, height: 14, color: 'var(--gold-600)' }} /> {p.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="…or assign specific users" error={errors.assigned_users}
                   hint="Use this when the employee should handle only certain users of a type.">
              <UserPicker value={form.assigned} coveredTypes={form.managed_portals}
                          onChange={(assigned) => setForm((f) => ({ ...f, assigned }))} />
            </Field>
          </form>
        </Modal>
      )}

      {created && (
        <Modal title="Employee added" onClose={() => setCreated(null)}
               footer={<button className="btn btn-primary" onClick={() => setCreated(null)}>Done</button>}>
          <p className="mb-2">Share these sign-in details with <b>{created.name}</b>:</p>
          <div className="card card-p stack" style={{ gap: 6 }}>
            <div className="row-between"><span className="muted small">Portal</span><b>Staff login on the sign-in page</b></div>
            <div className="row-between"><span className="muted small">Email</span><b>{created.email}</b></div>
            <div className="row-between"><span className="muted small">Password</span><b>{defaultPassword}</b></div>
          </div>
          <p className="tiny muted mt-2">They will be asked to change the password after signing in.</p>
        </Modal>
      )}

      {confirm && (
        <Modal title="Remove this employee?" onClose={() => setConfirm(null)}
               footer={
                 <>
                   <button className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
                   <button className="btn btn-danger" onClick={remove} disabled={busy}>
                     {busy ? <><span className="spinner spinner-dark" /> Removing…</> : 'Remove permanently'}
                   </button>
                 </>
               }>
          <p><b>{confirm.name}</b> will lose access immediately. This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}
