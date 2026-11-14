import React, {useState} from 'react';
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Mail,
  Newspaper,
  Wrench,
} from 'lucide-react';
import {sanitizeText} from '../utils/sanitize';
import {AdBanner} from './AdBanner';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  url: string;
}

interface AIAssistantItem {
  id: string;
  name: string;
  useCase: string;
  url: string;
}

interface DevToolItem {
  id: string;
  name: string;
  category:
    | 'Free App & Web Builders'
    | 'Code Assistants'
    | 'Audio Cleaners'
    | 'Prompt Checkers';
  pricing: string;
  description: string;
  url: string;
}

export const TOP_AI_ASSISTANTS: AIAssistantItem[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    useCase: 'Multimodal reasoning & workspace prep',
    url: 'https://google.com',
  },
  {
    id: 'claude',
    name: 'Claude AI',
    useCase: 'Long-document analysis & coding assistance',
    url: 'https://claude.ai',
  },
  {
    id: 'grok',
    name: 'Grok',
    useCase: 'Real-time web & X insights',
    url: 'https://grok.com',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    useCase: 'Cited research & company lookup',
    url: 'https://perplexity.ai',
  },
];

const LIVE_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'AI Lab Demand Surges for Verified SWE-Bench & Code Review Evaluators',
    source: 'micro1 Insights',
    date: 'Nov 2026',
    summary:
      'Frontier coding models increasingly rely on human-authored pull request reviews, unit tests, and repository debugging benchmarks.',
    url: 'https://micro1.ai',
  },
  {
    id: 'news-2',
    title: 'Multilingual & Expressive Speech Datasets Expand Worldwide',
    source: 'Babel Audio',
    date: 'Nov 2026',
    summary:
      'Voice synthesis startups are actively onboarding bilingual and regional dialect speakers for natural prosody capture.',
    url: 'https://babel.audio',
  },
  {
    id: 'news-3',
    title: 'Autonomous Agent Benchmarks Create New Senior Remote Contract Tier',
    source: 'Mercor Research',
    date: 'Nov 2026',
    summary:
      'Domain specialists in software engineering, healthcare, and law are seeing flexible hourly contracts reach $65-$135/hr globally.',
    url: 'https://mercor.com',
  },
  {
    id: 'news-4',
    title: 'Multimodal Video & Spatial Robotics Annotation Hiring Expands',
    source: 'Visora Updates',
    date: 'Nov 2026',
    summary:
      'Embodied AI pipelines require high-precision temporal frame segmentation and object-trajectory verification from remote annotators.',
    url: 'https://visora.com',
  },
];

const DEV_TOOLS: DevToolItem[] = [
  {
    id: 'builder-1',
    name: 'Google AI Studio',
    category: 'Free App & Web Builders',
    pricing: 'Free Workspace',
    description:
      'Rapid AI app prototyping with instant full-stack preview, prompt testing, and deployment readiness.',
    url: 'https://google.com',
  },
  {
    id: 'builder-2',
    name: 'GitHub',
    category: 'Free App & Web Builders',
    pricing: 'Free / Open Source',
    description:
      'Free code hosting, Copilot coding assistant, Actions CI/CD, and GitHub Pages static web hosting.',
    url: 'https://github.com',
  },
  {
    id: 'builder-3',
    name: 'Google Antigravity / IDX',
    category: 'Free App & Web Builders',
    pricing: 'Free Cloud IDE',
    description:
      'Cloud AI development workspace for building full-stack web apps, mobile previews, and APIs in browser.',
    url: 'https://google.com',
  },
  {
    id: 'builder-4',
    name: 'Netlify',
    category: 'Free App & Web Builders',
    pricing: 'Free Starter Tier',
    description:
      'Free instant web and PWA hosting with automated HTTPS, edge previews, and continuous Git deployments.',
    url: 'https://netlify.com',
  },
  {
    id: 'builder-5',
    name: 'PWABuilder',
    category: 'Free App & Web Builders',
    pricing: '100% Free Utility',
    description:
      'Free PWA to Android APK/AAB packager for Google Play Store submission and Trusted Web Activity builds.',
    url: 'https://pwabuilder.com',
  },
  {
    id: 'tool-1',
    name: 'VS Code + Continue',
    category: 'Code Assistants',
    pricing: 'Free / Open Source',
    description:
      'Open-source AI code assistant extension for reviewing diffs, generating unit tests, and verifying coding benchmarks locally.',
    url: 'https://www.continue.dev/',
  },
  {
    id: 'tool-2',
    name: 'GitHub Copilot Free Tier',
    category: 'Code Assistants',
    pricing: 'Free Tier',
    description:
      'Inline completions and PR inspection helpers for TypeScript, Python, SQL, and Go evaluation tasks.',
    url: 'https://github.com/features/copilot',
  },
  {
    id: 'tool-3',
    name: 'Audacity + OpenVINO',
    category: 'Audio Cleaners',
    pricing: 'Free / Open Source',
    description:
      'Local waveform editor for checking -12 dB peak targets, clipping, and noise floor before submitting voice auditions.',
    url: 'https://www.audacityteam.org/',
  },
  {
    id: 'tool-4',
    name: 'Krisp Acoustic Check',
    category: 'Audio Cleaners',
    pricing: 'Free Daily Minutes',
    description:
      'Real-time background echo and fan-noise monitor for live AI video interviews and voice screening calls.',
    url: 'https://krisp.ai/',
  },
  {
    id: 'tool-5',
    name: 'JSONLint & Schema Validator',
    category: 'Prompt Checkers',
    pricing: 'Free Web Tool',
    description:
      'Instant syntax validation for structured output annotation tasks and API tool-calling benchmarks.',
    url: 'https://jsonlint.com/',
  },
];

