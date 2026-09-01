import { Link } from 'react-router-dom';
import { Home, Search } from '../components/Icons.jsx';

export default function NotFound() {
  return (
    <div className="container section center" style={{ padding: '110px 20px' }}>
      <div style={{ fontFamily: 'var(--font-head)', fontSize: '6rem', fontWeight: 800, color: 'var(--brand-500)', lineHeight: 1 }}>
        404
      </div>
      <h2 className="mt-2">This page has been sold</h2>
      <p className="muted mt-1" style={{ maxWidth: 440, margin: '8px auto 0' }}>
        The page you are looking for doesn&apos;t exist or has moved. Let&apos;s get you back to
        something useful.
      </p>
      <div className="row mt-3" style={{ gap: 12, justifyContent: 'center' }}>
        <Link to="/" className="btn btn-dark"><Home /> Back home</Link>
        <Link to="/properties" className="btn btn-outline"><Search /> Browse properties</Link>
      </div>
    </div>
  );
}
