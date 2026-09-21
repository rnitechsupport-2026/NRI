import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg, errFields } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import ImagePicker from '../../components/ImagePicker.jsx';
import TourEmbed from '../../components/TourEmbed.jsx';
import { Field, Notice, PageLoader } from '../../components/ui.jsx';
import { AMENITY_LIST, CITIES, TYPE_LABEL, PURPOSE_LABEL, money, titleCase } from '../../utils/format.js';
import { Cube, Check, ArrowRight, ChevronLeft, Info } from '../../components/Icons.jsx';

const BLANK = {
  title: '', description: '', purpose: 'sale', property_type: 'apartment',
  bhk: '', bathrooms: '', balconies: '', furnishing: 'unfurnished', facing: '',
  floor_no: '', total_floors: '', age_years: '', possession: 'ready-to-move',
  built_up_area: '', carpet_area: '', area_unit: 'sqft',
  price: '', price_negotiable: false, maintenance: '',
  address: '', locality: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '',
  amenities: [], images: [], tour_embed: '', video_url: '', floor_plan_url: '',
  status: 'active',
};

const STEPS = ['Basics', 'Details', 'Photos & 3D', 'Location & Price'];
const LAND_TYPES = ['plot', 'warehouse'];

export default function PropertyForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const editing = !!id;

  // Carried over from the owner registration wizard's "what are you listing?"
  // step — only applied to a brand-new listing, never while editing.
  const [f, setF] = useState(() => {
    if (editing) return BLANK;
    const purpose = searchParams.get('purpose');
    const propertyType = searchParams.get('type');
    const city = searchParams.get('city');
    const locality = searchParams.get('locality');
    return {
      ...BLANK,
      ...(purpose && PURPOSE_LABEL[purpose] ? { purpose } : {}),
      ...(propertyType && TYPE_LABEL[propertyType] ? { property_type: propertyType } : {}),
      ...(city ? { city } : {}),
      ...(locality ? { locality } : {}),
    };
  });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    api.get('/properties/meta/tour-providers')
      .then((r) => setProviders(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    api.get(`/properties/${id}`)
      .then((r) => {
        const p = r.data.data;
        setF({
          ...BLANK,
          ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ''])),
          amenities: Array.isArray(p.amenities) ? p.amenities : [],
          images: (p.images || []).map((i) => i.url),
          tour_embed: p.tour_url || '',
          price_negotiable: !!p.price_negotiable,
        });
      })
      .catch((e) => setError(errMsg(e, 'Could not load this listing')))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((prev) => ({ ...prev, [k]: v }));
  };

  const toggleAmenity = (a) => setF((prev) => ({
    ...prev,
    amenities: prev.amenities.includes(a)
      ? prev.amenities.filter((x) => x !== a)
      : [...prev.amenities, a],
  }));

  const isLand = LAND_TYPES.includes(f.property_type);
  const isRental = ['rent', 'pg', 'lease'].includes(f.purpose);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});

    // strip empty strings so the API's optional fields stay optional
    const payload = Object.fromEntries(
      Object.entries({ ...f, cover_image: f.images[0] || '' })
        .filter(([, v]) => v !== '' && v !== null)
    );
    payload.amenities = f.amenities;
    payload.images = f.images;
    payload.tour_embed = f.tour_embed || '';

    try {
      if (editing) {
        await api.put(`/properties/${id}`, payload);
        toast.success('Listing updated');
      } else {
        await api.post('/properties', payload);
        toast.success('Property posted! It is now live.');
      }
      nav('/dashboard/properties');
    } catch (err) {
      setError(errMsg(err));
      setErrors(errFields(err));
      setStep(0);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader label="Loading listing…" />;

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 0 }}>
      <div className="row-between mb-3">
        <div>
          <h2>{editing ? 'Edit property' : 'Post a property'}</h2>
          <p className="muted small mt-1">
            {editing ? 'Update the details and save your changes.' : 'Complete listings get up to 5× more enquiries.'}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(-1)}>
          <ChevronLeft /> Back
        </button>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => (
          <button key={s} type="button"
                  className={`step ${step === i ? 'on' : ''} ${step > i ? 'done' : ''}`}
                  onClick={() => setStep(i)}>
            <span className="n">{step > i ? '✓' : i + 1}</span> {s}
          </button>
        ))}
      </div>

      {error && <div className="mb-2"><Notice type="err">{error}</Notice></div>}

      {/* ------------------------------------------------- 1 basics */}
      {step === 0 && (
        <section className="form-sec card">
          <h3>Basic information</h3>
          <p className="muted">What are you listing, and for what purpose?</p>

          <div className="form-grid">
            <Field label="Listing title" required error={errors.title} className="full">
              <input className={`input ${errors.title ? 'invalid' : ''}`} value={f.title} onChange={set('title')}
                     placeholder="e.g. 3 BHK Premium Apartment in Adyar with Sea Breeze" required />
            </Field>

            <div className="full">
              <Field label="I want to" required>
                <div className="pills">
                  {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                    <button key={k} type="button" className={`pill ${f.purpose === k ? 'on' : ''}`}
                            onClick={() => setF((p) => ({ ...p, purpose: k }))}>{v}</button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="full">
              <Field label="Property type" required>
                <div className="pills">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <button key={k} type="button" className={`pill ${f.property_type === k ? 'on' : ''}`}
                            onClick={() => setF((p) => ({ ...p, property_type: k }))}>{v}</button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Built-up area" required error={errors.built_up_area}>
              <div className="row" style={{ gap: 8 }}>
                <input className={`input ${errors.built_up_area ? 'invalid' : ''}`} value={f.built_up_area}
                       onChange={set('built_up_area')} placeholder="e.g. 1650" inputMode="numeric" required />
                <select className="select" style={{ width: 110 }} value={f.area_unit} onChange={set('area_unit')}>
                  <option value="sqft">sq.ft</option>
                  <option value="sqyd">sq.yd</option>
                  <option value="cent">cent</option>
                  <option value="acre">acre</option>
                </select>
              </div>
            </Field>

            <Field label="Carpet area" hint="Optional, but buyers look for it">
              <input className="input" value={f.carpet_area} onChange={set('carpet_area')}
                     placeholder="e.g. 1350" inputMode="numeric" />
            </Field>

            <Field label="Description" className="full">
              <textarea className="textarea" rows={5} value={f.description} onChange={set('description')}
                        placeholder="Describe the property — condition, connectivity, nearby schools and hospitals, why someone would love living here." />
            </Field>
          </div>

          <div className="row-between mt-3">
            <span />
            <button type="button" className="btn btn-dark" onClick={() => setStep(1)}>Continue <ArrowRight /></button>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ 2 details */}
      {step === 1 && (
        <section className="form-sec card">
          <h3>Property details</h3>
          <p className="muted">The specifics buyers filter on.</p>

          <div className="form-grid">
            {!isLand && (
              <>
                <Field label="Bedrooms (BHK)">
                  <select className="select" value={f.bhk} onChange={set('bhk')}>
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} BHK</option>)}
                  </select>
                </Field>

                <Field label="Bathrooms">
                  <select className="select" value={f.bathrooms} onChange={set('bathrooms')}>
                    <option value="">Select</option>
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>

                <Field label="Balconies">
                  <select className="select" value={f.balconies} onChange={set('balconies')}>
                    <option value="">Select</option>
                    {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>

                <Field label="Furnishing">
                  <select className="select" value={f.furnishing} onChange={set('furnishing')}>
                    {['unfurnished', 'semi-furnished', 'fully-furnished'].map((v) => (
                      <option key={v} value={v}>{titleCase(v)}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Floor number">
                  <input className="input" value={f.floor_no} onChange={set('floor_no')}
                         placeholder="e.g. 4" inputMode="numeric" />
                </Field>

                <Field label="Total floors">
                  <input className="input" value={f.total_floors} onChange={set('total_floors')}
                         placeholder="e.g. 14" inputMode="numeric" />
                </Field>

                <Field label="Age of property (years)">
                  <input className="input" value={f.age_years} onChange={set('age_years')}
                         placeholder="e.g. 3" inputMode="numeric" />
                </Field>
              </>
            )}

            <Field label="Facing">
              <select className="select" value={f.facing} onChange={set('facing')}>
                <option value="">Select</option>
                {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West']
                  .map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>

            <Field label="Possession status">
              <select className="select" value={f.possession} onChange={set('possession')}>
                <option value="ready-to-move">Ready to move</option>
                <option value="under-construction">Under construction</option>
              </select>
            </Field>

            <div className="full">
              <Field label="Amenities" hint={`${f.amenities.length} selected`}>
                <div className="pills">
                  {AMENITY_LIST.map((a) => (
                    <button key={a} type="button"
                            className={`pill ${f.amenities.includes(a) ? 'on' : ''}`}
                            onClick={() => toggleAmenity(a)}>
                      {f.amenities.includes(a) && <Check style={{ width: 13, height: 13 }} />} {a}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(0)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={() => setStep(2)}>Continue <ArrowRight /></button>
          </div>
        </section>
      )}

      {/* ------------------------------------------- 3 photos & 3D */}
      {step === 2 && (
        <section className="form-sec card">
          <h3>Photos &amp; 3D walkthrough</h3>
          <p className="muted">Listings with photos and a 3D tour get far more genuine enquiries.</p>

          <Field label="Property photos" hint="First photo becomes the cover image">
            <ImagePicker value={f.images} onChange={(images) => setF((p) => ({ ...p, images }))} />
          </Field>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line-2)', margin: '26px 0' }} />

          <div className="row mb-2" style={{ gap: 10 }}>
            <Cube style={{ width: 22, height: 22, color: 'var(--gold-600)' }} />
            <h4>3D walkthrough / virtual tour</h4>
            <span className="badge badge-gold">Recommended</span>
          </div>

          <Field
            label="Embed code or share link"
            error={errors.tour_embed}
            hint="Paste the whole <iframe …> snippet or just the share URL — we extract and sanitise the source automatically."
          >
            <textarea
              className={`textarea ${errors.tour_embed ? 'invalid' : ''}`}
              rows={4}
              value={f.tour_embed}
              onChange={set('tour_embed')}
              placeholder={'<iframe src="https://my.matterport.com/show/?m=XXXXXXXX" …></iframe>\n\nor\n\nhttps://my.matterport.com/show/?m=XXXXXXXX'}
              style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '.82rem' }}
            />
          </Field>

          <div className="embed-help mt-2">
            <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <Info style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
              <div>
                <b>Supported providers:</b> Matterport, Kuula, YouTube 360, Vimeo, Sketchfab,
                Google Street View, Roundme, Momento360, InsideMaps, Cupix and Panoee.
                <br />
                Anything else is rejected for security — we never render pasted HTML directly.
                {providers.length > 0 && (
                  <div className="tiny mt-1">Allowed hosts: <code>{providers.join(', ')}</code></div>
                )}
              </div>
            </div>
          </div>

          {f.tour_embed?.trim() && (
            <div className="embed-preview">
              <p className="small strong mb-1">Live preview</p>
              <TourEmbed
                url={extractPreviewSrc(f.tour_embed)}
                provider="matterport"
                poster={f.images[0]}
                title="Tour preview"
              />
              <p className="tiny muted mt-1">
                If the preview doesn&apos;t load, the link may not be from a supported provider —
                saving will tell you for sure.
              </p>
            </div>
          )}

          <div className="form-grid mt-3">
            <Field label="Video walkthrough URL" hint="YouTube or Vimeo link (optional)">
              <input className="input" value={f.video_url} onChange={set('video_url')}
                     placeholder="https://www.youtube.com/watch?v=…" />
            </Field>
            <Field label="Floor plan image URL" hint="Optional">
              <input className="input" value={f.floor_plan_url} onChange={set('floor_plan_url')}
                     placeholder="https://…/floor-plan.jpg" />
            </Field>
          </div>

          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}><ChevronLeft /> Back</button>
            <button type="button" className="btn btn-dark" onClick={() => setStep(3)}>Continue <ArrowRight /></button>
          </div>
        </section>
      )}

      {/* --------------------------------------- 4 location & price */}
      {step === 3 && (
        <section className="form-sec card">
          <h3>Location &amp; pricing</h3>
          <p className="muted">Where is it, and what are you asking?</p>

          <div className="form-grid">
            <Field label="Locality" required error={errors.locality}>
              <input className={`input ${errors.locality ? 'invalid' : ''}`} value={f.locality}
                     onChange={set('locality')} placeholder="e.g. Adyar" required />
            </Field>

            <Field label="City" required error={errors.city}>
              <select className={`select ${errors.city ? 'invalid' : ''}`} value={f.city} onChange={set('city')} required>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="State">
              <input className="input" value={f.state} onChange={set('state')} placeholder="Tamil Nadu" />
            </Field>

            <Field label="Pincode">
              <input className="input" value={f.pincode} onChange={set('pincode')}
                     placeholder="600020" inputMode="numeric" maxLength={6} />
            </Field>

            <Field label="Full address" className="full">
              <input className="input" value={f.address} onChange={set('address')}
                     placeholder="Door no, street, landmark" />
            </Field>

            <Field label={isRental ? 'Monthly rent (₹)' : 'Expected price (₹)'} required error={errors.price}
                   hint={f.price ? `That's ${money(f.price)}` : 'Enter the full amount in rupees'}>
              <input className={`input ${errors.price ? 'invalid' : ''}`} value={f.price} onChange={set('price')}
                     placeholder={isRental ? 'e.g. 32000' : 'e.g. 21500000'} inputMode="numeric" required />
            </Field>

            {isRental && (
              <Field label="Maintenance (₹ / month)">
                <input className="input" value={f.maintenance} onChange={set('maintenance')}
                       placeholder="e.g. 3000" inputMode="numeric" />
              </Field>
            )}

            <Field label="Listing status">
              <select className="select" value={f.status} onChange={set('status')}>
                <option value="active">Active — visible to buyers</option>
                <option value="inactive">Paused — hidden</option>
                <option value="sold">Sold</option>
                <option value="rented">Rented out</option>
              </select>
            </Field>

            <div className="full">
              <label className="checkline">
                <input type="checkbox" checked={f.price_negotiable} onChange={set('price_negotiable')} />
                Price is negotiable
              </label>
            </div>
          </div>

          <div className="row-between mt-3">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}><ChevronLeft /> Back</button>
            <button className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? <><span className="spinner" /> Saving…</> : editing ? 'Save changes' : 'Publish listing'}
            </button>
          </div>
        </section>
      )}
    </form>
  );
}

/** Mirror of the server-side extractor, just enough for the local preview. */
function extractPreviewSrc(input) {
  const raw = String(input || '').trim();
  const m = raw.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
  const src = (m ? m[1] : raw).trim();
  return /^https?:\/\//i.test(src) ? src : '';
}
