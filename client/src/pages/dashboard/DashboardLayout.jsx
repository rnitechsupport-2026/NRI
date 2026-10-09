import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Notice } from '../../components/ui.jsx';
import { ROLE_LABEL } from '../../utils/format.js';
import DashSidebar from '../../components/dashboard/DashSidebar.jsx';
import DashTopbar from '../../components/dashboard/DashTopbar.jsx';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  // An employee's workspace is the Staff Portal. Any dashboard address they
  // land on (an old bookmark, a notification link) is carried over to it.
  if (user.role === 'employee') {
    const to = loc.pathname.replace(/^\/dashboard(\/admin)?/, '/staff') || '/staff';
    return <Navigate to={`${to}${loc.search}`} replace />;
  }

  const isPending = user.approval_status === 'pending';
  const isRejected = user.approval_status === 'rejected';

  return (
    <div className="appshell">
      <DashSidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="appshell-main">
        <DashTopbar onMenuClick={() => setMobileOpen(true)} />

        <div className="appshell-content">
          {isPending && (
            <div style={{ marginBottom: 20 }}>
              <Notice type="info">
                Your {ROLE_LABEL[user.role]} account is <b>Under Verification</b>. You'll be able to post listings once our team has reviewed and approved it — everything else works normally in the meantime.
              </Notice>
            </div>
          )}
          {isRejected && (
            <div style={{ marginBottom: 20 }}>
              <Notice type="err">
                Your {ROLE_LABEL[user.role]} account was <b>Rejected</b>{user.approval_note ? <> — {user.approval_note}</> : null}. You cannot post listings; contact support if you think this is a mistake.
              </Notice>
            </div>
          )}
          {user.must_change_password && (
            <div style={{ marginBottom: 20 }}>
              <Notice type="info">
                You are signed in with the default password. <Link to="/dashboard/profile" className="strong">Change your password</Link> to keep your account secure.
              </Notice>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
