import { useEffect, useState } from 'react';
import api, { errMsg, errFields } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Empty, Field, Modal, PageLoader, Notice } from '../../../components/ui.jsx';
import { timeAgo } from '../../../utils/format.js';
import { Users, Plus, Edit, Trash, Shield } from '../../../components/Icons.jsx';

const PORTALS = [
  { key: 'owner', label: 'Owner portal' },
  { key: 'agent', label: 'Agent portal' },
  { key: 'builder', label: 'Builder portal' },
  { key: 'service', label: 'Service portal' },
];

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', managed_portals: [] };

export default function AdminEmployees() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // employee row being edited, or 'new'
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = () => api.get('/admin/employees').then((r) => setRows(r.data.data)).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setError(''); setErrors({});
    setEditing('new');
  }

  function openEdit(row) {
    setForm({ name: row.name, email: row.email, phone: row.phone, password: '', managed_portals: row.managedPortals || [] });
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
    try {
      if (editing === 'new') {
        await api.post('/admin/employees', form);
        toast.success('Employee added');
      } else {
        const { name, phone, managed_portals } = form;
        await api.put(`/admin/employees/${editing.id}`, { name, phone, managed_portals });
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
          <p className="muted small mt-1">{rows.length} employee{rows.length === 1 ? '' : 's'} · each in charge of one or more portals</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}><Plus /> Add employee</button>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Users} title="No employees yet"
               action={<button className="btn btn-primary" onClick={openNew}><Plus /> Add your first employee</button>}>
          Add staff and put them in charge of the Owner, Agent, Builder or Service portal.
        </Empty>
      ) : (
        <div className="card table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Employee</th><th>Portals</th><th>Status</th><th>Added</th><th>Actions</th></tr>
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
                      {(r.managedPortals || []).length === 0
                        ? <span className="tiny muted">No portal assigned</span>
                        : r.managedPortals.map((p) => (
                            <span key={p} className="badge badge-gold">{p}</span>
                          ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                      {r.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="muted small nowrap">{timeAgo(r.createdAt)}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-xs btn-outline" title="Edit" onClick={() => openEdit(r)}><Edit /></button>
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
              <>
                <Field label="Email" required error={errors.email}>
                  <input type="email" className={`input ${errors.email ? 'invalid' : ''}`} value={form.email}
                         onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
                </Field>
                <Field label="Phone" required error={errors.phone} hint="10 digit mobile number">
                  <input className={`input ${errors.phone ? 'invalid' : ''}`} value={form.phone}
                         onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
                </Field>
                <Field label="Temporary password" required error={errors.password} hint="Share this with the employee — they can change it after logging in.">
                  <input type="text" className={`input ${errors.password ? 'invalid' : ''}`} value={form.password}
                         onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
                </Field>
              </>
            )}

            {editing !== 'new' && (
              <Field label="Phone" error={errors.phone}>
                <input className={`input ${errors.phone ? 'invalid' : ''}`} value={form.phone}
                       onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
            )}

            <Field label="In charge of" required error={errors.managed_portals} hint="Pick at least one portal">
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
          </form>
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
