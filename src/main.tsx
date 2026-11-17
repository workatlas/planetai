import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import {
  ApplicantDashboardPreview,
  EmployerDashboardPreview,
} from './preview/MarketplaceDashboardsPreview';
import './index.css';

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      // Service worker cached app shell for offline / APK WebView usage
    },
  });
}

const experience = new URLSearchParams(window.location.search).get('experience');
const preview = experience === 'employer'
  ? <EmployerDashboardPreview />
  : experience === 'applicant'
    ? <ApplicantDashboardPreview />
    : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {preview}
  </StrictMode>,
);
