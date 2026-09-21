import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RequireApproved from './components/RequireApproved.jsx';
import { PageLoader } from './components/ui.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

const RegisterOwner = lazy(() => import('./pages/RegisterOwner.jsx'));
const RegisterBuyer = lazy(() => import('./pages/RegisterBuyer.jsx'));

const RegisterAgent = lazy(() => import('./pages/RegisterAgent.jsx'));
const AgentVerification = lazy(() => import('./pages/dashboard/AgentVerification.jsx'));
const AdminAgentApplications = lazy(() => import('./pages/dashboard/admin/AdminAgentApplications.jsx'));
const AdminAgentDetail = lazy(() => import('./pages/dashboard/admin/AdminAgentDetail.jsx'));
const AdminAuditLog = lazy(() => import('./pages/dashboard/admin/AdminAuditLog.jsx'));

const RegisterBuilder = lazy(() => import('./pages/RegisterBuilder.jsx'));
const BuilderVerification = lazy(() => import('./pages/dashboard/BuilderVerification.jsx'));
const AdminBuilderApplications = lazy(() => import('./pages/dashboard/admin/AdminBuilderApplications.jsx'));
const AdminBuilderDetail = lazy(() => import('./pages/dashboard/admin/AdminBuilderDetail.jsx'));
const AdminProjectVerification = lazy(() => import('./pages/dashboard/admin/AdminProjectVerification.jsx'));

const RegisterService = lazy(() => import('./pages/RegisterService.jsx'));
const ServiceProviderVerification = lazy(() => import('./pages/dashboard/ServiceProviderVerification.jsx'));
const AdminServiceApplications = lazy(() => import('./pages/dashboard/admin/AdminServiceApplications.jsx'));
const AdminServiceProviderDetail = lazy(() => import('./pages/dashboard/admin/AdminServiceProviderDetail.jsx'));

