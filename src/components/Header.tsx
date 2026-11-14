import React from 'react';
import {Bell, Check, Share2} from 'lucide-react';
import {PlanetAILogo} from './PlanetAILogo';
import {PWAInstallButton} from './PWAInstallButton';

export type AppTab =
  | 'jobs'
  | 'ai-tools'
  | 'news'
  | 'saved'
  | 'platforms'
  | 'app';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  liveJobCount: number;
  totalJobCount: number;
  savedCount: number;
  alertCount: number;
  onOpenAlerts: () => void;
  onShareApp: () => void;
  copied: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  liveJobCount,
  totalJobCount,
  savedCount,
  alertCount,
  onOpenAlerts,
  onShareApp,
  copied,
}) => {
  const navItems: {id: AppTab; label: string; count?: number}[] = [
    {id: 'jobs', label: 'Jobs'},
    {id: 'ai-tools', label: 'AI Tools'},
    {id: 'news', label: 'News & Dev Tools'},
    {id: 'platforms', label: 'Platforms'},
    {id: 'saved', label: 'Saved', count: savedCount},
    {id: 'app', label: 'App'},
  ];

  const countLabel =
    liveJobCount === totalJobCount
      ? `${liveJobCount} Live Jobs`
      : `${liveJobCount} / ${totalJobCount} Live`;

  return (
    <header className="sticky top-0 z-40 h-14 lg:h-16 border-b border-slate-800/90 bg-[#090D16]/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 sm:gap-5 px-4 sm:px-6">
        {/* Zone 1: Brand Lockup */}
        <button
          type="button"
          onClick={() => onTabChange('jobs')}
          className="flex items-center gap-2.5 min-h-[44px] rounded-xl pr-1 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <PlanetAILogo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-50">
            Planet<span className="text-cyan-400">AI</span>
          </span>
        </button>

        {/* Zone 2: Desktop Single-Page Tab Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-4 xl:gap-6"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`relative min-h-[44px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md ${
                  isActive
                    ? 'text-cyan-300'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="ml-1 font-mono text-xs text-slate-400">
                    ({item.count})
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[11px] h-0.5 bg-cyan-400 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Live Counter, Job Alert Bell, Share App & PWA Install */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Job Counter Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-emerald-300 whitespace-nowrap shrink-0"
            title="Live available jobs matching current filters"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"
            />
            <span className="font-mono tabular-nums font-semibold">
              {countLabel}
            </span>
            <span className="hidden 2xl:inline text-emerald-300/90">
              Available
            </span>
          </div>

          {/* Interactive Job Alert Bell */}
          <button
            type="button"
            onClick={onOpenAlerts}
            aria-label="Configure instant job alerts"
            className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-slate-800 bg-slate-900/90 text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Bell className="w-4 h-4 text-cyan-300" />
            {alertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-400 px-1 font-mono text-[10px] font-bold text-slate-950 leading-none">
                {alertCount}
              </span>
            )}
          </button>

          {/* Share App Button */}
          <button
            type="button"
            onClick={onShareApp}
            aria-label="Share PlanetAI app link"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 text-xs sm:text-sm font-medium hover:border-slate-700 hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline text-emerald-300">
                  Copied!
                </span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="hidden sm:inline">Share App</span>
              </>
            )}
          </button>

          {/* Contextual PWA Install Button */}
          <div className="hidden sm:flex shrink-0">
            <PWAInstallButton compact />
          </div>
        </div>
      </div>
    </header>
  );
};
