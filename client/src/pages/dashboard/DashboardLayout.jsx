import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Avatar } from '../../components/ui.jsx';
import { ROLE_LABEL } from '../../utils/format.js';
import {
  Dashboard, Home, Plus, Building, Wrench, Inbox, Heart, Settings, Shield, User, Calendar,
} from '../../components/Icons.jsx';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [newLeads, setNewLeads] = useState(0);

  useEffect(() => {
    api.get('/stats/dashboard')
      .then((r) => setNewLeads(r.data.data.new_leads || 0))
      .catch(() => {});
  }, []);

  const canProperty = ['owner', 'agent', 'builder', 'admin'].includes(user.role);
  const isBuilder = ['builder', 'admin'].includes(user.role);
  const isService = ['service', 'admin'].includes(user.role);

  const links = [
    { to: '/dashboard', label: 'Overview', icon: Dashboard, end: true },
    ...(canProperty ? [
      { to: '/dashboard/properties', label: 'My Properties', icon: Home },
      { to: '/dashboard/property/new', label: 'Post Property', icon: Plus },
    ] : []),
    ...(isBuilder ? [
      { to: '/dashboard/projects', label: 'My Projects', icon: Building },
      { to: '/dashboard/project/new', label: 'Add Project', icon: Plus },
    ] : []),
    ...(isService ? [
      { to: '/dashboard/services', label: 'My Services', icon: Wrench },
      { to: '/dashboard/service/new', label: 'Add Service', icon: Plus },
    ] : []),
    { to: '/dashboard/leads', label: 'Enquiries', icon: Inbox, count: newLeads },
    { to: '/dashboard/visits', label: 'Site Visits', icon: Calendar },
    { to: '/dashboard/favorites', label: 'Shortlist', icon: Heart },
    { to: '/dashboard/profile', label: 'Account', icon: Settings },
  ];

  return (
    <div className="container dash">
      <aside className="dash-side card">
        <div className="dash-user">
          <Avatar src={user.avatar_url} name={user.name} size="avatar-lg" className="avatar-ring" />
          <h4>{user.name}</h4>
          <div className="rl">{ROLE_LABEL[user.role]}</div>
          {!!user.is_verified && (
            <span className="badge badge-gold mt-1"><Shield style={{ width: 11, height: 11 }} /> Verified</span>
          )}
        </div>

        <nav className="dash-nav">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink key={l.to + l.label} to={l.to} end={l.end}
                       className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon /> {l.label}
                {l.count > 0 && <span className="cnt">{l.count}</span>}
              </NavLink>
            );
          })}
          <NavLink to={`/profile/${user.id}`}><User /> Public profile</NavLink>
        </nav>
      </aside>

      <div style={{ minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
