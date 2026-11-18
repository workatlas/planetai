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

// Deploy previews must never be controlled by an older cached app shell.
// Clean registrations and Cache Storage before mounting React. A one-time
// reload guard prevents a browser that refuses unregister() from looping.
// Treat every Netlify Deploy Preview for this project as disposable preview
// state. Do not install a persistent PWA worker on preview domains; production
// keeps its normal service-worker registration and offline behavior.
const previewHostname = window.location.hostname;
const isNetlifyPreview = previewHostname.startsWith('deploy-preview-')
  && previewHostname.endsWith('.netlify.app');

const mountApplication = () => {
  if ('serviceWorker' in navigator && !isNetlifyPreview) {
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
};

if ('serviceWorker' in navigator && isNetlifyPreview) {
  void (async () => {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    const cacheNames = 'caches' in window ? await caches.keys().catch(() => []) : [];
    const hadStaleState = Boolean(navigator.serviceWorker.controller)
      || registrations.length > 0
      || cacheNames.length > 0;

    await Promise.allSettled(registrations.map(registration => registration.unregister()));
    if ('caches' in window) {
      await Promise.allSettled(cacheNames.map(cacheName => caches.delete(cacheName)));
    }

    if (hadStaleState) {
      let shouldReload = true;
      try {
        const reloadKey = 'planetai_preview_cache_cleanup_v2';
        shouldReload = window.sessionStorage.getItem(reloadKey) !== '1';
        if (shouldReload) window.sessionStorage.setItem(reloadKey, '1');
      } catch {
        // Continue without a reload guard when session storage is unavailable.
      }
      if (shouldReload) {
        window.location.reload();
        return;
      }
    }

    try {
      window.sessionStorage.removeItem('planetai_preview_cache_cleanup_v2');
    } catch {
      // Ignore storage restrictions; the application can still start.
    }
    mountApplication();
  })();
} else {
  mountApplication();
}
