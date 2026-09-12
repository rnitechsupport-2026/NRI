import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, errFields } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import ImagePicker from '../../components/ImagePicker.jsx';
import { Field, Notice, PageLoader } from '../../components/ui.jsx';
import { AMENITY_LIST, CITIES, money, titleCase } from '../../utils/format.js';
import { Check, ChevronLeft, Shield, Document, Upload } from '../../components/Icons.jsx';

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
    <>
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

    {editing && <VerificationPanel projectId={id} />}
    </>
  );
}

const VERIF_STATUS_META = {
  not_submitted: { label: 'Not submitted', cls: 'badge-outline' },
  submitted: { label: 'Submitted', cls: 'badge-blue' },
  under_review: { label: 'Under review', cls: 'badge-amber' },
  verified: { label: 'Verified', cls: 'badge-green' },
  rejected: { label: 'Rejected', cls: 'badge-red' },
};

const DOC_TYPES = [
  { key: 'rera_certificate', label: 'RERA registration certificate', required: true },
  { key: 'jda_poa', label: 'JDA / POA', jdaOnly: true },
  { key: 'encumbrance_certificate', label: 'Encumbrance Certificate' },
  { key: 'approval_doc', label: 'Government approval (planning / building plan / Fire NOC etc.)' },
];

/**
 * RERA / land-rights / approvals compliance — separate from the listing
 * fields above. Reviewed independently by an admin per project (a builder
 * can be verified while one project still has an open issue).
 */
