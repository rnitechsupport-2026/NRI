import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../Logo.jsx';
import {
  Dashboard, Home, Plus, Building, Wrench, Inbox, Heart, Settings, Shield, User, Calendar,
  Chart, Users, Document, Clock, ChevronDown, X,
} from '../Icons.jsx';

export default function DashSidebar({ user, mobileOpen, onClose }) {
  const [adminOpen, setAdminOpen] = useState(true);

  const isPending = user.approvalStatus === 'pending';
  // Post-listing links stay visible while pending — RequireApproved (App.jsx)
  // shows a clear "under verification" screen if they're clicked, which is
  // more informative than the link silently disappearing.
  const canProperty = ['owner', 'agent', 'builder', 'admin'].includes(user.role);
  const isBuilder = ['builder', 'admin'].includes(user.role);
  const isService = ['service', 'admin'].includes(user.role);

  const isAdmin = user.role === 'admin';
  const isEmployee = user.role === 'employee';
  const portals = isAdmin ? ['owner', 'agent', 'builder', 'service'] : (user.managedPortals || []);

  const menuLinks = [
    { to: '/dashboard', label: 'Overview', icon: Dashboard, end: true },
    ...(canProperty ? [
      { to: '/dashboard/properties', label: 'My Properties', icon: Home },
      { to: '/dashboard/property/new', label: 'Post Property', icon: Plus, locked: isPending },
    ] : []),
    ...(isBuilder ? [
      { to: '/dashboard/projects', label: 'My Projects', icon: Building },
      { to: '/dashboard/project/new', label: 'Add Project', icon: Plus, locked: isPending },
    ] : []),
    ...(isService ? [
      { to: '/dashboard/services', label: 'My Services', icon: Wrench },
      { to: '/dashboard/service/new', label: 'Add Service', icon: Plus, locked: isPending },
    ] : []),
    { to: '/dashboard/visits', label: 'Site Visits', icon: Calendar },
    { to: '/dashboard/favorites', label: 'Shortlist', icon: Heart },
  ];

  const accountLinks = [
    { to: '/dashboard/profile', label: 'Account', icon: Settings },
    ...(user.role === 'agent' ? [{ to: '/dashboard/agent/verification', label: 'Verification', icon: Shield }] : []),
    ...(user.role === 'builder' ? [{ to: '/dashboard/builder/verification', label: 'Verification', icon: Shield }] : []),
    ...(user.role === 'service' ? [{ to: '/dashboard/service/verification', label: 'Verification', icon: Shield }] : []),
    { to: `/profile/${user.id}`, label: 'Public profile', icon: User },
  ];

  const adminLinks = (isAdmin || isEmployee) ? [
    { to: '/dashboard/admin', label: 'Admin Overview', icon: Chart, end: true },
    ...(isAdmin ? [{ to: '/dashboard/admin/employees', label: 'Employees', icon: Users }] : []),
    { to: '/dashboard/admin/users', label: 'Manage Users', icon: Users },
    ...(portals.some((p) => p === 'owner' || p === 'agent')
      ? [{ to: '/dashboard/admin/properties', label: 'Manage Properties', icon: Home }] : []),
    ...(portals.includes('agent')
      ? [{ to: '/dashboard/admin/agents', label: 'Agent Applications', icon: Shield }] : []),
    ...(portals.includes('builder')
      ? [{ to: '/dashboard/admin/builders', label: 'Builder Applications', icon: Shield }] : []),
    ...(portals.includes('builder')
      ? [{ to: '/dashboard/admin/projects', label: 'Manage Projects', icon: Building }] : []),
    ...(portals.includes('service')
      ? [{ to: '/dashboard/admin/service-providers', label: 'Service Applications', icon: Shield }] : []),
    ...(portals.includes('service')
      ? [{ to: '/dashboard/admin/services', label: 'Manage Services', icon: Wrench }] : []),
    { to: '/dashboard/admin/leads', label: 'All Enquiries', icon: Inbox },
    { to: '/dashboard/admin/audit-log', label: 'Audit Log', icon: Document },
  ] : [];

  const renderLink = (l) => {
    const Icon = l.icon;
    return (
      <NavLink key={l.to + l.label} to={l.to} end={l.end} onClick={onClose}
               className={({ isActive }) => (isActive ? 'active' : '')}>
        <Icon /> {l.label}
        {l.locked && (
          <span title="Pending admin approval">
            <Clock style={{ width: 12, height: 12, marginLeft: 5, color: 'var(--muted)' }} />
          </span>
        )}
        {l.count > 0 && <span className="cnt">{l.count}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {mobileOpen && <div className="drawer-bg" onClick={onClose} />}
      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="app-sidebar-head">
          <Logo size={34} />
          <button type="button" className="app-sidebar-close" onClick={onClose} aria-label="Close menu">
            <X />
          </button>
        </div>

        <nav className="dash-nav app-nav">
          <span className="app-nav-label">Menu</span>
          {menuLinks.map(renderLink)}

          <span className="app-nav-label">Account</span>
          {accountLinks.map(renderLink)}

          {adminLinks.length > 0 && (
            <>
              <button type="button" className="app-nav-label app-nav-toggle" onClick={() => setAdminOpen((o) => !o)}>
                Admin
                <ChevronDown style={{ width: 13, height: 13, transform: adminOpen ? 'rotate(180deg)' : 'none' }} />
              </button>
              {adminOpen && adminLinks.map(renderLink)}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
