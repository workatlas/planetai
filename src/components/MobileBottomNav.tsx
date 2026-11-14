import React from 'react';
import {
  Bookmark,
  Briefcase,
  Globe,
  Newspaper,
  Sparkles,
} from 'lucide-react';
import {AppTab} from './Header';

interface MobileBottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  savedCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  savedCount,
}) => {
  const tabs: {
    id: AppTab;
    label: string;
    icon: React.ComponentType<{className?: string}>;
    badge?: number;
  }[] = [
    {id: 'jobs', label: 'Jobs', icon: Briefcase},
    {id: 'ai-tools', label: 'AI Tools', icon: Sparkles},
    {id: 'news', label: 'News', icon: Newspaper},
    {id: 'platforms', label: 'Platforms', icon: Globe},
    {
      id: 'saved',
      label: 'Saved',
      icon: Bookmark,
      badge: savedCount > 0 ? savedCount : undefined,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-[#090D16]/95 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-5 h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400 ${
                isActive ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {typeof tab.badge === 'number' && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-cyan-400 px-1 font-mono text-[10px] font-bold text-slate-950 leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
