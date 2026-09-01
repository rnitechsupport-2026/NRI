import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, errFields } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import ImagePicker from '../../components/ImagePicker.jsx';
import { Field, Notice, PageLoader } from '../../components/ui.jsx';
import { AMENITY_LIST, CITIES, money, titleCase } from '../../utils/format.js';
import { Check, ChevronLeft } from '../../components/Icons.jsx';

const BLANK = {
  name: '', tagline: '', description: '', project_type: 'apartment', configuration: '',
  min_price: '', max_price: '', min_area: '', max_area: '', total_units: '', towers: '',
  locality: '', city: 'Chennai', address: '', rera_no: '', possession_on: '',
  amenities: [], images: [], status: 'ongoing',
};

const TYPES = ['apartment', 'villa', 'plot', 'commercial', 'township'];

export default function ProjectForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const editing = !!id;

  const [f, setF] = useState(BLANK);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!editing) return;
    api.get(`/projects/${id}`)
      .then((r) => {
        const p = r.data.data;
        setF({
          ...BLANK,
          ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ''])),
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          images: (p.images || []).map((i) => i.url),
          possession_on: p.possession_on ? String(p.possession_on).slice(0, 10) : '',
        });
      })
      .catch((e) => setError(errMsg(e, 'Could not load this project')))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const toggleAmenity = (a) => setF((p) => ({
    ...p,
    amenities: p.amenities.includes(a) ? p.amenities.filter((x) => x !== a) : [...p.amenities, a],
  }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    const payload = Object.fromEntries(
      Object.entries({ ...f, cover_image: f.images[0] || '' }).filter(([, v]) => v !== '' && v !== null)
    );
    payload.amenities = f.amenities;
    payload.images = f.images;

    try {
      if (editing) { await api.put(`/projects/${id}`, payload); toast.success('Project updated'); }
      else { await api.post('/projects', payload); toast.success('Project published'); }
      nav('/dashboard/projects');
    } catch (err) {
      setError(errMsg(err)); setErrors(errFields(err));
    } finally { setBusy(false); }
  }

  if (loading) return <PageLoader label="Loading project…" />;

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
      <div className="row-between">
        <div>
          <h2>{editing ? 'Edit project' : 'Add a new project'}</h2>
          <p className="muted small mt-1">Give buyers everything they need to shortlist you.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(-1)}><ChevronLeft /> Back</button>
      </div>

      {error && <Notice type="err">{error}</Notice>}

      <section className="form-sec card">
        <h3>Project overview</h3>
        <p className="muted">The headline details buyers see first.</p>

        <div className="form-grid">
          <Field label="Project name" required error={errors.name} className="full">
            <input className={`input ${errors.name ? 'invalid' : ''}`} value={f.name} onChange={set('name')}
                   placeholder="e.g. RNI Grand Vista" required />
          </Field>

          <Field label="Tagline" className="full" hint="One line that sells the project">
            <input className="input" value={f.tagline} onChange={set('tagline')}
                   placeholder="e.g. Sky homes on the IT corridor" />
          </Field>

          <Field label="Project type" required>
            <select className="select" value={f.project_type} onChange={set('project_type')}>
              {TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </select>
          </Field>

          <Field label="Configuration" hint="e.g. 2, 3 & 4 BHK">
            <input className="input" value={f.configuration} onChange={set('configuration')}
                   placeholder="2, 3 & 4 BHK" />
          </Field>

          <Field label="Status">
            <select className="select" value={f.status} onChange={set('status')}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </Field>

          <Field label="RERA number" hint="Shows a verified badge on the listing">
            <input className="input" value={f.rera_no} onChange={set('rera_no')}
                   placeholder="TN/29/Building/0123/2019" />
          </Field>

          <Field label="Description" className="full">
            <textarea className="textarea" rows={5} value={f.description} onChange={set('description')}
                      placeholder="Describe the project, its location advantages, specifications and what makes it different." />
          </Field>
        </div>
      </section>

      <section className="form-sec card">
        <h3>Pricing &amp; inventory</h3>
        <p className="muted">Transparent ranges get more genuine leads than “price on request”.</p>

        <div className="form-grid">
          <Field label="Minimum price (₹)" hint={f.min_price ? money(f.min_price) : ''}>
            <input className="input" value={f.min_price} onChange={set('min_price')}
                   placeholder="e.g. 9800000" inputMode="numeric" />
          </Field>
          <Field label="Maximum price (₹)" hint={f.max_price ? money(f.max_price) : ''}>
            <input className="input" value={f.max_price} onChange={set('max_price')}
                   placeholder="e.g. 21500000" inputMode="numeric" />
          </Field>
          <Field label="Minimum area (sq.ft)">
            <input className="input" value={f.min_area} onChange={set('min_area')} placeholder="1080" inputMode="numeric" />
          </Field>
          <Field label="Maximum area (sq.ft)">
            <input className="input" value={f.max_area} onChange={set('max_area')} placeholder="2140" inputMode="numeric" />
          </Field>
          <Field label="Total units">
            <input className="input" value={f.total_units} onChange={set('total_units')} placeholder="386" inputMode="numeric" />
          </Field>
          <Field label="Towers / blocks">
            <input className="input" value={f.towers} onChange={set('towers')} placeholder="4" inputMode="numeric" />
          </Field>
          <Field label="Possession date">
            <input className="input" type="date" value={f.possession_on} onChange={set('possession_on')} />
          </Field>
        </div>
      </section>

      <section className="form-sec card">
        <h3>Location</h3>
        <div className="form-grid">
          <Field label="Locality" required error={errors.locality}>
            <input className={`input ${errors.locality ? 'invalid' : ''}`} value={f.locality}
                   onChange={set('locality')} placeholder="e.g. Perungudi, OMR" required />
          </Field>
          <Field label="City" required>
            <select className="select" value={f.city} onChange={set('city')} required>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Full address" className="full">
            <input className="input" value={f.address} onChange={set('address')}
                   placeholder="Survey no, road, landmark" />
          </Field>
        </div>
      </section>

      <section className="form-sec card">
        <h3>Images &amp; amenities</h3>
        <Field label="Project images" hint="First image becomes the cover">
          <ImagePicker value={f.images} onChange={(images) => setF((p) => ({ ...p, images }))} />
        </Field>

        <div className="mt-3">
          <Field label="Amenities" hint={`${f.amenities.length} selected`}>
            <div className="pills">
              {AMENITY_LIST.map((a) => (
                <button key={a} type="button" className={`pill ${f.amenities.includes(a) ? 'on' : ''}`}
                        onClick={() => toggleAmenity(a)}>
                  {f.amenities.includes(a) && <Check style={{ width: 13, height: 13 }} />} {a}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="row-between mt-3">
          <button type="button" className="btn btn-outline" onClick={() => nav(-1)}>Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? <><span className="spinner" /> Saving…</> : editing ? 'Save changes' : 'Publish project'}
          </button>
        </div>
      </section>
    </form>
  );
}
