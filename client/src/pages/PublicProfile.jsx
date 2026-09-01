import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import PropertyCard from '../components/PropertyCard.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import EnquiryForm from '../components/EnquiryForm.jsx';
import { Avatar, Crumbs, Empty, Notice, PageLoader } from '../components/ui.jsx';
import { ROLE_LABEL, shortDate } from '../utils/format.js';
import { Shield, MapPin, Phone, Mail, Award, Home as HomeIcon, Building, Document } from '../components/Icons.jsx';

export default function PublicProfile() {
  const { id } = useParams();
  const [u, setU] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('listings');

  useEffect(() => {
    let live = true;
    setU(null); setError('');
    api.get(`/users/${id}`)
      .then((r) => { if (!live) return; setU(r.data.data); setTab(r.data.data.role === 'builder' ? 'projects' : r.data.data.role === 'service' ? 'services' : 'listings'); })
      .catch((e) => live && setError(errMsg(e, 'Profile not found')));
    return () => { live = false; };
  }, [id]);

  if (error) return <div className="container section"><Notice type="err">{error}</Notice></div>;
  if (!u) return <PageLoader label="Loading profile…" />;

  const TABS = [
    ...(u.role !== 'service' ? [{ k: 'listings', label: `Properties (${u.properties.length})` }] : []),
    ...(u.role === 'builder' ? [{ k: 'projects', label: `Projects (${u.projects.length})` }] : []),
    ...(u.role === 'service' ? [{ k: 'services', label: `Services (${u.services.length})` }] : []),
    { k: 'about', label: 'About' },
  ];

  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[
            { label: 'Home', to: '/' },
            { label: `${ROLE_LABEL[u.role]}s`, to: u.role === 'builder' ? '/builders' : u.role === 'service' ? '/services' : '/agents' },
            { label: u.name },
          ]} />
          <div className="row" style={{ gap: 22, flexWrap: 'wrap' }}>
            <Avatar src={u.avatar_url} name={u.name} size="avatar-xl" className="avatar-ring" />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="row mb-1" style={{ gap: 7 }}>
                <span className="badge badge-gold">{ROLE_LABEL[u.role]}</span>
                {!!u.is_verified && (
                  <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified</span>
                )}
              </div>
              <h1>{u.company_name || u.name}</h1>
              {u.company_name && <p style={{ color: 'rgba(255,255,255,.8)' }}>{u.name}</p>}
              <div className="row mt-2" style={{ gap: 20, flexWrap: 'wrap', color: 'rgba(255,255,255,.75)' }}>
                {u.city && <span className="row small" style={{ gap: 6 }}><MapPin style={{ width: 15, height: 15, color: 'var(--gold-500)' }} /> {u.locality ? `${u.locality}, ` : ''}{u.city}</span>}
                {u.experience_years != null && <span className="row small" style={{ gap: 6 }}><Award style={{ width: 15, height: 15, color: 'var(--gold-500)' }} /> {u.experience_years} years experience</span>}
                {u.rera_id && <span className="row small" style={{ gap: 6 }}><Document style={{ width: 15, height: 15, color: 'var(--gold-500)' }} /> RERA: {u.rera_id}</span>}
                <span className="row small" style={{ gap: 6 }}>Member since {shortDate(u.created_at)}</span>
              </div>
            </div>
            <div className="stack" style={{ minWidth: 190 }}>
              <a className="btn btn-primary" href={`tel:${u.phone}`}><Phone /> {u.phone}</a>
              <a className="btn btn-light" href={`mailto:${u.email}`}><Mail /> Email</a>
            </div>
          </div>
        </div>
      </div>

      <section className="section-sm">
        <div className="container detail-layout">
          <div>
            <div className="tabs mb-3">
              {TABS.map((t) => (
                <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>{t.label}</button>
              ))}
            </div>

            {tab === 'listings' && (
              u.properties.length === 0
                ? <Empty icon={HomeIcon} title="No active listings">This {ROLE_LABEL[u.role].toLowerCase()} has no live properties right now.</Empty>
                : <div className="grid g-3">{u.properties.map((p) => <PropertyCard key={p.id} property={{ ...p, owner_name: u.name, owner_role: u.role, owner_avatar: u.avatar_url, owner_company: u.company_name }} />)}</div>
            )}

            {tab === 'projects' && (
              u.projects.length === 0
                ? <Empty icon={Building} title="No projects listed yet" />
                : <div className="grid g-2">{u.projects.map((p) => <ProjectCard key={p.id} project={{ ...p, builder_name: u.name, builder_company: u.company_name }} />)}</div>
            )}

            {tab === 'services' && (
              u.services.length === 0
                ? <Empty title="No services listed yet" />
                : <div className="grid g-2">{u.services.map((s) => <ServiceCard key={s.id} service={{ ...s, provider_name: u.name, provider_company: u.company_name, provider_avatar: u.avatar_url }} />)}</div>
            )}

            {tab === 'about' && (
              <div className="card card-p stack" style={{ gap: 18 }}>
                <div>
                  <h3 className="mb-1">About</h3>
                  <p className="muted">{u.about || 'No description added yet.'}</p>
                </div>
                <div className="spec-grid">
                  {[
                    ['Account type', ROLE_LABEL[u.role]],
                    ['Company', u.company_name || '—'],
                    ['RERA ID', u.rera_id || '—'],
                    ['Service category', u.service_category || '—'],
                    ['Experience', u.experience_years != null ? `${u.experience_years} years` : '—'],
                    ['Location', [u.locality, u.city].filter(Boolean).join(', ') || '—'],
                    ['Website', u.website || '—'],
                    ['Verified', u.is_verified ? 'Yes' : 'Pending'],
                  ].map(([k, v]) => (
                    <div className="spec-row" key={k}><span>{k}</span><b>{v}</b></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="sticky-side">
            <EnquiryForm contactPhone={u.phone} title={`Contact ${u.name.split(' ')[0]}`} />
            <div className="card card-p center">
              <h4>Looking for something specific?</h4>
              <p className="small muted mt-1 mb-2">
                Browse every listing across the portal or post your own requirement.
              </p>
              <Link to="/properties" className="btn btn-outline btn-block btn-sm">Browse all properties</Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
