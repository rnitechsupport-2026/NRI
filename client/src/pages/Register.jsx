import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import RoleTabs, { roleInfo } from '../components/RoleTabs.jsx';
import { Check, ArrowRight } from '../components/Icons.jsx';

const APPLICATION_BLURB = {
  agent: 'Agent accounts go through KYC and RERA verification before you can post listings — registration is a short multi-step application.',
  builder: 'Builder accounts go through company/entity verification before you can post projects — registration is a short multi-step application. Each project you add afterwards needs its own RERA/land-rights review too.',
  service: 'Service provider accounts go through identity and qualification verification before you can post listings — what’s checked depends on your profession, so registration is a short multi-step application.',
  owner: 'No documents, no approval — just a couple of quick questions about what you\'re listing so your first property post is halfway filled in already.',
  buyer: 'No documents, no approval — just a couple of quick questions about what you\'re looking for so we can personalise your search from day one.',
};

export default function Register() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { isAuthed } = useAuth();

  const [role, setRole] = useState(params.get('role') || 'buyer');
  const info = roleInfo(role);

  useEffect(() => { if (isAuthed) nav('/dashboard', { replace: true }); }, [isAuthed, nav]);

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <div>
          <span className="eyebrow" style={{ color: 'var(--gold-400)' }}>Join RNI Realestate</span>
          <h2>{info.title}</h2>
          <p>{info.blurb}</p>

          <ul className="auth-points">
            {info.perks.map((perk) => (
              <li key={perk}>
                <span className="ic"><Check /></span>
                <span><b>{perk}</b></span>
              </li>
            ))}
            <li>
              <span className="ic"><Check /></span>
              <span>
                <b>Free forever</b>
                <span>No listing fee, no subscription, no hidden charges.</span>
              </span>
            </li>
          </ul>
        </div>

        <div className="row" style={{ gap: 26, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-300)' }}>2L+</div>
            <div className="small" style={{ color: 'rgba(255,255,255,.62)' }}>Monthly visitors</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-300)' }}>15k+</div>
            <div className="small" style={{ color: 'rgba(255,255,255,.62)' }}>Deals closed</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-300)' }}>4.8/5</div>
            <div className="small" style={{ color: 'rgba(255,255,255,.62)' }}>Partner rating</div>
          </div>
        </div>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="muted">Pick the account type that fits you.</p>

          <RoleTabs value={role} onChange={setRole} className="mb-3" />

          <div className="stack" style={{ gap: 16 }}>
            <div className="alert alert-info">
              <span>{APPLICATION_BLURB[role]}</span>
            </div>
            <Link to={`/register/${role}`} className="btn btn-primary btn-block btn-lg">
              {role === 'buyer' || role === 'owner' ? <>Continue as {role} <ArrowRight /></> : <>Start {role} application <ArrowRight /></>}
            </Link>
          </div>

          <p className="center small muted mt-3">
            Already registered? <Link to={`/login?role=${role}`} className="gold strong">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
