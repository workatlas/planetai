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
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 min-h-[68px] sm:min-h-[82px] overflow-hidden rounded-xl border border-slate-800/80 bg-[#0D1320] px-4 py-2.5">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2.5 gap-y-1.5 min-w-0 flex-1">
          <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400">
            Sponsored
          </span>
          <p className="text-xs text-slate-400 line-clamp-2 leading-snug min-w-0">
            Partner placements keep PlanetAI 100% free with zero signup required.
          </p>
        </div>

        <ins
          className="adsbygoogle block shrink-0 max-w-full"
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
