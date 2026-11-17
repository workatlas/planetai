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

// Deploy previews are test environments, not installable production PWAs.
// Always remove any worker/cache left by an earlier preview deployment.
// Do not gate this cleanup behind sessionStorage: that flag can outlive a
// failed cleanup and prevent the stale worker from ever being removed.
const isNetlifyPreview = window.location.hostname.startsWith('deploy-preview-')
  && window.location.hostname.endsWith('--planetai-global.netlify.app');

if ('serviceWorker' in navigator && isNetlifyPreview) {
  if (navigator.serviceWorker.controller) {
    // Replace an active stale preview worker with the self-destroying worker
    // generated for Netlify Deploy Previews. It unregisters and clears caches.
    registerSW({ immediate: true, onOfflineReady() {} });
  } else {
    // No worker currently controls this page, so remove any leftover
    // registration/cache state without registering another preview worker.
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const cacheNames = 'caches' in window ? await caches.keys() : [];
      const hadStaleState = registrations.length > 0 || cacheNames.length > 0;

      await Promise.all(registrations.map(registration => registration.unregister()));
      if ('caches' in window) {
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }

      if (hadStaleState) {
        window.location.reload();
      }
    })();
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
