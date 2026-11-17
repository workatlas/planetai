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

  return (
    <aside
      aria-label="Sponsored advertisement"
      data-ad-placement={placement}
      data-admob-unit={ADMOB_BANNER_UNIT}
      className={fullBleed ? 'w-full flex justify-center' : 'mx-auto w-full max-w-5xl px-4 sm:px-6 flex justify-center'}
    >
      <div className="relative mx-auto flex min-h-[96px] w-full max-w-[970px] items-center justify-center overflow-hidden rounded-2xl border border-[#dce5dc] bg-white px-4 py-5 shadow-[0_8px_28px_rgba(28,55,42,.035)]">
        <div className="pointer-events-none absolute left-4 top-3 z-20 rounded-md border border-[#dce5dc] bg-[#f7f8f6] px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#738278]">
          Sponsored
        </div>
        <p className="pointer-events-none absolute bottom-3 left-4 right-4 z-0 text-center text-[10px] text-[#9aa69e]">
          Partner advertising helps support free access to PlanetAI.
        </p>
        <ins
          className="adsbygoogle ad-banner-ins absolute inset-0 z-10"
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slotId}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </aside>
  );
};
