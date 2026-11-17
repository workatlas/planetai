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
    url: 'https://gemini.google.com/',
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
    url: 'https://aistudio.google.com/',
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
    url: 'https://idx.google.com/',
  },
  {
    id: 'builder-4',
    name: 'Netlify',
    category: 'Free App & Web Builders',
    pricing: 'Free Starter Tier',
    description:
      'Free instant web and PWA hosting with automated HTTPS, edge previews, and continuous Git deployments.',
    url: 'https://www.netlify.com/',
  },
  {
    id: 'builder-5',
    name: 'PWABuilder',
    category: 'Free App & Web Builders',
    pricing: '100% Free Utility',
    description:
      'Free PWA to Android APK/AAB packager for Google Play Store submission and Trusted Web Activity builds.',
    url: 'https://www.pwabuilder.com/',
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

export const NewsDevToolsView: React.FC<{showAds?: boolean}> = ({showAds = true}) => {
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
          <Bot className="w-5 h-5 text-[#39836a] shrink-0" />
          <h1
            id="news-tools-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-[#1d3028] tracking-tight"
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
              className="group flex flex-col justify-between rounded-2xl border border-[#e2e8e1] bg-white p-4 hover:border-[#a9bcae] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold text-[#1d3028] group-hover:text-[#39836a] transition-colors">
                    {assistant.name}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#39836a] shrink-0" />
                </div>
                <p className="mt-1.5 text-xs text-[#68766d] leading-relaxed">
                  {assistant.useCase}
                </p>
              </div>
              <span className="mt-3 text-[11px] font-medium text-[#39836a]">
                Launch Assistant ↗
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* AI & Remote Work Radar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Newspaper className="w-5 h-5 text-[#39836a] shrink-0" />
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1d3028] tracking-tight">
            AI & Remote Work Radar
          </h2>
        </div>
        <p className="text-sm text-[#819087]">Curated industry signals and source links. Open each source for its latest updates.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {LIVE_NEWS.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-[#e2e8e1] bg-white p-5 hover:border-[#a9bcae] transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 text-xs text-[#819087]">
                  <span className="font-semibold text-[#39836a]">
                    {item.source}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{item.date}</span>
                </div>
                <h3 className="mt-2.5 font-display text-base sm:text-lg font-bold text-[#1d3028] leading-snug">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[#68766d] leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#e2e8e1]">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[40px] text-xs sm:text-sm font-semibold text-[#39836a] hover:text-[#285c4b] transition-colors"
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
              <Wrench className="w-5 h-5 text-[#39836a] shrink-0" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1d3028] tracking-tight">
                Free App Builders & Developer Tools
              </h2>
            </div>
            <p className="mt-1 text-sm text-[#819087]">
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
                    ? 'border-[#39836a] bg-[#183c32] text-white'
                    : 'border-[#e2e8e1] bg-white text-[#68766d] hover:border-[#dce5dc]'
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
              className="flex flex-col justify-between rounded-2xl border border-[#e2e8e1] bg-white p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#819087]">
                  <span className="text-[#39836a] font-semibold">
                    {tool.category}
                  </span>
                  <span>{tool.pricing}</span>
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-[#1d3028]">
                  {tool.name}
                </h3>
                <p className="mt-2 text-sm text-[#68766d] leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#e2e8e1]">
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[40px] text-xs sm:text-sm font-semibold text-[#40534a] hover:text-[#39836a] transition-colors"
                >
                  <span>Open Tool</span>
                  <ArrowUpRight className="w-4 h-4 text-[#39836a] shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Frictionless Weekly AI Job Drop Newsletter */}
      <div className="rounded-2xl border border-[#e2e8e1] bg-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[#39836a] text-xs font-semibold">
              <Mail className="w-4 h-4" />
              <span>Weekly AI Job Drop · Zero Account Required</span>
            </div>
            <h2 className="mt-1.5 font-display text-xl font-bold text-[#1d3028]">
              Get curated global USD AI batches in your inbox
            </h2>
            <p className="mt-1 text-sm text-[#819087]">
              One clean digest every Monday highlighting urgent openings across micro1, Alignerr, Outlier, Babel Audio, Mercor, Visora, and Spout.
            </p>
          </div>

          <div className="w-full lg:w-auto lg:min-w-[380px]">
            {subscribedEmail ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#b9d7c0] bg-[#f0f7f0] px-4 py-3 text-sm text-[#356a45]">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-[#39836a] shrink-0" />
                  <span className="truncate">
                    Subscribed: <strong>{subscribedEmail}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSubscribedEmail(null)}
                  className="text-xs font-semibold text-[#39836a] hover:underline shrink-0"
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
                  className="flex-1 min-h-[44px] rounded-xl border border-[#dce5dc] bg-[#f7f9f6] px-3.5 py-2 text-sm text-[#40534a] placeholder:text-[#9aa49d] focus:border-[#39836a] focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#183c32] text-white text-sm font-bold hover:bg-[#285c4b] transition-colors whitespace-nowrap shrink-0"
                >
                  Subscribe Free
                </button>
              </form>
            )}
            {emailError && (
              <p className="mt-1.5 text-xs text-[#b45353]">{emailError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom AdBanner */}
      {showAds && <AdBanner placement="bottom-suite" />}
    </section>
  );
};