const Properties = lazy(() => import('./pages/Properties.jsx'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail.jsx'));
const PropertyMicrosite = lazy(() => import('./microsite/PropertyMicrosite.jsx'));
const Projects = lazy(() => import('./pages/Projects.jsx'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail.jsx'));
const People = lazy(() => import('./pages/People.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.jsx'));
const Overview = lazy(() => import('./pages/dashboard/Overview.jsx'));
const MyProperties = lazy(() => import('./pages/dashboard/MyProperties.jsx'));
const PropertyForm = lazy(() => import('./pages/dashboard/PropertyForm.jsx'));
const MyProjects = lazy(() => import('./pages/dashboard/MyProjects.jsx'));
const ProjectForm = lazy(() => import('./pages/dashboard/ProjectForm.jsx'));
const MyServices = lazy(() => import('./pages/dashboard/MyServices.jsx'));
const ServiceForm = lazy(() => import('./pages/dashboard/ServiceForm.jsx'));
const Visits = lazy(() => import('./pages/dashboard/Visits.jsx'));
const Favorites = lazy(() => import('./pages/dashboard/Favorites.jsx'));
const Profile = lazy(() => import('./pages/dashboard/Profile.jsx'));
const MyEnquiries = lazy(() => import('./pages/MyEnquiries.jsx'));

const AdminOverview = lazy(() => import('./pages/dashboard/admin/AdminOverview.jsx'));
const AdminEmployees = lazy(() => import('./pages/dashboard/admin/AdminEmployees.jsx'));
const AdminUsers = lazy(() => import('./pages/dashboard/admin/AdminUsers.jsx'));
const AdminProperties = lazy(() => import('./pages/dashboard/admin/AdminProperties.jsx'));
const AdminProjects = lazy(() => import('./pages/dashboard/admin/AdminProjects.jsx'));
const AdminServices = lazy(() => import('./pages/dashboard/admin/AdminServices.jsx'));
const AdminLeads = lazy(() => import('./pages/dashboard/admin/AdminLeads.jsx'));

export default function App() {
  // The dashboard is its own app shell (fixed sidebar + topbar) — the
  // marketing site's navbar/footer would just stack a second header above it.
  const pathname = useLocation().pathname;
  const isDashboard = pathname.startsWith('/dashboard');
  // The microsite is a full-bleed experience with its own sticky nav — the
  // marketing site's Navbar/Footer would double up on chrome.
  const isMicrosite = pathname === '/property-microsite';

  return (
    <>
      <ScrollToTop />
      {!isDashboard && !isMicrosite && <Navbar />}
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/owner" element={<RegisterOwner />} />
            <Route path="/register/buyer" element={<RegisterBuyer />} />
            <Route path="/register/agent" element={<RegisterAgent />} />
            <Route path="/register/builder" element={<RegisterBuilder />} />
            <Route path="/register/service" element={<RegisterService />} />

            <Route path="/properties" element={<Properties />} />
            <Route path="/property/:idOrSlug" element={<PropertyDetail />} />
            {/* Cinematic microsite concept — currently static demo data
                (see src/microsite/data/property.js), not wired to a real
                listing yet. Kept as its own route so it doesn't collide
                with the real, data-driven property detail page above. */}
            <Route path="/property-microsite" element={<PropertyMicrosite />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:idOrSlug" element={<ProjectDetail />} />

            <Route path="/agents" element={<People role="agent" />} />
            <Route path="/builders" element={<People role="builder" />} />
            <Route path="/profile/:id" element={<PublicProfile />} />

            <Route path="/services" element={<Services />} />
            <Route path="/service/:idOrSlug" element={<ServiceDetail />} />

            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Buyer has no dashboard shell — lightweight standalone pages
                under the normal site chrome instead (see Navbar's account
                dropdown, which points buyers here rather than /dashboard/*). */}
            <Route path="/account/shortlist" element={
              <ProtectedRoute><div className="container section"><Favorites /></div></ProtectedRoute>} />
            <Route path="/account/settings" element={
              <ProtectedRoute><div className="container section"><Profile /></div></ProtectedRoute>} />
            <Route path="/account/enquiries" element={
              <ProtectedRoute><MyEnquiries /></ProtectedRoute>} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['owner', 'agent', 'builder', 'service', 'admin', 'employee']} redirectTo="/">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="properties" element={<MyProperties />} />
              <Route path="property/new" element={<RequireApproved><PropertyForm /></RequireApproved>} />
              <Route path="property/:id/edit" element={<RequireApproved><PropertyForm /></RequireApproved>} />
              <Route path="projects" element={
                <ProtectedRoute roles={['builder', 'admin']}><MyProjects /></ProtectedRoute>} />
              <Route path="project/new" element={
                <ProtectedRoute roles={['builder', 'admin']}><RequireApproved><ProjectForm /></RequireApproved></ProtectedRoute>} />
              <Route path="project/:id/edit" element={
                <ProtectedRoute roles={['builder', 'admin']}><RequireApproved><ProjectForm /></RequireApproved></ProtectedRoute>} />
              <Route path="services" element={
                <ProtectedRoute roles={['service', 'admin']}><MyServices /></ProtectedRoute>} />
              <Route path="service/new" element={
                <ProtectedRoute roles={['service', 'admin']}><RequireApproved><ServiceForm /></RequireApproved></ProtectedRoute>} />
              <Route path="service/:id/edit" element={
                <ProtectedRoute roles={['service', 'admin']}><RequireApproved><ServiceForm /></RequireApproved></ProtectedRoute>} />
              <Route path="visits" element={<Visits />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="profile" element={<Profile />} />
              <Route path="agent/verification" element={
                <ProtectedRoute roles={['agent']}><AgentVerification /></ProtectedRoute>} />
              <Route path="builder/verification" element={
                <ProtectedRoute roles={['builder']}><BuilderVerification /></ProtectedRoute>} />
              <Route path="service/verification" element={
                <ProtectedRoute roles={['service']}><ServiceProviderVerification /></ProtectedRoute>} />

              <Route path="admin" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminOverview /></ProtectedRoute>} />
              <Route path="admin/employees" element={
                <ProtectedRoute roles={['admin']}><AdminEmployees /></ProtectedRoute>} />
              <Route path="admin/users" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminUsers /></ProtectedRoute>} />
              <Route path="admin/properties" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminProperties /></ProtectedRoute>} />
              <Route path="admin/projects" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminProjects /></ProtectedRoute>} />
              <Route path="admin/services" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminServices /></ProtectedRoute>} />
              <Route path="admin/leads" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminLeads /></ProtectedRoute>} />
              <Route path="admin/agents" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminAgentApplications /></ProtectedRoute>} />
              <Route path="admin/agents/:id" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminAgentDetail /></ProtectedRoute>} />
              <Route path="admin/builders" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminBuilderApplications /></ProtectedRoute>} />
              <Route path="admin/builders/:id" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminBuilderDetail /></ProtectedRoute>} />
              <Route path="admin/projects/:id/verification" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminProjectVerification /></ProtectedRoute>} />
              <Route path="admin/service-providers" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminServiceApplications /></ProtectedRoute>} />
              <Route path="admin/service-providers/:id" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminServiceProviderDetail /></ProtectedRoute>} />
              <Route path="admin/audit-log" element={
                <ProtectedRoute roles={['admin', 'employee']}><AdminAuditLog /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isDashboard && !isMicrosite && <Footer />}
    </>
  );
}