type DevToolCategoryFilter =
  | 'All'
  | 'Free App & Web Builders'
  | 'Code Assistants'
  | 'Audio Cleaners'
  | 'Prompt Checkers';

export const NewsDevToolsView: React.FC = () => {
  const [toolFilter, setToolFilter] = useState<DevToolCategoryFilter>('All');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem('planetai_newsletter_email');
    } catch {
      return null;
    }
  });
  const [emailError, setEmailError] = useState('');

  const visibleTools =
    toolFilter === 'All'
      ? DEV_TOOLS
      : DEV_TOOLS.filter((t) => t.category === toolFilter);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeText(newsletterEmail, 160);
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError('');
    setSubscribedEmail(clean);
    try {
      window.localStorage.setItem('planetai_newsletter_email', clean);
    } catch {
      // Ignore storage errors
    }
    setNewsletterEmail('');
  };

  return (
    <section aria-labelledby="news-tools-heading" className="space-y-8">
      {/* Top AI Assistants Quick-Launch Hub */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Bot className="w-5 h-5 text-cyan-400 shrink-0" />
          <h1
            id="news-tools-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight"
          >
            Top AI Assistants
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOP_AI_ASSISTANTS.map((assistant) => (
            <a
              key={assistant.id}
              href={assistant.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#111827] p-4 hover:border-cyan-500/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold text-slate-50 group-hover:text-cyan-300 transition-colors">
                    {assistant.name}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-cyan-400 shrink-0" />
                </div>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  {assistant.useCase}
                </p>
              </div>
              <span className="mt-3 text-[11px] font-medium text-cyan-300">
                Launch Assistant ↗
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Live AI & Remote Work News */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-5 h-5 text-cyan-400 shrink-0" />
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-50 tracking-tight">
            Live AI & Remote Work News
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LIVE_NEWS.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#111827] p-5 hover:border-cyan-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-cyan-300">
                    {item.source}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{item.date}</span>
                </div>
                <h3 className="mt-2.5 font-display text-base sm:text-lg font-bold text-slate-50 leading-snug">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[40px] text-xs sm:text-sm font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                >
                  <span>Read Source</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Free AI, App Builders & Developer Tools Directory */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Wrench className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-50 tracking-tight">
                Free App Builders & Developer Tools
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Zero-cost app builders, PWA packagers, code assistants, audio cleaners, and prompt validators.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {(
              [
                'All',
                'Free App & Web Builders',
                'Code Assistants',
                'Audio Cleaners',
                'Prompt Checkers',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setToolFilter(cat)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  toolFilter === cat
                    ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                    : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleTools.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#111827] p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="text-cyan-300 font-semibold">
                    {tool.category}
                  </span>
                  <span>{tool.pricing}</span>
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-slate-50">
                  {tool.name}
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[40px] text-xs sm:text-sm font-semibold text-slate-100 hover:text-cyan-300 transition-colors"
                >
                  <span>Open Tool</span>
                  <ArrowUpRight className="w-4 h-4 text-cyan-400 shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frictionless Weekly AI Job Drop Newsletter */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
              <Mail className="w-4 h-4" />
              <span>Weekly AI Job Drop · Zero Account Required</span>
            </div>
            <h2 className="mt-1.5 font-display text-xl font-bold text-slate-50">
              Get curated global USD AI batches in your inbox
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              One clean digest every Monday highlighting urgent openings across micro1, Alignerr, Outlier, Babel Audio, Mercor, Visora, and Spout.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[380px]">
            {subscribedEmail ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Subscribed: <strong>{subscribedEmail}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscribedEmail(null)}
                  className="text-xs font-semibold text-emerald-300 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <label htmlFor="weekly-drop-email" className="sr-only">
                  Email address for Weekly AI Job Drop
                </label>
                <input
                  id="weekly-drop-email"
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
                >
                  Subscribe Free
                </button>
              </form>
            )}
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-400">{emailError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom AdBanner */}
      <AdBanner placement="bottom-suite" />
    </section>
  );
};