function VerificationPanel({ projectId }) {
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [v, setV] = useState({
    rera_promoter_name: '', survey_numbers: '', village: '', taluk: '', district: '',
    land_ownership_type: 'owned', landowner_name: '',
  });
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => Promise.all([
    api.get(`/projects/${projectId}`).then((r) => {
      const p = r.data.data;
      setProject(p);
      setV({
        rera_promoter_name: p.reraPromoterName || '',
        survey_numbers: (p.surveyNumbers || []).join(', '),
        village: p.village || '', taluk: p.taluk || '', district: p.district || '',
        land_ownership_type: p.landOwnershipType || 'owned',
        landowner_name: p.landownerName || '',
      });
    }),
    api.get(`/projects/${projectId}/documents`).then((r) => setDocuments(r.data.data)),
  ]);

  useEffect(() => { load(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canEdit = project && ['not_submitted', 'rejected'].includes(project.verificationStatus);
  const docFor = (type) => documents.find((d) => d.type === type);

  async function saveDetails() {
    setBusy(true); setError('');
    try {
      await api.put(`/projects/${projectId}/verification-details`, {
        rera_promoter_name: v.rera_promoter_name || undefined,
        survey_numbers: v.survey_numbers.split(',').map((s) => s.trim()).filter(Boolean),
        village: v.village || undefined,
        taluk: v.taluk || undefined,
        district: v.district || undefined,
        land_ownership_type: v.land_ownership_type,
        landowner_name: v.landowner_name || undefined,
      });
      toast.success('Verification details saved');
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally { setBusy(false); }
  }

  async function submitForVerification() {
    setSubmitting(true); setError('');
    try {
      await api.post(`/projects/${projectId}/submit-verification`);
      toast.success('Submitted for verification');
      load();
    } catch (err) {
      setError(errMsg(err));
    } finally { setSubmitting(false); }
  }

  if (!project) return null;
  const meta = VERIF_STATUS_META[project.verificationStatus] || VERIF_STATUS_META.not_submitted;

  return (
    <section className="form-sec card mt-3">
      <div className="row-between mb-1">
        <h3 className="row" style={{ gap: 8 }}><Shield style={{ width: 17, height: 17, color: 'var(--gold-600)' }} /> Legal &amp; RERA verification</h3>
        <span className={`badge ${meta.cls}`}>{meta.label}</span>
      </div>
      <p className="muted">An admin reviews this against MCA/RERA/land records — separate from the listing details above. Required before this project shows as verified to buyers.</p>

      {project.verificationStatus === 'rejected' && project.reviewNote && (
        <Notice type="err">Rejected: {project.reviewNote} — update the details/documents below and resubmit.</Notice>
      )}
      {error && <Notice type="err">{error}</Notice>}

      <div className="form-grid mt-2">
        <Field label="RERA promoter name" hint="Exact name as shown on the RERA certificate — must match your registered legal entity name" className="full">
          <input className="input" value={v.rera_promoter_name} disabled={!canEdit}
                 onChange={(e) => setV((s) => ({ ...s, rera_promoter_name: e.target.value }))} />
        </Field>
        <Field label="Survey number(s)" hint="Comma separated" className="full">
          <input className="input" value={v.survey_numbers} disabled={!canEdit}
                 onChange={(e) => setV((s) => ({ ...s, survey_numbers: e.target.value }))} placeholder="e.g. 45/2, 45/3" />
        </Field>
        <Field label="Village">
          <input className="input" value={v.village} disabled={!canEdit} onChange={(e) => setV((s) => ({ ...s, village: e.target.value }))} />
        </Field>
        <Field label="Taluk">
          <input className="input" value={v.taluk} disabled={!canEdit} onChange={(e) => setV((s) => ({ ...s, taluk: e.target.value }))} />
        </Field>
        <Field label="District">
          <input className="input" value={v.district} disabled={!canEdit} onChange={(e) => setV((s) => ({ ...s, district: e.target.value }))} />
        </Field>
        <div className="full">
          <Field label="Land ownership">
            <div className="pills">
              {[['owned', 'Promoter owns the land'], ['jda_poa', 'JDA / POA (not the landowner)']].map(([k, l]) => (
                <button key={k} type="button" className={`pill ${v.land_ownership_type === k ? 'on' : ''}`} disabled={!canEdit}
                        onClick={() => setV((s) => ({ ...s, land_ownership_type: k }))}>{l}</button>
              ))}
            </div>
          </Field>
        </div>
        {v.land_ownership_type === 'jda_poa' && (
          <Field label="Landowner name" className="full">
            <input className="input" value={v.landowner_name} disabled={!canEdit}
                   onChange={(e) => setV((s) => ({ ...s, landowner_name: e.target.value }))} />
          </Field>
        )}
      </div>
      {canEdit && (
        <div className="row mt-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={saveDetails} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Save details'}
          </button>
        </div>
      )}

      <div className="stack mt-3" style={{ gap: 12 }}>
        {DOC_TYPES.filter((t) => !t.jdaOnly || v.land_ownership_type === 'jda_poa').map((t) => (
          <ProjectDocUploader key={t.key} projectId={projectId} type={t.key} label={t.label} required={t.required}
                               existing={docFor(t.key)} disabled={!canEdit}
                               onUploaded={(d) => setDocuments((ds) => [...ds.filter((x) => x.type !== t.key), d])} />
        ))}
      </div>

      {canEdit && (
        <div className="row-between mt-3">
          <span className="tiny muted">Once submitted, an admin reviews these details and documents.</span>
          <button type="button" className="btn btn-primary" onClick={submitForVerification} disabled={submitting}>
            {submitting ? <><span className="spinner" /> Submitting…</> : 'Submit for verification'}
          </button>
        </div>
      )}
    </section>
  );
}

function ProjectDocUploader({ projectId, type, label, required, existing, disabled, onUploaded }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('type', type);
      form.append('file', file);
      const { data } = await api.post(`/projects/${projectId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(data.data);
      setFile(null);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(errMsg(err, 'Upload failed'));
    } finally { setBusy(false); }
  }

  return (
    <div className="card card-p" style={{ background: 'var(--line-2)' }}>
      <div className="row-between mb-2">
        <div className="row" style={{ gap: 8 }}>
          <Document style={{ width: 17, height: 17, color: 'var(--gold-600)' }} />
          <b className="small">{label}</b>{required && <span className="req">*</span>}
        </div>
        {existing && (
          <span className={`badge ${existing.status === 'verified' ? 'badge-green' : existing.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
            {existing.status === 'submitted' ? 'Uploaded' : existing.status}
          </span>
        )}
      </div>
      {existing?.status === 'rejected' && existing.reviewNote && (
        <p className="tiny" style={{ color: 'var(--red)' }}>Rejected: {existing.reviewNote} — upload a new file to resubmit.</p>
      )}
      {!disabled && (
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                 onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="button" className="btn btn-xs btn-dark" onClick={upload} disabled={!file || busy}>
            {busy ? <span className="spinner" /> : <Upload style={{ width: 14, height: 14 }} />} {existing ? 'Replace' : 'Upload'}
          </button>
        </div>
      )}
    </div>
  );
}
