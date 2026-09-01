import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import EnquiryForm from '../components/EnquiryForm.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { Avatar, Crumbs, Notice, PageLoader, Stars } from '../components/ui.jsx';
import { rupees } from '../utils/format.js';
import { Shield, MapPin, Phone, Check } from '../components/Icons.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80';

export default function ServiceDetail() {
  const { idOrSlug } = useParams();
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setS(null); setError('');
    api.get(`/services/${idOrSlug}`)
      .then((r) => live && setS(r.data.data))
      .catch((e) => live && setError(errMsg(e, 'Service not found')));
    return () => { live = false; };
  }, [idOrSlug]);

  if (error) {
    return (
      <div className="container section">
        <Notice type="err">{error}</Notice>
        <Link to="/services" className="btn btn-dark mt-3">Browse all services</Link>
      </div>
    );
  }
  if (!s) return <PageLoader label="Loading service…" />;

  return (
    <>
      <div className="pagehead" style={{ padding: '32px 0' }}>
        <div className="container">
          <Crumbs items={[
            { label: 'Home', to: '/' },
            { label: 'Services', to: '/services' },
            { label: s.category, to: `/services?category=${encodeURIComponent(s.category)}` },
            { label: s.title },
          ]} />
          <span className="badge badge-gold mb-1">{s.category}</span>
          <h1>{s.title}</h1>
          <div className="row mt-2" style={{ gap: 18, flexWrap: 'wrap' }}>
            <Stars value={s.rating} />
            <span className="small" style={{ color: 'rgba(255,255,255,.75)' }}>{Number(s.rating).toFixed(1)} rating</span>
            {s.city && (
              <span className="row small" style={{ gap: 6, color: 'rgba(255,255,255,.75)' }}>
                <MapPin style={{ width: 15, height: 15, color: 'var(--gold-500)' }} /> {s.city}
              </span>
            )}
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container detail-layout">
          <div className="stack" style={{ gap: 22 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <img src={s.cover_image || FALLBACK} alt={s.title}
                   style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                   onError={(e) => { e.currentTarget.src = FALLBACK; }} />
            </div>

            <div className="card card-p">
              <h3 className="mb-2">What&apos;s included</h3>
              <p style={{ whiteSpace: 'pre-line' }}>{s.description}</p>

              <div className="amenity-grid mt-3">
                {['Free site measurement', 'Written quotation', 'On-time delivery promise',
                  'Dedicated project manager', 'Warranty on workmanship', 'Transparent pricing'].map((f) => (
                  <div className="amenity" key={f}><span className="ic"><Check /></span> {f}</div>
                ))}
              </div>
            </div>
          </div>

          <aside className="sticky-side">
            <div className="card price-box">
              <div className="ps">{s.price_from > 0 ? 'Starting from' : 'Consultation'}</div>
              <div className="p">{s.price_from > 0 ? rupees(s.price_from) : 'Free'}</div>
              <div className="ps">{s.price_unit}</div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--line-2)', margin: '16px 0' }} />

              <div className="row" style={{ gap: 12 }}>
                <Avatar src={s.provider_avatar} name={s.provider_name} style={{ width: 46, height: 46 }} />
                <div>
                  <div className="strong">{s.provider_company || s.provider_name}</div>
                  <div className="small muted">
                    {s.provider_experience ? `${s.provider_experience} yrs experience` : 'Service partner'}
                  </div>
                  {!!s.provider_verified && (
                    <span className="badge badge-green mt-1"><Shield style={{ width: 11, height: 11 }} /> Verified</span>
                  )}
                </div>
              </div>

              <a className="btn btn-dark btn-block mt-3" href={`tel:${s.provider_phone}`}>
                <Phone /> {s.provider_phone}
              </a>
            </div>

            <EnquiryForm serviceId={s.id} contactPhone={s.provider_phone} title="Request a quote" />
          </aside>
        </div>
      </section>

      {s.related?.length > 0 && (
        <section className="section section-tint">
          <div className="container">
            <div className="sec-head">
              <div>
                <span className="eyebrow">Related</span>
                <h2>More in {s.category}</h2>
              </div>
            </div>
            <div className="grid g-3">
              {s.related.map((r) => <ServiceCard key={r.id} service={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
