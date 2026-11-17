import React, {useState} from 'react';
import {Download, Share, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

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
        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dce5dc] bg-white px-3 py-2 text-xs font-bold text-[#40564a] transition hover:border-[#a9bcae] hover:bg-[#f7f8f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b]"
        aria-label="Install PlanetAI"
      >
        <Download className="h-4 w-4 shrink-0 text-[#47745c]" />
        <span>{compact ? 'Install' : 'Install PlanetAI'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#142c26]/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#dce5dc] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="pwa-install-title" className="text-lg font-bold text-[#1b3027]">
                  Install PlanetAI
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#77847b]">
                  {isIOS
                    ? 'Add PlanetAI to your iPhone or iPad Home Screen from Safari.'
                    : 'Use your browser menu to install PlanetAI or add it to your home screen.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#e2e8e1] text-[#77847b] hover:bg-[#f4f6f2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-5 space-y-3 text-sm leading-6 text-[#52635a]">
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-[#71917b]">01</span><span>Tap the <strong>Share</strong> icon in Safari.</span></li>
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-[#71917b]">02</span><span>Choose <strong>Add to Home Screen</strong>, then confirm.</span></li>
              </ol>
            ) : (
              <ol className="mt-5 space-y-3 text-sm leading-6 text-[#52635a]">
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-[#71917b]">01</span><span>Open your browser menu (usually <strong>⋮</strong> on mobile or <strong>⋯</strong> on desktop).</span></li>
                <li className="flex items-start gap-3"><span className="font-mono text-xs font-bold text-[#71917b]">02</span><span>Look for <strong>Install PlanetAI</strong> or <strong>Add to Home Screen</strong>.</span></li>
              </ol>
            )}
            <p className="mt-4 text-[11px] leading-5 text-[#87938b]">
              If the install option is unavailable, your browser may not support app installation or the site may not yet meet its install requirements.
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 min-h-[44px] w-full rounded-xl bg-[#183c32] px-4 py-3 text-sm font-bold text-white hover:bg-[#285c4b]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
