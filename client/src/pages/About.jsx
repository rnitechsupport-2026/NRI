import { Link } from 'react-router-dom';
import { Crumbs } from '../components/ui.jsx';
import { ROLES } from '../components/RoleTabs.jsx';
import { Shield, Cube, Handshake, Key, ArrowRight, Award, Users, Building } from '../components/Icons.jsx';

const VALUES = [
  { icon: Shield, title: 'Verification first', text: 'Ownership papers, RERA numbers and duplicate checks happen before a listing goes live — not after a complaint.' },
  { icon: Handshake, title: 'No hidden brokerage', text: 'Owner listings are free and direct. Agent listings clearly show the commission upfront.' },
  { icon: Cube, title: 'See before you go', text: '3D walkthroughs and floor plans on every premium listing so a site visit is a decision, not a discovery.' },
  { icon: Key, title: 'Beyond the transaction', text: 'Legal checks, home loans, interiors and shifting — the boring parts, handled by vetted partners.' },
];

const MILESTONES = [
  { year: '2016', text: 'Started as a two-person brokerage in Guindy, Chennai.' },
  { year: '2019', text: 'Launched the online portal with 400 verified listings.' },
  { year: '2022', text: 'Crossed 10,000 closed transactions across Tamil Nadu.' },
  { year: '2024', text: 'Introduced 3D walkthroughs and the partner services marketplace.' },
  { year: '2026', text: 'Live in 7 cities with 2 lakh+ monthly visitors.' },
];

export default function About() {
  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
          <h1>We make property decisions feel obvious</h1>
          <p style={{ maxWidth: 640 }}>
            RNI Realestate began as a small brokerage in Chennai and grew into a marketplace where
            owners, agents, builders and service partners all work on the same transparent rails.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="grid g-4">
            {[
              { icon: Building, n: '18,000+', l: 'Listings published' },
              { icon: Users, n: '2 Lakh+', l: 'Monthly visitors' },
              { icon: Award, n: '15,000+', l: 'Deals closed' },
              { icon: Shield, n: '7', l: 'Cities covered' },
            ].map(({ icon: Icon, n, l }) => (
              <div key={l} className="card card-p center">
                <div className="ftile-ic" style={{ margin: '0 auto 12px' }}><Icon /></div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--brand-600)' }}>{n}</div>
                <div className="small muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="sec-head center">
            <div>
              <span className="eyebrow">What we stand for</span>
              <h2>Four rules we don&apos;t bend</h2>
            </div>
          </div>
          <div className="grid g-2">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <article key={v.title} className="card card-p row" style={{ gap: 18, alignItems: 'flex-start' }}>
                  <div className="ftile-ic"><Icon /></div>
                  <div>
                    <h3>{v.title}</h3>
                    <p className="muted small mt-1">{v.text}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Our journey</span>
              <h2>Ten years, one obsession</h2>
            </div>
          </div>
          <div className="card card-p">
            {MILESTONES.map((m, i) => (
              <div key={m.year} className="row" style={{
                gap: 22, alignItems: 'flex-start', padding: '16px 0',
                borderBottom: i < MILESTONES.length - 1 ? '1px dashed var(--line)' : 'none',
              }}>
                <span className="badge badge-navy" style={{ minWidth: 62, justifyContent: 'center' }}>{m.year}</span>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <div className="sec-head center">
            <div>
              <span className="eyebrow">Join us</span>
              <h2>Pick the account that fits you</h2>
            </div>
          </div>
          <div className="grid g-4">
            {ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <Link key={r.key} to={`/register?role=${r.key}`} className="card card-p card-hover">
                  <div className="ftile-ic" style={{ width: 44, height: 44 }}><Icon /></div>
                  <h4 className="mt-2">{r.title}</h4>
                  <p className="small muted mt-1">{r.blurb}</p>
                  <span className="row gold small strong mt-2" style={{ gap: 6 }}>
                    Register free <ArrowRight style={{ width: 15, height: 15 }} />
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
