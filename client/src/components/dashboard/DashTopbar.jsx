import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABEL } from '../../utils/format.js';
import { Avatar } from '../ui.jsx';
import NotificationBell from '../NotificationBell.jsx';
import { Menu, ChevronDown, Dashboard, User, Settings, Logout, ArrowRight } from '../Icons.jsx';

export default function DashTopbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function doLogout() {
    logout();
    nav('/');
  }

  return (
    <header className="app-topbar">
      <div className="row" style={{ gap: 14 }}>
        <button type="button" className="app-menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <Menu />
        </button>
        <h1 className="app-topbar-title">{ROLE_LABEL[user.role]} Dashboard</h1>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <NotificationBell />

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
              <Link to="/dashboard" onClick={() => setMenu(false)}><Dashboard /> Dashboard</Link>
              <Link to={`/profile/${user.id}`} onClick={() => setMenu(false)}><User /> Public Profile</Link>
              <Link to="/dashboard/profile" onClick={() => setMenu(false)}><Settings /> Account Settings</Link>
              <Link to="/" onClick={() => setMenu(false)}><ArrowRight /> View public site</Link>
              <hr />
              <button onClick={doLogout}><Logout /> Log out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
