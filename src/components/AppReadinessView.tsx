import React, {useEffect, useState} from 'react';
import {
  CheckCircle2,
  Share2,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface AppReadinessViewProps {
  onShareApp: () => void;
}

export const AppReadinessView: React.FC<AppReadinessViewProps> = ({
  onShareApp,
}) => {
  const isOnline = useOnlineStatus();
  const {isInstalled} = usePWAInstall();
  const [swActive, setSwActive] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwActive(Boolean(reg));
      });
    }
  }, []);

  const readinessItems = [
    {
      label: 'Web App Manifest & Screenshots (/manifest.json)',
      detail: 'Standalone display mode, maskable + PNG icons, and mobile/desktop install screenshots',
      ok: true,
    },
    {
      label: 'Service Worker Offline Cache',
      detail: swActive
        ? 'Active and caching app shell for offline / WebView boot'
        : 'Registered automatically in browser & standalone builds',
      ok: true,
    },
    {
      label: 'Android TWA & Asset Links Ready',
      detail: 'Single-page state routing + /.well-known/assetlinks.json for fullscreen APK packaging',
      ok: true,
    },
    {
      label: 'Mobile Touch Ergonomics',
      detail: '44px+ hit targets, thumb-zone bottom bar, safe-area inset support',
      ok: true,
    },
  ];

  return (
    <section aria-labelledby="pwa-heading" className="space-y-6">
      <div>
        <h1
          id="pwa-heading"
          className="font-display text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight"
        >
          PlanetAI Mobile App & PWA
        </h1>
        <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
          Install PlanetAI directly to your Android, iOS, or desktop home screen for quick access and offline support.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Runtime & Install Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#111827] p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-50">
                  Install & Connectivity
                </h2>
                <p className="text-xs text-slate-400">
                  {isInstalled
                    ? 'Running in installed standalone app mode'
                    : 'Installable Progressive Web App & Android WebView ready'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-3.5">
                <span className="block text-xs text-slate-400">Network</span>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-100">
                  {isOnline ? (
                    <>
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-amber-400" />
                      <span>Offline Cache</span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-3.5">
                <span className="block text-xs text-slate-400">Display Mode</span>
                <span className="mt-1 block text-sm font-semibold text-slate-100">
                  {isInstalled ? 'Standalone App' : 'Browser / Ready'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onShareApp}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-sm font-medium text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <Share2 className="w-4 h-4 text-slate-300" />
              <span>Copy App Link</span>
            </button>
          </div>
        </div>

        {/* Android APK & PWA Architecture Checklist */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#111827] p-6">
          <h2 className="font-display text-lg font-bold text-slate-50">
            PWA & Android APK Readiness
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Built for direct installation and zero-configuration wrapping in Trusted Web Activity (TWA) or Android WebView.
          </p>

          <ul className="mt-5 space-y-4">
            {readinessItems.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
