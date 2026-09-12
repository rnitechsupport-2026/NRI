import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL } from '../utils/format.js';
import { Clock, ArrowRight } from './Icons.jsx';

/**
 * Gates the posting forms themselves — not just the nav link. A pending
 * agent/builder/service partner hitting /property/new etc. directly sees
 * this instead of a form that would only fail once they hit submit.
 */
export default function RequireApproved({ children }) {
  const { user, isPending } = useAuth();
  if (!isPending) return children;

  return (
    <div className="card center" style={{ padding: '56px 28px', maxWidth: 480, marginInline: 'auto' }}>
      <div style={{
        width: 64, height: 64, margin: '0 auto 18px', borderRadius: '50%',
        background: 'var(--amber-bg)', display: 'grid', placeItems: 'center',
      }}>
        <Clock style={{ width: 28, height: 28, color: '#b54708' }} />
      </div>
      <h3>Your account is under verification</h3>
      <p className="muted small mt-2">
        An admin needs to review your {ROLE_LABEL[user.role]} application before you can post listings.
        Everything else in your dashboard works normally in the meantime.
      </p>
      {user.role === 'agent' ? (
        <Link to="/dashboard/agent/verification" className="btn btn-primary mt-3">
          Check verification status <ArrowRight />
        </Link>
      ) : (
        <Link to="/dashboard" className="btn btn-outline mt-3">Back to dashboard</Link>
      )}
    </div>
  );
}
