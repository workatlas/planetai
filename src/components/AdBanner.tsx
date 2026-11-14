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
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      }
    } catch {
      // Gracefully ignore when ad blockers or offline mode prevent ad script load
    }
  }, []);

  return (
    <aside
      aria-label="Sponsored advertisement"
      data-ad-placement={placement}
      data-admob-unit={ADMOB_BANNER_UNIT}
      className={
        fullBleed
          ? 'w-full'
          : 'mx-auto w-full max-w-7xl px-4 sm:px-6'
      }
    >
      <div className="relative flex items-center justify-between gap-4 h-[72px] sm:h-[90px] max-h-[90px] overflow-hidden rounded-xl border border-slate-800/80 bg-[#0D1320] px-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400">
            Sponsored
          </span>
          <p className="text-xs text-slate-400 truncate">
            Partner placements keep PlanetAI 100% free with zero signup required.
          </p>
        </div>

        <ins
          className="adsbygoogle block shrink-0"
          style={{display: 'inline-block', maxHeight: '72px'}}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slotId}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
};
