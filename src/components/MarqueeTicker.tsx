import React from 'react';
import {Star, Zap} from 'lucide-react';
import {formatPayRate, JobListing} from '../data/jobs';

interface MarqueeItem {
  id: string;
  platform: string;
  alert: string;
  minUsd: number;
  maxUsd: number;
  unit: 'hr' | 'yr' | 'project';
  featured?: boolean;
}

const MARQUEE_ITEMS: MarqueeItem[] = [
  {
    id: 'm1',
    platform: 'micro1',
    alert: 'Urgent Hiring · Python & TypeScript AI Reviewers',
    minUsd: 55,
    maxUsd: 85,
    unit: 'hr',
  },
  {
    id: 'm2',
    platform: 'Alignerr',
    alert: 'Active Cohort · Multilingual Rubric Specialists',
    minUsd: 35,
    maxUsd: 60,
    unit: 'hr',
  },
  {
    id: 'm3',
    platform: 'Outlier',
    alert: 'Immediate Onboarding · STEM & Math Reasoning Trainers',
    minUsd: 40,
    maxUsd: 65,
    unit: 'hr',
  },
  {
    id: 'm4',
    platform: 'Babel Audio',
    alert: 'Voice AI Surge · Conversational Audio Annotators',
    minUsd: 24,
    maxUsd: 38,
    unit: 'hr',
  },
  {
    id: 'm5',
    platform: 'Mercor',
    alert: 'High-Rate Contract · Full-Stack Eval Engineers',
    minUsd: 65,
    maxUsd: 100,
    unit: 'hr',
  },
  {
    id: 'm6',
    platform: 'Visora',
    alert: 'Vision AI Batch · Multimodal Video Annotators',
    minUsd: 20,
    maxUsd: 32,
    unit: 'hr',
  },
  {
    id: 'm7',
    platform: 'Spout',
    alert: 'Urgent Need · Phonetics & Dialect Transcribers',
    minUsd: 26,
    maxUsd: 42,
    unit: 'hr',
  },
  {
    id: 'm8',
    platform: 'Turing',
    alert: 'Remote Salary · Post-Training Systems Engineers',
    minUsd: 115000,
    maxUsd: 155000,
    unit: 'yr',
  },
];

interface MarqueeTickerProps {
  onSelectPlatform: (platform: string) => void;
  spotlightJobs?: JobListing[];
}

export const MarqueeTicker: React.FC<MarqueeTickerProps> = ({
  onSelectPlatform,
  spotlightJobs = [],
}) => {
  const customMarqueeItems: MarqueeItem[] = spotlightJobs
    .filter((j) => j.marqueeSpotlight || j.featured)
    .map((j) => ({
      id: `spot-${j.id}`,
      platform: j.company,
      alert: `Featured Spotlight · ${j.title}`,
      minUsd: j.payMinUsd,
      maxUsd: j.payMaxUsd,
      unit: j.payUnit,
      featured: true,
    }));

  const combinedItems = [...customMarqueeItems, ...MARQUEE_ITEMS];

  const renderItems = (keyPrefix: string) =>
    combinedItems.map((item) => (
      <button
        key={`${keyPrefix}-${item.id}`}
        type="button"
        onClick={() => onSelectPlatform(item.platform)}
        className="inline-flex items-center gap-2.5 px-5 py-2 text-xs text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-cyan-300"
      >
        {item.featured ? (
          <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        )}
        <span
          className={`font-semibold ${
            item.featured ? 'text-amber-200' : 'text-slate-100'
          }`}
        >
          {item.platform}
        </span>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <span>{item.alert}</span>
        <span className="text-slate-600" aria-hidden="true">
          ·
        </span>
        <span className="font-mono tabular-nums font-medium text-cyan-300">
          {formatPayRate(item.minUsd, item.maxUsd, item.unit)}
        </span>
      </button>
    ));

  return (
    <div
      className="border-b border-slate-800/80 bg-[#0D1320] overflow-hidden px-4 sm:px-6"
      aria-label="Urgent AI hiring alerts and global USD pay ranges"
    >
      <div className="marquee-container marquee-fade-mask relative mx-auto max-w-7xl overflow-hidden">
        <div className="marquee-track">
          <div className="flex items-center">{renderItems('a')}</div>
          <div className="flex items-center" aria-hidden="true">
            {renderItems('b')}
          </div>
        </div>
      </div>
    </div>
  );
};
