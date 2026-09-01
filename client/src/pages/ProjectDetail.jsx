import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { Avatar, Crumbs, Notice, PageLoader } from '../components/ui.jsx';
import { money, area, shortDate, titleCase } from '../utils/format.js';
import {
  MapPin, Building, Layers, Calendar, Shield, Check, Phone, ChevronLeft, ChevronRight, Document,
} from '../components/Icons.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

export default function ProjectDetail() {
  const { idOrSlug } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let live = true;
    setP(null); setError(''); setIdx(0);
    api.get(`/projects/${idOrSlug}`)
      .then((r) => live && setP(r.data.data))
      .catch((e) => live && setError(errMsg(e, 'Project not found')));
    return () => { live = false; };
  }, [idOrSlug]);

  if (error) {
    return (
      <div className="container section">
        <Notice type="err">{error}</Notice>
        <Link to="/projects" className="btn btn-dark mt-3">Browse all projects</Link>
      </div>
    );
  }
  if (!p) return <PageLoader label="Loading project…" />;

  const images = p.images?.length ? p.images.map((i) => i.url) : [p.cover_image || FALLBACK];
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];

  const facts = [
    { icon: Building, label: 'Project type', value: titleCase(p.project_type) },
    { icon: Layers, label: 'Configuration', value: p.configuration || '—' },
    { icon: Building, label: 'Total units', value: p.total_units || '—' },
    { icon: Layers, label: 'Towers', value: p.towers || '—' },
    { icon: Calendar, label: 'Possession', value: p.possession_on ? shortDate(p.possession_on) : '—' },
    { icon: MapPin, label: 'Location', value: p.locality },
  ];

  return (
    <>
      <div className="pagehead" style={{ padding: '32px 0' }}>
        <div className="container">
          <Crumbs items={[
            { label: 'Home', to: '/' },
            { label: 'Projects', to: '/projects' },
            { label: p.name },
          ]} />
          <div className="row-between" style={{ alignItems: 'flex-end' }}>
            <div>
              <div className="row mb-1" style={{ gap: 7 }}>
                <span className="badge badge-gold">{titleCase(p.status)}</span>
                {p.rera_no && <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> RERA</span>}
              </div>
              <h1>{p.name}</h1>
              {p.tagline && <p style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{p.tagline}</p>}
              <p className="row" style={{ gap: 6 }}>
                <MapPin style={{ width: 16, height: 16, color: 'var(--gold-500)' }} /> {p.locality}, {p.city}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="small" style={{ color: 'rgba(255,255,255,.65)' }}>Price range</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.7rem', fontWeight: 800, color: 'var(--gold-500)' }}>
                {p.min_price ? `${money(p.min_price)} – ${money(p.max_price)}` : 'On request'}
              </div>
              <div className="small" style={{ color: 'rgba(255,255,255,.65)' }}>
                {p.min_area ? `${area(p.min_area)} – ${area(p.max_area)}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container detail-layout">
          <div className="stack" style={{ gap: 22 }}>
            <div className="gallery card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="gallery-main">
                <img src={images[idx]} alt={p.name} onError={(e) => { e.currentTarget.src = FALLBACK; }} />
                {images.length > 1 && (
                  <>
                    <button className="gallery-nav prev" aria-label="Previous"
                            onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}><ChevronLeft /></button>
                    <button className="gallery-nav next" aria-label="Next"
                            onClick={() => setIdx((i) => (i + 1) % images.length)}><ChevronRight /></button>
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

            <div className="keyfacts">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="keyfact">
                  <Icon /><b>{value}</b><span>{label}</span>
                </div>
              ))}
            </div>

            <div className="card card-p">
              <h3 className="mb-2">About {p.name}</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{p.description}</p>
              {p.rera_no && (
                <div className="alert alert-info mt-3">
                  <Document />
                  <span>RERA registration number: <b>{p.rera_no}</b></span>
                </div>
              )}
            </div>

            {amenities.length > 0 && (
              <div className="card card-p">
                <h3 className="mb-2">Project amenities</h3>
                <div className="amenity-grid">
                  {amenities.map((a) => (
                    <div className="amenity" key={a}><span className="ic"><Check /></span> {a}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="card card-p">
              <h3 className="mb-2">Location</h3>
              <div style={{ borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                <iframe
                  title="Project location" width="100%" height="320"
                  style={{ border: 0, display: 'block' }} loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(`${p.locality}, ${p.city}`)}&output=embed`}
                />
              </div>
            </div>
          </div>

          <aside className="sticky-side">
            <div className="card card-p">
              <div className="row" style={{ gap: 12 }}>
                <Avatar src={p.builder_avatar} name={p.builder_name} size="avatar-lg"
                        className="avatar-ring" style={{ width: 54, height: 54 }} />
                <div>
                  <div className="strong">{p.builder_company || p.builder_name}</div>
                  <div className="small muted">
                    Builder{p.builder_experience ? ` · ${p.builder_experience} yrs` : ''}
                  </div>
                  {!!p.builder_verified && (
                    <span className="badge badge-green mt-1"><Shield style={{ width: 11, height: 11 }} /> Verified</span>
                  )}
                </div>
              </div>
              {p.builder_about && <p className="small muted mt-2">{p.builder_about}</p>}
              <div className="stack mt-3" style={{ gap: 10 }}>
                <a className="btn btn-dark btn-block" href={`tel:${p.builder_phone}`}><Phone /> {p.builder_phone}</a>
                <Link to={`/profile/${p.builder_id}`} className="btn btn-outline btn-sm btn-block">
                  View builder profile
                </Link>
              </div>
            </div>

            <EnquiryForm projectId={p.id} contactPhone={p.builder_phone}
                         title="Get price sheet & brochure" />
          </aside>
        </div>
      </section>

      {p.more_from_builder?.length > 0 && (
        <section className="section section-tint">
          <div className="container">
            <div className="sec-head">
              <div>
                <span className="eyebrow">Same builder</span>
                <h2>More from {p.builder_company || p.builder_name}</h2>
              </div>
            </div>
            <div className="grid g-3">
              {p.more_from_builder.map((x) => <ProjectCard key={x.id} project={x} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
