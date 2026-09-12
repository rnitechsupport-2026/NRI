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
  priceLabel, area, rupees, timeAgo, titleCase, PURPOSE_LABEL, TYPE_LABEL, ROLE_LABEL, shareUrl,
} from '../utils/format.js';
import {
  MapPin, Bed, Bath, Ruler, Heart, Shield, Cube, Camera, Eye, ChevronLeft, ChevronRight,
  Check, Compass, Sofa, Stairs, Clock, Building, Phone, Document, Play, Layers, Send,
  Elevator, Bolt, Car, Dumbbell, Waves, Ball, Tree, Flame, Droplet, FireSafety, Wifi, Run, Dice,
  Filter,
} from '../components/Icons.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80';

// One glyph per amenity from AMENITY_LIST (utils/format.js) — anything outside
// that fixed list (older freeform data) just falls back to a plain check.
const AMENITY_ICON = {
  'Lift': Elevator,
  'Power Backup': Bolt,
  'Covered Parking': Car,
  'Security': Shield,
  'CCTV': Camera,
  'Gym': Dumbbell,
  'Swimming Pool': Waves,
  "Children's Play Area": Ball,
  'Clubhouse': Building,
  'Park': Tree,
  'Gas Pipeline': Flame,
  'Rain Water Harvesting': Droplet,
  'Intercom': Phone,
  'Fire Safety': FireSafety,
  'Visitor Parking': Car,
  'Water Purifier': Filter,
  'Servant Room': Bed,
  'Wi-Fi': Wifi,
  'Jogging Track': Run,
  'Indoor Games': Dice,
};

export default function PropertyDetail() {
  const { idOrSlug } = useParams();
  const { isAuthed } = useAuth();
  const toast = useToast();

  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const [activeMedia, setActiveMedia] = useState(null); // null | 'tour' | 'plan' | 'video'

  useEffect(() => {
    let live = true;
    setP(null); setError(''); setIdx(0); setActiveMedia(null);
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl(p));
      toast.success('Link copied — paste it anywhere, WhatsApp shows the photo & price automatically');
    } catch {
      toast.error('Could not copy the link');
    }
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

  const shortListingId = `RNI-${String(p.id).slice(-8).toUpperCase()}`;

  const specs = [
    ['Property type', TYPE_LABEL[p.property_type] || titleCase(p.property_type) || '—'],
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
    ['Listing ID', shortListingId],
  ];

  const otherMedia = [
    ...(p.tour_url ? [{ k: 'tour', label: '3D Walkthrough', icon: Cube }] : []),
    ...(p.floor_plan_url ? [{ k: 'plan', label: 'Floor Plan', icon: Layers }] : []),
    ...(p.video_url ? [{ k: 'video', label: 'Video', icon: Play }] : []),
  ];

  const address = [p.address, p.locality, p.city].filter(Boolean).join(', ');

  return (
    <>
      <div className="pd-crumbbar">
        <div className="container">
          <Crumbs items={[
            { label: 'Home', to: '/' },
            { label: 'Properties', to: `/properties?purpose=${p.purpose}` },
            { label: p.city, to: `/properties?city=${encodeURIComponent(p.city)}` },
            { label: p.title },
          ]} />
        </div>
      </div>

      <section className="section-sm">
        <div className="container detail-layout">
          {/* ------------------------------------------------- main */}
          <div className="stack" style={{ gap: 22 }}>
            {/* photo hero */}
            <div className="pd-hero">
              <div className="pd-hero-media">
                <img src={images[idx]} alt={p.title}
                     onError={(e) => { e.currentTarget.src = FALLBACK; }} />
                <div className="pd-hero-scrim" />

                <div className="pd-hero-badges">
                  <span className="badge badge-gold">{PURPOSE_LABEL[p.purpose]}</span>
                  {!!p.is_verified && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified</span>}
                  {p.tour_url && <span className="badge" style={{ background: '#fff', color: 'var(--navy-800)' }}><Cube style={{ width: 12, height: 12 }} /> 3D Tour</span>}
                </div>

                <div className="pd-hero-actions">
                  <div className="row">
                    <button onClick={copyLink} aria-label="Share this property" title="Share">
                      <Send style={{ width: 17, height: 17 }} />
                    </button>
                    <button onClick={toggleFav} className={fav ? 'on' : ''} aria-label="Shortlist this property" title="Shortlist">
                      <Heart style={{ width: 18, height: 18, fill: fav ? 'currentColor' : 'none' }} />
                    </button>
                  </div>
                  {images.length > 1 && <span className="pd-hero-count">{idx + 1} / {images.length}</span>}
                </div>

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

                <div className="pd-hero-info">
                  <div>
                    <h1>{p.title}</h1>
                    <div className="addr"><MapPin style={{ width: 14, height: 14 }} /> {address}</div>
                  </div>
                  <div className="pd-hero-price">
                    <div className="amt">{price.main}{price.suffix && ` ${price.suffix}`}</div>
                    <div className="sub">
                      {p.built_up_area ? `${rupees(Math.round(p.price / p.built_up_area))} / ${p.area_unit}` : ''}
                      {p.price_negotiable ? ' · Negotiable' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {images.length > 1 && (
                <div className="gallery-thumbs" style={{ background: 'var(--navy-900)' }}>
                  {images.map((src, i) => (
                    <button key={i} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* trust-at-a-glance */}
            <div className="pd-meta-strip">
              <span><Eye style={{ width: 15, height: 15 }} /> {p.views} views</span>
              <span><Clock style={{ width: 15, height: 15 }} /> Posted {timeAgo(p.created_at)}</span>
              <span><Document style={{ width: 15, height: 15 }} /> ID {shortListingId}</span>
            </div>

            {/* 3D tour / floor plan / video — kept as their own sections rather than
                forced into the photo hero, since TourEmbed carries its own control
                bar (fullscreen, open-in-new-tab) that doesn't fit an overlay frame */}
            {otherMedia.length > 0 && (
              <div className="pd-media-pills">
                {otherMedia.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.k} className={activeMedia === m.k ? 'on' : ''}
                            onClick={() => setActiveMedia((cur) => (cur === m.k ? null : m.k))}>
                      <Icon style={{ width: 15, height: 15 }} /> {m.label}
                    </button>
                  );
                })}
              </div>
            )}

            {activeMedia === 'tour' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <TourEmbed url={p.tour_url} provider={p.tour_provider}
                           poster={images[0]} title={`3D walkthrough — ${p.title}`} />
              </div>
            )}
            {activeMedia === 'plan' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="gallery">
                  <div className="gallery-main" style={{ background: '#fff' }}>
                    <img src={p.floor_plan_url} alt="Floor plan" style={{ objectFit: 'contain' }} />
                  </div>
                </div>
              </div>
            )}
            {activeMedia === 'video' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <TourEmbed url={p.video_url} provider="youtube" poster={images[0]} title="Property video" />
              </div>
            )}

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
                  <span className="ic"><Icon /></span>
                  <b>{value}</b>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* description */}
            <div className="card card-p">
              <h3 className="mb-2">About this property</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{p.description || 'No description provided.'}</p>
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
                  {amenities.map((a) => {
                    const Icon = AMENITY_ICON[a] || Check;
                    return (
                      <div className="amenity" key={a}>
                        <span className="ic"><Icon /></span> {a}
                      </div>
                    );
                  })}
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
