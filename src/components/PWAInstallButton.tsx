import React, {useState} from 'react';
import {Download, Share, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const isDeployPreview = typeof window !== 'undefined' && window.location.hostname.startsWith('deploy-preview-');

  if (isInstalled) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#111b30] px-3 py-2.5 text-xs font-bold text-white transition hover:border-white/20 hover:bg-[#182642] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label="Install App"
      >
        <Download className="h-4 w-4 shrink-0 text-[#47745c]" />
        <span>Install App</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#050914]/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1425] p-6 text-slate-100 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-install-title" className="text-lg font-bold text-white">
                  Add to Home Screen
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {isIOS
                    ? 'On iPhone or iPad, add PLANETAI to your Home Screen using Safari.'
                    : 'If your browser does not offer the install prompt, use its menu to add PLANETAI to your Home Screen.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-cyan-300">01</span><span>Tap the <strong>Share</strong> icon in Safari.</span></li>
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-cyan-300">02</span><span>Choose <strong>Add to Home Screen</strong>, then confirm.</span></li>
              </ol>
            ) : (
              <ol className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-cyan-300">01</span><span>Open your browser menu (usually <strong>⋮</strong> on mobile or <strong>⋯</strong> on desktop).</span></li>
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-cyan-300">02</span><span>Look for <strong>Install PlanetAI</strong> or <strong>Add to Home Screen</strong>.</span></li>
              </ol>
            )}
            <p className="mt-4 text-[11px] leading-5 text-slate-500">
              {isDeployPreview
                ? 'This review preview intentionally disables its service worker to prevent stale cached builds. Install PlanetAI from the production website after release.'
                : 'If the install option is unavailable, your browser may not support app installation or the site may not yet meet its install requirements.'}
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 min-h-[44px] w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-[#07111f] transition hover:bg-cyan-300"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
