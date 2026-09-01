import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { PageLoader } from './components/ui.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

const Properties = lazy(() => import('./pages/Properties.jsx'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail.jsx'));
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
const Leads = lazy(() => import('./pages/dashboard/Leads.jsx'));
const Visits = lazy(() => import('./pages/dashboard/Visits.jsx'));
const Favorites = lazy(() => import('./pages/dashboard/Favorites.jsx'));
const Profile = lazy(() => import('./pages/dashboard/Profile.jsx'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/properties" element={<Properties />} />
            <Route path="/property/:idOrSlug" element={<PropertyDetail />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:idOrSlug" element={<ProjectDetail />} />

            <Route path="/agents" element={<People role="agent" />} />
            <Route path="/builders" element={<People role="builder" />} />
            <Route path="/profile/:id" element={<PublicProfile />} />

            <Route path="/services" element={<Services />} />
            <Route path="/service/:idOrSlug" element={<ServiceDetail />} />

            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            <Route
              path="/dashboard"
              element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
            >
              <Route index element={<Overview />} />
              <Route path="properties" element={<MyProperties />} />
              <Route path="property/new" element={<PropertyForm />} />
              <Route path="property/:id/edit" element={<PropertyForm />} />
              <Route path="projects" element={
                <ProtectedRoute roles={['builder', 'admin']}><MyProjects /></ProtectedRoute>} />
              <Route path="project/new" element={
                <ProtectedRoute roles={['builder', 'admin']}><ProjectForm /></ProtectedRoute>} />
              <Route path="project/:id/edit" element={
                <ProtectedRoute roles={['builder', 'admin']}><ProjectForm /></ProtectedRoute>} />
              <Route path="services" element={
                <ProtectedRoute roles={['service', 'admin']}><MyServices /></ProtectedRoute>} />
              <Route path="service/new" element={
                <ProtectedRoute roles={['service', 'admin']}><ServiceForm /></ProtectedRoute>} />
              <Route path="service/:id/edit" element={
                <ProtectedRoute roles={['service', 'admin']}><ServiceForm /></ProtectedRoute>} />
              <Route path="leads" element={<Leads />} />
              <Route path="visits" element={<Visits />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
