import React, {useEffect, useRef} from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
    AndroidAdMob?: {
      showBanner?: (adUnitId: string) => void;
    };
  }
}

interface AdBannerProps {
  slotId?: string;
  placement: 'top-feed' | 'inline-feed' | 'bottom-suite';
  fullBleed?: boolean;
}

const ADSENSE_CLIENT = 'ca-pub-6655685917040449';
const ADMOB_BANNER_UNIT = 'ca-app-pub-6655685917040449/1985937373';

export const AdBanner: React.FC<AdBannerProps> = ({
  slotId = '1985937373',
  placement,
  fullBleed = false,
}) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      if (window.AndroidAdMob?.showBanner) {
        window.AndroidAdMob.showBanner(ADMOB_BANNER_UNIT);
        return;
      }
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      if (!document.getElementById('planetai-adsense-script')) {
        const script = document.createElement('script');
        script.id = 'planetai-adsense-script';
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
        document.head.appendChild(script);
      }
    } catch {
      // Ad blockers, consent choices, or offline mode can prevent ad loading.
    }
  }, []);

  const isInlineFeed = placement === 'inline-feed';

  return (
    <aside
      aria-label="Sponsored advertisement"
      data-ad-placement={placement}
      data-admob-unit={ADMOB_BANNER_UNIT}
      className={isInlineFeed || fullBleed ? 'w-full min-w-0' : 'mx-auto w-full max-w-[970px]'}
    >
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1425] shadow-[0_8px_28px_rgba(0,0,0,.18)]">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/10 bg-[#111b30] px-4 py-2.5">
          <span className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#b8c6df]">
            Sponsored
          </span>
          <span className="text-[10px] text-[#9ba9c1]">
            Partner advertising helps support free access to PLANETAI.
          </span>
        </div>
        <div className="flex h-[90px] min-h-[90px] max-h-[140px] w-full min-w-0 items-center justify-center overflow-hidden bg-[#0d1425] px-2 py-2 sm:h-[140px] sm:min-h-[100px]">
          <ins
            className="adsbygoogle block w-full max-w-full"
            style={{display: 'block', width: '100%', maxWidth: '100%'}}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </aside>
  );
};
