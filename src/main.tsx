import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import { ApplicantDashboardPreview, EmployerDashboardPreview } from './preview/MarketplaceDashboardsPreview';
import EmployerAuth from './preview/EmployerAuth';
import EmployerProfile from './preview/EmployerProfile';
import JobSeekerAuth from './preview/JobSeekerAuth';
import JobSeekerDashboard from './preview/JobSeekerDashboard';
import JobSeekerPasswordReset from './preview/JobSeekerPasswordReset';
import AdminModeration from './preview/AdminModeration';
import './index.css';

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true, onOfflineReady() {} });
}

const experience = new URLSearchParams(window.location.search).get('experience');
const preview = experience === 'admin-moderation' ? <AdminModeration />
  : experience === 'employer-profile' ? <EmployerProfile />
  : experience === 'employer-auth' ? <EmployerAuth />
  : experience === 'job-seeker-auth' ? <JobSeekerAuth />
  : experience === 'job-seeker-reset' ? <JobSeekerPasswordReset />
  : experience === 'job-seeker-dashboard' ? <JobSeekerDashboard />
  : experience === 'employer' ? <EmployerDashboardPreview />
  : experience === 'applicant' ? <ApplicantDashboardPreview />
  : <App />;

createRoot(document.getElementById('root')!).render(<StrictMode>{preview}</StrictMode>);
