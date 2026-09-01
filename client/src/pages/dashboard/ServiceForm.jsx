import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, errFields } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ImagePicker from '../../components/ImagePicker.jsx';
import { Field, Notice, PageLoader } from '../../components/ui.jsx';
import { CITIES, rupees } from '../../utils/format.js';
import { ChevronLeft } from '../../components/Icons.jsx';

const CATEGORIES = [
  'Interior Design', 'Legal & Documentation', 'Home Loan', 'Packers & Movers',
  'Vaastu', 'Home Services', 'Property Management', 'Architecture', 'Valuation',
];

const BLANK = {
  title: '', category: '', description: '', price_from: '', price_unit: 'starting',
  city: 'Chennai', cover_image: '', status: 'active',
};

export default function ServiceForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const editing = !!id;

  const [f, setF] = useState({ ...BLANK, category: user?.service_category || '' });
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!editing) return;
    api.get(`/services/${id}`)
      .then((r) => {
        const s = r.data.data;
        setF({ ...BLANK, ...Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v ?? ''])) });
      })
      .catch((e) => setError(errMsg(e, 'Could not load this service')))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    const payload = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v !== null));
    try {
      if (editing) { await api.put(`/services/${id}`, payload); toast.success('Service updated'); }
      else { await api.post('/services', payload); toast.success('Service published'); }
      nav('/dashboard/services');
    } catch (err) {
      setError(errMsg(err)); setErrors(errFields(err));
    } finally { setBusy(false); }
  }

  if (loading) return <PageLoader label="Loading service…" />;

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
      <div className="row-between">
        <div>
          <h2>{editing ? 'Edit service' : 'Add a service'}</h2>
          <p className="muted small mt-1">Describe exactly what a customer gets, and what it costs.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(-1)}><ChevronLeft /> Back</button>
      </div>

      {error && <Notice type="err">{error}</Notice>}

      <section className="form-sec card">
        <h3>Service details</h3>

        <div className="form-grid">
          <Field label="Service title" required error={errors.title} className="full">
            <input className={`input ${errors.title ? 'invalid' : ''}`} value={f.title} onChange={set('title')}
                   placeholder="e.g. Turnkey Home Interiors — 2/3 BHK Packages" required />
          </Field>

          <Field label="Category" required error={errors.category}>
            <select className={`select ${errors.category ? 'invalid' : ''}`} value={f.category}
                    onChange={set('category')} required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="City">
            <select className="select" value={f.city} onChange={set('city')}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Price from (₹)" hint={f.price_from ? rupees(f.price_from) : 'Leave blank for free consultation'}>
            <input className="input" value={f.price_from} onChange={set('price_from')}
                   placeholder="e.g. 450000" inputMode="numeric" />
          </Field>

          <Field label="Price unit">
            <select className="select" value={f.price_unit} onChange={set('price_unit')}>
              {['starting', 'per home', 'per property', 'per visit', 'per deed', 'per sq.ft', 'free consultation']
                .map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>

          <Field label="Status">
            <select className="select" value={f.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Paused</option>
            </select>
          </Field>

          <Field label="Description" className="full">
            <textarea className="textarea" rows={5} value={f.description} onChange={set('description')}
                      placeholder="What's included, turnaround time, warranty, and why customers should pick you." />
          </Field>

          <div className="full">
            <Field label="Cover image">
              <ImagePicker max={1}
                           value={f.cover_image ? [f.cover_image] : []}
                           onChange={(imgs) => setF((p) => ({ ...p, cover_image: imgs[0] || '' }))} />
            </Field>
          </div>
        </div>

        <div className="row-between mt-3">
          <button type="button" className="btn btn-outline" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? <><span className="spinner" /> Saving…</> : editing ? 'Save changes' : 'Publish service'}
          </button>
        </div>
      </section>
    </form>
  );
}
