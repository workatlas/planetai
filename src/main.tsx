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
import EmployerPayments from './preview/EmployerPayments';
import './index.css';

// Netlify deploy previews must not reuse a production PWA shell. A service
// worker from an earlier deployment can otherwise serve stale JavaScript and
// route password-recovery links back to the old homepage.
const isNetlifyPreview = window.location.hostname.startsWith('deploy-preview-')
  && window.location.hostname.endsWith('--planetai-global.netlify.app');

if ('serviceWorker' in navigator && isNetlifyPreview) {
  const cleanupFlag = '_planetai_preview_sw_cleaned';
  if (sessionStorage.getItem(cleanupFlag) !== '1') {
    sessionStorage.setItem(cleanupFlag, '1');
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.set(cleanupFlag, '1');
      window.location.replace(cleanUrl.toString());
    })();
  } else {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete(cleanupFlag);
    window.history.replaceState({}, '', cleanUrl.toString());
  }
} else if ('serviceWorker' in navigator) {
  registerSW({ immediate: true, onOfflineReady() {} });
}

const experience = new URLSearchParams(window.location.search).get('experience');
const preview = experience === 'admin-moderation' ? <AdminModeration />
  : experience === 'employer-profile' ? <EmployerProfile />
  : experience === 'employer-payments' ? <EmployerPayments />
  : experience === 'employer-auth' ? <EmployerAuth />
  : experience === 'job-seeker-auth' ? <JobSeekerAuth />
  : experience === 'job-seeker-reset' ? <JobSeekerPasswordReset />
  : experience === 'job-seeker-dashboard' ? <JobSeekerDashboard />
  : experience === 'employer' ? <EmployerDashboardPreview />
  : experience === 'applicant' ? <ApplicantDashboardPreview />
  : <App />;

createRoot(document.getElementById('root')!).render(<StrictMode>{preview}</StrictMode>);
