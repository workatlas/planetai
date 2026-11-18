import React from 'react';
import {Star, Zap} from 'lucide-react';
import {JobListing} from '../data/jobs';

interface MarqueeTickerProps {
  onSelectPlatform: (platform: string) => void;
  spotlightJobs?: JobListing[];
}

const EMPLOYER_MESSAGES = [
  {
    id: 'featured-boost',
    label: 'FEATURED BOOST',
    message: '$49 · 30 days of enhanced listing visibility',
    icon: 'star',
  },
  {
    id: 'spotlight-marquee',
    label: 'SPOTLIGHT + MARQUEE',
    message: 'Coming soon · Premium employer placement',
    icon: 'zap',
  },
  {
    id: 'moderation',
    label: 'TRUST FIRST',
    message: 'Every employer listing is reviewed before publication',
    icon: 'star',
  },
];

export const MarqueeTicker: React.FC<MarqueeTickerProps> = ({
  onSelectPlatform: _onSelectPlatform,
  spotlightJobs: _spotlightJobs = [],
}) => {
  const renderMessages = (keyPrefix: string) =>
    EMPLOYER_MESSAGES.map((item) => (
      <span
        key={`${keyPrefix}-${item.id}`}
        className="inline-flex items-center gap-2.5 px-5 py-2 text-xs text-slate-300 whitespace-nowrap shrink-0"
      >
        {item.icon === 'star' ? (
          <Star className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
        )}
        <span className="font-semibold text-slate-100">{item.label}</span>
        <span className="text-slate-600" aria-hidden="true">·</span>
        <span>{item.message}</span>
      </span>
    ));

  return (
    <div
      className="border-b border-slate-800/80 bg-[#0D1320] overflow-hidden px-4 sm:px-6"
      aria-label="PLANETAI employer plans and listing review information"
    >
      <div className="marquee-container marquee-fade-mask relative mx-auto max-w-7xl overflow-hidden">
        <div className="marquee-track">
          <div className="flex items-center">{renderMessages('a')}</div>
          <div className="flex items-center" aria-hidden="true">
            {renderMessages('b')}
          </div>
        </div>
      </div>
    </div>
  );
};
