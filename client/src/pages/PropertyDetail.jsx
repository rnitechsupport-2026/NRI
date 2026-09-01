import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';
import TourEmbed from '../components/TourEmbed.jsx';
import PropertyBot from '../components/PropertyBot.jsx';
import Recommendations from '../components/bots/Recommendations.jsx';
import { Avatar, Crumbs, Notice, PageLoader } from '../components/ui.jsx';
import {
  priceLabel, area, rupees, timeAgo, titleCase, PURPOSE_LABEL, TYPE_LABEL, ROLE_LABEL,
} from '../utils/format.js';
import {
  MapPin, Bed, Bath, Ruler, Heart, Shield, Cube, Camera, Eye, ChevronLeft, ChevronRight,
  Check, Compass, Sofa, Stairs, Clock, Building, Phone, Document, Play, Layers,
} from '../components/Icons.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80';

export default function PropertyDetail() {
  const { idOrSlug } = useParams();
  const { isAuthed } = useAuth();
  const toast = useToast();

  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('photos');
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let live = true;
    setP(null); setError(''); setIdx(0); setTab('photos');
    api.get(`/properties/${idOrSlug}`)
      .then((r) => {
        if (!live) return;
        setP(r.data.data);
        setFav(!!r.data.data.is_favorite);
      })
      .catch((e) => live && setError(errMsg(e, 'Property not found')));
    return () => { live = false; };
  }, [idOrSlug]);

  async function toggleFav() {
    if (!isAuthed) { toast.info('Please login to shortlist this property'); return; }
    try {
      const { data } = await api.post(`/properties/${p.id}/favorite`);
      setFav(data.is_favorite);
      toast.success(data.is_favorite ? 'Added to shortlist' : 'Removed from shortlist');
    } catch { toast.error('Could not update shortlist'); }
  }

  if (error) {
    return (
      <div className="container section">
        <Notice type="err">{error}</Notice>
        <Link to="/properties" className="btn btn-dark mt-3">Browse all properties</Link>
      </div>
    );
  }
  if (!p) return <PageLoader label="Loading property…" />;

  const images = p.images?.length ? p.images.map((i) => i.url) : [p.cover_image || FALLBACK];
  const price = priceLabel(p.purpose, p.price);
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];

  const specs = [
    ['Property type', TYPE_LABEL[p.property_type]],
    ['Configuration', p.bhk ? `${p.bhk} BHK` : '—'],
    ['Bathrooms', p.bathrooms || '—'],
    ['Balconies', p.balconies ?? '—'],
    ['Built-up area', area(p.built_up_area, p.area_unit)],
    ['Carpet area', area(p.carpet_area, p.area_unit)],
    ['Furnishing', p.furnishing ? titleCase(p.furnishing) : '—'],
    ['Facing', p.facing || '—'],
    ['Floor', p.floor_no ? `${p.floor_no} of ${p.total_floors || '—'}` : '—'],
    ['Age of property', p.age_years != null ? `${p.age_years} years` : '—'],
    ['Possession', p.possession ? titleCase(p.possession) : '—'],
    ['Maintenance', p.maintenance ? `${rupees(p.maintenance)} / month` : 'Not applicable'],
    ['Pincode', p.pincode || '—'],
    ['Listing ID', `RNI-${String(p.id).padStart(5, '0')}`],
  ];

  const TABS = [
    { k: 'photos', label: `Photos (${images.length})`, icon: Camera },
    ...(p.tour_url ? [{ k: 'tour', label: '3D Walkthrough', icon: Cube }] : []),
    ...(p.floor_plan_url ? [{ k: 'plan', label: 'Floor Plan', icon: Layers }] : []),
    ...(p.video_url ? [{ k: 'video', label: 'Video', icon: Play }] : []),
  ];

  return (
    <>
      <div className="pagehead" style={{ padding: '32px 0' }}>
        <div className="container">
          <Crumbs items={[
            { label: 'Home', to: '/' },
            { label: 'Properties', to: `/properties?purpose=${p.purpose}` },
            { label: p.city, to: `/properties?city=${encodeURIComponent(p.city)}` },
            { label: p.title },
          ]} />
          <div className="row-between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="row mb-1" style={{ gap: 7, flexWrap: 'wrap' }}>
                <span className="badge badge-gold">{PURPOSE_LABEL[p.purpose]}</span>
                {!!p.is_verified && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified</span>}
                {p.tour_url && <span className="badge badge-navy" style={{ background: '#fff', color: 'var(--navy-800)' }}><Cube style={{ width: 12, height: 12 }} /> 3D Tour</span>}
              </div>
              <h1>{p.title}</h1>
              <p className="row" style={{ gap: 6 }}>
                <MapPin style={{ width: 16, height: 16, color: 'var(--gold-500)' }} />
                {p.address ? `${p.address}, ` : ''}{p.locality}, {p.city}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 800, color: 'var(--gold-500)' }}>
                {price.main}<span style={{ fontSize: '.9rem', fontWeight: 600 }}>{price.suffix && ` ${price.suffix}`}</span>
              </div>
              <div className="small" style={{ color: 'rgba(255,255,255,.7)' }}>
                {p.built_up_area ? `${rupees(Math.round(p.price / p.built_up_area))} / ${p.area_unit}` : ''}
                {p.price_negotiable ? ' · Negotiable' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container detail-layout">
          {/* ------------------------------------------------- main */}
          <div className="stack" style={{ gap: 22 }}>
            {/* media tabs */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="tabs" style={{ padding: '0 8px' }}>
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
                      <span className="row" style={{ gap: 7 }}>
                        <Icon style={{ width: 15, height: 15 }} /> {t.label}
                      </span>
                    </button>
                  );
                })}
                <span className="spacer" />
                <button onClick={toggleFav} className="row" style={{ padding: '12px 16px', gap: 7, fontWeight: 600, fontSize: '.88rem', color: fav ? 'var(--red)' : 'var(--muted)' }}>
                  <Heart style={{ width: 16, height: 16, fill: fav ? 'currentColor' : 'none' }} />
                  {fav ? 'Shortlisted' : 'Shortlist'}
                </button>
              </div>

              <div style={{ padding: 8 }}>
                {tab === 'photos' && (
                  <div className="gallery">
                    <div className="gallery-main">
                      <img src={images[idx]} alt={p.title}
                           onError={(e) => { e.currentTarget.src = FALLBACK; }} />
                      {images.length > 1 && (
                        <>
                          <button className="gallery-nav prev" aria-label="Previous photo"
                                  onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}>
                            <ChevronLeft />
                          </button>
                          <button className="gallery-nav next" aria-label="Next photo"
                                  onClick={() => setIdx((i) => (i + 1) % images.length)}>
                            <ChevronRight />
                          </button>
                        </>
                      )}
                      <span className="gallery-count">{idx + 1} / {images.length}</span>
                    </div>
                    {images.length > 1 && (
                      <div className="gallery-thumbs">
                        {images.map((src, i) => (
                          <button key={i} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
                            <img src={src} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'tour' && (
                  <TourEmbed url={p.tour_url} provider={p.tour_provider}
                             poster={images[0]} title={`3D walkthrough — ${p.title}`} />
                )}

                {tab === 'plan' && (
                  <div className="gallery">
                    <div className="gallery-main" style={{ background: '#fff' }}>
                      <img src={p.floor_plan_url} alt="Floor plan" style={{ objectFit: 'contain' }} />
                    </div>
                  </div>
                )}

                {tab === 'video' && (
                  <TourEmbed url={p.video_url} provider="youtube" poster={images[0]} title="Property video" />
                )}
              </div>
            </div>

            {/* key facts */}
            <div className="keyfacts">
              {[
                { icon: Bed, label: 'Bedrooms', value: p.bhk ? `${p.bhk} BHK` : '—' },
                { icon: Bath, label: 'Bathrooms', value: p.bathrooms || '—' },
                { icon: Ruler, label: 'Built-up', value: area(p.built_up_area, p.area_unit) },
                { icon: Sofa, label: 'Furnishing', value: p.furnishing ? titleCase(p.furnishing).replace('-', ' ') : '—' },
                { icon: Compass, label: 'Facing', value: p.facing || '—' },
                { icon: Stairs, label: 'Floor', value: p.floor_no ? `${p.floor_no}/${p.total_floors || '—'}` : '—' },
                { icon: Clock, label: 'Possession', value: p.possession === 'ready-to-move' ? 'Ready' : 'Under const.' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="keyfact">
                  <Icon />
                  <b>{value}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* 3D teaser when the tour tab isn't open */}
            {p.tour_url && tab !== 'tour' && (
              <button className="card card-p row-between card-hover" onClick={() => setTab('tour')}
                      style={{ textAlign: 'left', background: 'linear-gradient(120deg, var(--navy-900), var(--navy-700))', border: 'none', color: '#fff' }}>
                <div className="row" style={{ gap: 16 }}>
                  <span className="ftile-ic" style={{ background: 'rgba(228,161,27,.18)' }}><Cube /></span>
                  <div>
                    <h4 style={{ color: '#fff' }}>Take the 3D walkthrough</h4>
                    <p className="small" style={{ color: 'rgba(255,255,255,.7)' }}>
                      Move room to room, look up, look down — exactly like being there.
                    </p>
                  </div>
                </div>
                <span className="btn btn-primary btn-sm">Launch tour</span>
              </button>
            )}

            {/* description */}
            <div className="card card-p">
              <h3 className="mb-2">About this property</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{p.description || 'No description provided.'}</p>
              <div className="row mt-3 small muted" style={{ gap: 20, flexWrap: 'wrap' }}>
                <span className="row" style={{ gap: 6 }}><Eye style={{ width: 15, height: 15 }} /> {p.views} views</span>
                <span className="row" style={{ gap: 6 }}><Clock style={{ width: 15, height: 15 }} /> Posted {timeAgo(p.created_at)}</span>
                <span className="row" style={{ gap: 6 }}><Document style={{ width: 15, height: 15 }} /> ID RNI-{String(p.id).padStart(5, '0')}</span>
              </div>
            </div>

            {/* specs */}
            <div className="card card-p">
              <h3 className="mb-2">Property details</h3>
              <div className="spec-grid">
                {specs.map(([k, v]) => (
                  <div className="spec-row" key={k}><span>{k}</span><b>{v}</b></div>
                ))}
              </div>
            </div>

            {/* amenities */}
            {amenities.length > 0 && (
              <div className="card card-p">
                <h3 className="mb-2">Amenities</h3>
                <div className="amenity-grid">
                  {amenities.map((a) => (
                    <div className="amenity" key={a}>
                      <span className="ic"><Check /></span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* location */}
            <div className="card card-p">
              <h3 className="mb-2">Location</h3>
              <p className="muted small mb-2">
                {p.address ? `${p.address}, ` : ''}{p.locality}, {p.city}{p.state ? `, ${p.state}` : ''} {p.pincode || ''}
              </p>
              <div style={{ borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                <iframe
                  title="Location map"
                  width="100%" height="320" style={{ border: 0, display: 'block' }}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(`${p.locality}, ${p.city}, ${p.state || 'India'}`)}&output=embed`}
                />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------- side */}
          <aside className="sticky-side">
            <div className="card price-box">
              <div className="row-between">
                <div>
                  <div className="p">{price.main}</div>
                  <div className="ps">
                    {price.suffix || (p.built_up_area ? `${rupees(Math.round(p.price / p.built_up_area))} per ${p.area_unit}` : '')}
                  </div>
                </div>
                {!!p.price_negotiable && <span className="badge badge-amber">Negotiable</span>}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--line-2)', margin: '16px 0' }} />

              <div className="row" style={{ gap: 12 }}>
                <Avatar src={p.owner_avatar} name={p.owner_name} size="avatar-lg"
                        className="avatar-ring" style={{ width: 54, height: 54 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="strong">{p.owner_company || p.owner_name}</div>
                  <div className="small muted">
                    {ROLE_LABEL[p.owner_role]}
                    {p.owner_experience ? ` · ${p.owner_experience} yrs exp.` : ''}
                  </div>
                  {!!p.owner_verified && (
                    <span className="badge badge-green mt-1"><Shield style={{ width: 11, height: 11 }} /> Verified</span>
                  )}
                </div>
              </div>

              <div className="stack mt-3" style={{ gap: 10 }}>
                <a className="btn btn-dark btn-block" href={`tel:${p.owner_phone}`}>
                  <Phone /> {p.owner_phone}
                </a>
                <Link to={`/profile/${p.owner_id}`} className="btn btn-outline btn-block btn-sm">
                  View all listings by this {ROLE_LABEL[p.owner_role].toLowerCase()}
                </Link>
              </div>
            </div>

            <EnquiryForm propertyId={p.id} contactPhone={p.owner_phone} />

            <div className="card card-p">
              <h4 className="mb-2">Safety tips</h4>
              <ul className="stack small muted" style={{ gap: 9 }}>
                {[
                  'Never pay an advance before verifying ownership documents.',
                  'Always visit the property in person before any payment.',
                  'Insist on a written agreement for every transaction.',
                ].map((t) => (
                  <li key={t} className="row" style={{ gap: 9, alignItems: 'flex-start' }}>
                    <Shield style={{ width: 15, height: 15, color: 'var(--gold-600)', flexShrink: 0, marginTop: 2 }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Floating AI assistant — fixed to the right edge, opens on click */}
      <PropertyBot propertyId={p.id} title={p.title} price={p.price} purpose={p.purpose} />

      {/* Recommendation bot — scored matches with a reason on each */}
      <section className="section section-tint">
        <div className="container">
          <Recommendations
            source={p.id}
            title={`Similar homes in ${p.city}`}
            subtitle="Scored on locality, budget and configuration — not just the same city."
            cols="g-4"
          />
        </div>
      </section>
    </>
  );
}
