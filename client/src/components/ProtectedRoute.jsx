import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { PageLoader } from './ui.jsx';

/** Gate a route behind login, and optionally behind a set of roles. */
export default function ProtectedRoute({ children, roles }) {
  const { user, ready } = useAuth();
  const loc = useLocation();

  if (!ready) return <PageLoader label="Checking your session…" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
