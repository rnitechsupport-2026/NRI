import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL } from '../utils/format.js';
import { Avatar } from './ui.jsx';
import Logo from './Logo.jsx';
import NotificationBell from './NotificationBell.jsx';
import {
  Menu, X, ChevronDown, Plus, Dashboard, Inbox, Heart, Settings, Logout, User,
} from './Icons.jsx';

const LINKS = [
  { to: '/properties?purpose=sale', label: 'Buy' },
  { to: '/properties?purpose=rent', label: 'Rent' },
  { to: '/projects', label: 'New Projects' },
  { to: '/agents', label: 'Agents' },
  { to: '/builders', label: 'Builders' },
  { to: '/services', label: 'Services' },
];

export default function Navbar() {
  const { user, isAuthed, logout, canPostProperty } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenu(false); setDrawer(false); }, [loc.pathname, loc.search]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isOn = (to) => {
    const [path, qs] = to.split('?');
    if (loc.pathname !== path) return false;
    if (!qs) return true;
    return loc.search.includes(qs);
  };

  function doLogout() {
    logout();
    nav('/');
  }

  return (
    <>
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container nav-inner">
          <Logo />

          <nav className="nav-links">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={() => (isOn(l.to) ? 'active' : '')}>{l.label}</NavLink>
            ))}
          </nav>

          <div className="nav-actions">
            {canPostProperty && (
              <Link to="/dashboard/property/new" className="btn btn-sm btn-primary nowrap nav-cta">
                <Plus /> Post Property
              </Link>
            )}

            {isAuthed && <NotificationBell />}

            {isAuthed ? (
              <div className="usermenu" ref={ref}>
                <button className="usermenu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                  <Avatar src={user.avatar_url} name={user.name} />
                  <span className="usermenu-meta" style={{ textAlign: 'left' }}>
                    <span className="nm" style={{ display: 'block' }}>{user.name.split(' ')[0]}</span>
                    <span className="rl">{ROLE_LABEL[user.role]}</span>
                  </span>
                  <ChevronDown className="usermenu-caret" style={{ width: 15, height: 15, color: 'var(--muted)' }} />
                </button>

                {menu && (
                  <div className="dropdown">
                    {user.role === 'buyer' ? (
                      <>
                        <Link to="/account/enquiries"><Inbox /> My Enquiries</Link>
                        <Link to="/account/shortlist"><Heart /> Shortlist</Link>
                        <Link to={`/profile/${user.id}`}><User /> Public Profile</Link>
                        <Link to="/account/settings"><Settings /> Account Settings</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/dashboard"><Dashboard /> Dashboard</Link>
                        <Link to="/dashboard/leads"><Inbox /> My Enquiries</Link>
                        <Link to="/dashboard/favorites"><Heart /> Shortlist</Link>
                        <Link to={`/profile/${user.id}`}><User /> Public Profile</Link>
                        <Link to="/dashboard/profile"><Settings /> Account Settings</Link>
                      </>
                    )}
                    <hr />
                    <button onClick={doLogout}><Logout /> Log out</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-ghost nowrap nav-auth">Login</Link>
                <Link to="/register" className="btn btn-sm btn-dark nowrap nav-auth">Register</Link>
              </>
            )}

            <button className="nav-burger" onClick={() => setDrawer(true)} aria-label="Open menu">
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {drawer && (
        <>
          <div className="drawer-bg" onClick={() => setDrawer(false)} />
          <aside className="drawer">
            <div className="row-between mb-2">
              <span className="logo-text">Menu</span>
              <button className="btn btn-icon btn-ghost" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X />
              </button>
            </div>
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={() => (isOn(l.to) ? 'active' : '')}>{l.label}</NavLink>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '10px 0' }} />
            {isAuthed ? (
              <>
                {canPostProperty && (
                  <Link to="/dashboard/property/new" className="btn btn-primary btn-block mb-2">
                    <Plus /> Post Property
                  </Link>
                )}
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/dashboard/leads">My Enquiries</NavLink>
                <NavLink to="/dashboard/favorites">Shortlist</NavLink>
                <button className="btn btn-outline btn-block mt-2" onClick={doLogout}>Log out</button>
              </>
            ) : (
              <div className="stack mt-2">
                <Link to="/login" className="btn btn-outline btn-block">Login</Link>
                <Link to="/register" className="btn btn-dark btn-block">Create account</Link>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
