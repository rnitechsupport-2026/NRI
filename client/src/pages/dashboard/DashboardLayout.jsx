import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Notice } from '../../components/ui.jsx';
import { ROLE_LABEL } from '../../utils/format.js';
import DashSidebar from '../../components/dashboard/DashSidebar.jsx';
import DashTopbar from '../../components/dashboard/DashTopbar.jsx';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPending = user.approvalStatus === 'pending';

  return (
    <div className="appshell">
      <DashSidebar user={user} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="appshell-main">
        <DashTopbar onMenuClick={() => setMobileOpen(true)} />

        <div className="appshell-content">
          {isPending && (
            <div style={{ marginBottom: 20 }}>
              <Notice type="info">
                Your {ROLE_LABEL[user.role]} account is pending admin approval. You'll be able to post listings once it's reviewed — everything else works normally in the meantime.
              </Notice>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
