import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import SearchBar from '../components/SearchBar.jsx';
import SearchBot from '../components/SearchBot.jsx';
import RoleTabs, { ROLES, roleInfo } from '../components/RoleTabs.jsx';
import PropertyCard from '../components/PropertyCard.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import AgentCard from '../components/AgentCard.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { SkeletonGrid } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Shield, Handshake, Key, Cube, ArrowRight, Check, Star, Award, Users, Building,
} from '../components/Icons.jsx';
import coimbatoreImg from '../../assets/coimbatore.jpg';
import hyderabadImg from '../../assets/hydrebad.jpg';

const CITY_TILES = [
  { name: 'Chennai', img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=700&q=80' },
  { name: 'Bengaluru', img: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=700&q=80' },
  { name: 'Coimbatore', img: coimbatoreImg },
  { name: 'Hyderabad', img: hyderabadImg },
];

const WHY = [
  { icon: Shield, title: 'Verified listings only', text: 'Every listing is checked for ownership documents and duplicate posts before it goes live.' },
  { icon: Cube, title: '3D walkthroughs', text: 'Shortlist from your sofa. Matterport and 360° tours let you walk the whole home before you visit.' },
  { icon: Handshake, title: 'Zero brokerage from owners', text: 'Deal directly with owners, or work with a RERA registered agent — your choice, always transparent.' },
  { icon: Key, title: 'End-to-end support', text: 'Home loan, legal verification, interiors and shifting — all handled by vetted partners on one platform.' },
];

const TESTIMONIALS = [
  { name: 'Karthik Subramanian', role: 'Bought a 3 BHK in Adyar', img: 'https://i.pravatar.cc/120?img=13', text: 'The 3D tour saved me four weekends of site visits. I shortlisted three homes from my laptop and bought the second one I actually visited.' },
  { name: 'Priya Menon', role: 'Rented in Whitefield', img: 'https://i.pravatar.cc/120?img=32', text: 'Listed my flat as an owner and got 11 genuine enquiries in the first week. The lead dashboard made following up effortless.' },
  { name: 'Vignesh Raman', role: 'Investor, Coimbatore', img: 'https://i.pravatar.cc/120?img=59', text: 'The RERA details and verified builder badges gave me the confidence to book an under-construction unit remotely.' },
];

export default function Home() {
  const nav = useNavigate();
  const { isAuthed } = useAuth();
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState(null);
  const [projects, setProjects] = useState(null);
  const [agents, setAgents] = useState(null);
  const [services, setServices] = useState(null);
  const [cities, setCities] = useState([]);
  const [role, setRole] = useState('owner');

  useEffect(() => {
    api.get('/stats/public').then((r) => setStats(r.data.data)).catch(() => setStats({}));
    api.get('/properties', { params: { featured: 'true', limit: 8 } })
      .then((r) => setFeatured(r.data.data)).catch(() => setFeatured([]));
    api.get('/projects', { params: { featured: 'true', limit: 3 } })
      .then((r) => setProjects(r.data.data)).catch(() => setProjects([]));
    api.get('/users', { params: { role: 'agent', limit: 4 } })
      .then((r) => setAgents(r.data.data)).catch(() => setAgents([]));
    api.get('/services', { params: { limit: 4 } })
      .then((r) => setServices(r.data.data)).catch(() => setServices([]));
    api.get('/properties/meta/cities')
      .then((r) => setCities(r.data.data)).catch(() => {});
  }, []);

  const cityCount = (name) => cities.find((c) => c.city === name)?.count ?? 0;
  const info = roleInfo(role);

  return (
    <>
      {/* ------------------------------------------------------- hero */}
      <section className="hero">
        <div className="container hero-inner">
          <span className="hero-tag"><b>NEW</b> 3D walkthroughs on 500+ verified homes</span>
          <h1>Connecting <em>fortuners</em><br />of India.</h1>
          <p className="lede">
            Buy, rent or invest with confidence. Verified listings from owners, RERA registered
            agents and India&apos;s most trusted builders — all on one network.
          </p>

          <SearchBar />

          <div className="hero-stats">
            <div><strong>{stats ? `${stats.properties}+` : '—'}</strong><span>Live listings</span></div>
            <div><strong>{stats ? `${stats.projects}+` : '—'}</strong><span>New projects</span></div>
            <div><strong>{stats ? `${stats.agents + stats.builders}+` : '—'}</strong><span>Verified partners</span></div>
            <div><strong>{stats ? `${stats.cities}` : '—'}</strong><span>Cities covered</span></div>
          </div>
        </div>
      </section>

      {/* --------------- AI smart search — floating orange launcher, right edge */}
      <SearchBot />

      {/* ------------------------------------------------ role selector */}
      <section className="section-sm" style={{ marginTop: -46, position: 'relative', zIndex: 5 }}>
        <div className="container">
          <div className="card card-p" style={{ boxShadow: 'var(--sh-lg)' }}>
            <div className="row-between mb-3">
              <div>
                <span className="eyebrow">Get started</span>
                <h3>Who are you posting as?</h3>
              </div>
              <span className="badge badge-gold">Free to list</span>
            </div>

            <RoleTabs value={role} onChange={setRole} />

            <div className="row-between mt-3" style={{ alignItems: 'flex-start', gap: 26 }}>
              <div style={{ flex: '1 1 340px' }}>
                <h4>{info.title}</h4>
                <p className="muted small mt-1">{info.blurb}</p>
                <ul className="row mt-2" style={{ gap: 18, flexWrap: 'wrap' }}>
                  {info.perks.map((perk) => (
                    <li key={perk} className="row small" style={{ gap: 7 }}>
                      <Check style={{ width: 15, height: 15, color: 'var(--green)' }} /> {perk}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-primary"
                        onClick={() => nav(isAuthed ? '/dashboard' : `/register?role=${role}`)}>
                  {isAuthed ? 'Go to dashboard' : `Register as ${info.label}`} <ArrowRight />
                </button>
                {!isAuthed && (
                  <button className="btn btn-outline" onClick={() => nav(`/login?role=${role}`)}>
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- featured listings */}
      <section className="section">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Handpicked</span>
              <h2>Featured properties</h2>
              <p>Verified homes with complete documentation, real photographs and 3D walkthroughs.</p>
            </div>
            <Link to="/properties" className="btn btn-outline">View all properties <ArrowRight /></Link>
          </div>

          {featured === null ? <SkeletonGrid count={8} /> : (
            <div className="grid g-4">
              {featured.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------- why choose */}
      <section className="section section-tint">
        <div className="container">
          <div className="sec-head center">
            <div>
              <span className="eyebrow">Why RNI</span>
              <h2>Property buying, without the guesswork</h2>
              <p>We removed the three things buyers hate most — fake listings, hidden brokerage and endless site visits.</p>
            </div>
          </div>
          <div className="grid g-4">
            {WHY.map((w) => {
              const Icon = w.icon;
              return (
                <article key={w.title} className="ftile card card-hover">
                  <div className="ftile-ic"><Icon /></div>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ cities */}
      <section className="section">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Locations</span>
              <h2>Explore by city</h2>
              <p>From beachside Chennai apartments to Coimbatore farmhouses.</p>
            </div>
          </div>
          <div className="grid g-4">
            {CITY_TILES.map((c) => (
              <Link key={c.name} to={`/properties?city=${encodeURIComponent(c.name)}`} className="city">
                <img src={c.img} alt={c.name} loading="lazy" />
                <div className="city-txt">
                  <h4>{c.name}</h4>
                  <span>{cityCount(c.name)} properties</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- projects */}
      <section className="section section-tint">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">New launches</span>
              <h2>Projects by top builders</h2>
              <p>RERA approved developments with transparent pricing and possession timelines.</p>
            </div>
            <Link to="/projects" className="btn btn-outline">All projects <ArrowRight /></Link>
          </div>
          {projects === null ? <SkeletonGrid count={3} cols="g-3" /> : (
            <div className="grid g-3">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------ agents */}
      <section className="section">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Trusted people</span>
              <h2>Top rated agents</h2>
              <p>RERA registered professionals who know their micro-markets inside out.</p>
            </div>
            <Link to="/agents" className="btn btn-outline">Browse agents <ArrowRight /></Link>
          </div>
          {agents === null ? <SkeletonGrid count={4} /> : (
            <div className="grid g-4">
              {agents.map((a) => <AgentCard key={a.id} user={a} />)}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- services */}
      <section className="section section-tint">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Home services</span>
              <h2>Everything after the keys</h2>
              <p>Interiors, legal checks, home loans and shifting — from partners we have vetted.</p>
            </div>
            <Link to="/services" className="btn btn-outline">All services <ArrowRight /></Link>
          </div>
          {services === null ? <SkeletonGrid count={4} /> : (
            <div className="grid g-4">
              {services.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ testimonials */}
      <section className="section">
        <div className="container">
          <div className="sec-head center">
            <div>
              <span className="eyebrow">Testimonials</span>
              <h2>15,000+ families found home here</h2>
            </div>
          </div>
          <div className="grid g-3">
            {TESTIMONIALS.map((t) => (
              <article key={t.name} className="card card-p">
                <div className="stars mb-2">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} />)}
                </div>
                <p style={{ fontSize: '.93rem' }}>&ldquo;{t.text}&rdquo;</p>
                <div className="row mt-3" style={{ gap: 12 }}>
                  <img src={t.img} alt="" className="avatar" />
                  <div>
                    <div className="strong small">{t.name}</div>
                    <div className="tiny muted">{t.role}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- cta band */}
      <section className="section-sm">
        <div className="container">
          <div className="cta-band">
            <div>
              <span className="eyebrow" style={{ color: 'var(--gold-400)' }}>List with us</span>
              <h2>Post your property free.<br />Reach 2 lakh+ serious buyers.</h2>
              <p>
                Owners, agents and builders all get a full dashboard — listings, 3D tours,
                lead pipeline and performance insights. No listing fee, ever.
              </p>
              <div className="row mt-3" style={{ gap: 22, flexWrap: 'wrap' }}>
                {[
                  { icon: Users, label: '2L+ monthly visitors' },
                  { icon: Award, label: 'Verified badge' },
                  { icon: Building, label: 'Builder microsites' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="row small" style={{ gap: 8, color: 'rgba(255,255,255,.82)' }}>
                    <Icon style={{ width: 16, height: 16, color: 'var(--gold-500)' }} /> {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="stack" style={{ minWidth: 230 }}>
              <Link to={isAuthed ? '/dashboard/property/new' : '/register?role=owner'} className="btn btn-primary btn-lg">
                Post property free <ArrowRight />
              </Link>
              <Link to="/register?role=builder" className="btn btn-light">I&apos;m a builder</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- role shortcuts */}
      <section className="section-sm" style={{ paddingBottom: 60 }}>
        <div className="container">
          <div className="grid g-4">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <Link key={r.key} to={`/register?role=${r.key}`} className="card card-p card-hover">
                  <div className="ftile-ic" style={{ width: 44, height: 44 }}><Icon /></div>
                  <h4 className="mt-2">{r.title}</h4>
                  <p className="small muted mt-1 clamp-2">{r.blurb}</p>
                  <span className="row gold small strong mt-2" style={{ gap: 6 }}>
                    Get started <ArrowRight style={{ width: 15, height: 15 }} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
