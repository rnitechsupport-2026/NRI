import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LogoMark } from '../components/Logo.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import { Avatar, Notice, PageLoader } from '../components/ui.jsx';
import { PORTAL_LABEL } from '../utils/format.js';
import {
  Dashboard, Users, Shield, Home, Inbox, Document, Settings, Logout, Menu, X, ChevronDown, Clock, CheckCircle,
} from '../components/Icons.jsx';
import './staff.css';

/**
 * /staff — the Employee Portal shell: its own sidebar and top bar, separate
 * from the customer dashboard. Everything shown inside comes from the staff
 * API, which only ever returns the users assigned to the signed-in employee.
 */
export default function StaffLayout() {
  const { user, ready, logout, managedPortals } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [counts, setCounts] = useState({});
  const menuRef = useRef(null);

  const isEmployee = !!user && user.role === 'employee';

  // Queue sizes beside the menu items — refreshed as the employee moves
  // around, so an approval they just made is reflected.
  useEffect(() => {
    if (!isEmployee) return;
    api.get('/admin/overview').then((r) => setCounts(r.data.data || {})).catch(() => setCounts({}));
  }, [isEmployee, loc.pathname]);

  useEffect(() => { setOpen(false); setMenu(false); }, [loc.pathname]);
  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!ready) return <PageLoader label="Checking your session…" />;
  if (!user) return <Navigate to="/staff/login" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />; // admins work from their own dashboard
  if (!isEmployee) return <Navigate to="/" replace />;

  const links = [
    { to: '/staff', label: 'Dashboard', icon: Dashboard, end: true },
    { to: '/staff/users', label: 'Assigned Users', icon: Users },
    { group: 'Verification' },
    { to: '/staff/user-verification', label: 'User Verification', icon: Shield, count: counts.pendingApprovals },
    { to: '/staff/properties-under-verification', label: 'Properties Under Verification', icon: Clock, count: counts.pendingProperties },
    { to: '/staff/properties', label: 'Property Verification', icon: Home },
    { group: 'Activity' },
    { to: '/staff/leads', label: 'Leads', icon: Inbox },
    { to: '/staff/history', label: 'Approval History', icon: Document },
    { group: 'Account' },
    { to: '/staff/profile', label: 'Profile / Change Password', icon: Settings },
  ];

  const signOut = () => { logout(); nav('/staff/login', { replace: true }); };

  return (
    <div className="appshell staff-shell">
      {open && <div className="drawer-bg" onClick={() => setOpen(false)} />}
      <aside className={`app-sidebar ${open ? 'open' : ''}`}>
        <div className="app-sidebar-head">
          <Link to="/staff" className="staff-brand">
            <LogoMark size={30} />
            <span>Staff Portal</span>
          </Link>
          <button type="button" className="app-sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>

        <nav className="dash-nav app-nav" aria-label="Employee portal">
          {links.map((l) => (l.group ? (
            <span key={l.group} className="app-nav-label">{l.group}</span>
          ) : (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <l.icon /> {l.label}
              {l.count > 0 && <span className="cnt">{l.count}</span>}
            </NavLink>
          )))}
        </nav>

        <div className="staff-scope">
          <span className="tiny">You manage</span>
          <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            {managedPortals.length
              ? managedPortals.map((p) => <span key={p} className="badge">{PORTAL_LABEL[p]}</span>)
              : <span className="tiny">No users assigned yet</span>}
          </div>
        </div>
      </aside>

      <div className="appshell-main">
        <header className="app-topbar">
          <div className="row" style={{ gap: 14 }}>
            <button type="button" className="app-menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
            <h1 className="app-topbar-title">Employee Portal</h1>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <NotificationBell />
            <div className="usermenu" ref={menuRef}>
              <button className="usermenu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                <Avatar src={user.avatar_url} name={user.name} />
                <span className="usermenu-meta" style={{ textAlign: 'left' }}>
                  <span className="nm" style={{ display: 'block' }}>{user.name.split(' ')[0]}</span>
                  <span className="rl">Employee</span>
                </span>
                <ChevronDown className="usermenu-caret" style={{ width: 15, height: 15, color: 'var(--muted)' }} />
              </button>
              {menu && (
                <div className="dropdown">
                  <Link to="/staff/profile"><Settings /> Profile / Change password</Link>
                  <hr />
                  <button onClick={signOut}><Logout /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="appshell-content">
          {user.must_change_password && !loc.pathname.startsWith('/staff/profile') && (
            <div style={{ marginBottom: 20 }}>
              <Notice type="info">
                You are signed in with the starting password. <Link to="/staff/profile" className="strong" style={{ textDecoration: 'underline' }}>Change your password</Link> to keep your account secure.
              </Notice>
            </div>
          )}
          {/* nothing assigned yet: every page but the profile would only be an error */}
          {!managedPortals.length && !loc.pathname.startsWith('/staff/profile') ? (
            <div className="card center" style={{ padding: '56px 28px', maxWidth: 520, marginInline: 'auto' }}>
              <CheckCircle style={{ width: 40, height: 40, color: 'var(--muted)', margin: '0 auto 14px' }} />
              <h3>No users are assigned to you yet</h3>
              <p className="muted small mt-2">Once an administrator assigns Owners, Agents, Builders or Service Providers to your account, they appear here.</p>
              <Link to="/staff/profile" className="btn btn-outline mt-3">Profile / Change password</Link>
            </div>
          ) : <Outlet />}
        </div>
      </div>
    </div>
  );
}
