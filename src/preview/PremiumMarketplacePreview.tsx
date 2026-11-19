import React, {useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {
  ArrowRight, ArrowUpRight, Bookmark, Check, Menu, RefreshCw, Share2,
  Search, ShieldCheck, X,
} from 'lucide-react';
import {formatPayRate, JOB_CATEGORIES} from '../data/jobs';
import type {JobCategory, JobListing} from '../data/jobs';
import {CompanyLogo} from '../components/JobCard';
import {getCompanyLogoUrl} from '../data/jobs';
import {CompanyRevealCard} from '../components/CompanyRevealCard';
import {PlanetAILogo} from '../components/PlanetAILogo';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {AdBanner} from '../components/AdBanner';

interface PremiumMarketplacePreviewProps {
  jobs: JobListing[];
  onRefreshJobs: () => void;
  isRefreshing: boolean;
  lastSyncedAt: string | null;
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenJob: (job: JobListing) => void;
  onPostJob: () => void;
  onShareApp: () => void;
  copied: boolean;
  onOpenPrivacyPolicy: () => void;
  privacyPolicyModal: ReactNode;
  onOpenWorkspace: (tab?: 'ai-tools' | 'saved' | 'platforms' | 'app') => void;
  jobDetailModal: ReactNode;
  postJobModal: ReactNode;
  showCareerTools: boolean;
  careerToolsContent: ReactNode;
  onReturnToMarketplace: () => void;
}

const categoryLabel = (category: JobCategory) =>
  category === 'All' ? 'All opportunities' : category;


const MarqueeCompanyLogo: React.FC<{job: JobListing}> = ({job}) => {
  const [failed, setFailed] = useState(false);
  const logoUrl = getCompanyLogoUrl(job.company, job.companyLogoUrl, job.companyWebsite || job.applyUrl);
  const initials = job.company.trim().split(/\\s+/).map(part => part[0] || '').join('').slice(0, 2).toUpperCase();
  return (
    <div className={`planetai-company-logo-tile flex h-[68px] w-[104px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-[#dce5dc] px-2 py-1.5 shadow-sm sm:h-[72px] sm:w-[116px] ${job.marqueeSpotlight ? 'border-[#c79b50] ring-1 ring-[#c79b50]/50' : ''}`}>
      {logoUrl && !failed ? (
        <img src={logoUrl} alt={job.company + ' logo'} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-7 w-7 object-contain sm:h-8 sm:w-8" />
      ) : (
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-lg bg-[#edf4ee] text-xs font-extrabold text-[#285c4b] sm:h-8 sm:w-8">{initials || 'CO'}</span>
      )}
      {job.marqueeSpotlight && <span className="text-[7px] font-extrabold uppercase tracking-[.16em] text-[#a87928]">Spotlight</span>}
      <span className="max-w-full truncate text-[9px] font-extrabold tracking-[.01em] text-[#40584a] sm:text-[10px]">{job.company}</span>
    </div>
  );
};

export default function PremiumMarketplacePreview({
  jobs,
  onRefreshJobs,
  isRefreshing,
  lastSyncedAt,
  savedIds,
  onToggleSave,
  onOpenJob,
  onPostJob,
  onShareApp,
  copied,
  onOpenPrivacyPolicy,
  privacyPolicyModal,
  onOpenWorkspace,
  jobDetailModal,
  postJobModal,
  showCareerTools,
  careerToolsContent,
  onReturnToMarketplace,
}: PremiumMarketplacePreviewProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<JobCategory>('All');
  const [sort, setSort] = useState('recommended');
  const [menuOpen, setMenuOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = jobs.filter(job =>
      (category === 'All' || job.category === category) &&
      (!q || [
        job.title, job.company, job.category, job.location, job.description,
        ...job.tags,
      ].join(' ').toLowerCase().includes(q))
    );
    if (sort === 'company') return [...matches].sort((a,b) => a.company.localeCompare(b.company));
    if (sort === 'pay') return [...matches].sort((a,b) => b.payMaxUsd - a.payMaxUsd);
    if (sort === 'newest') return [...matches].sort((a,b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return [...matches].sort((a,b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      Number(Boolean(b.urgent)) - Number(Boolean(a.urgent))
    );
  }, [jobs, query, category, sort]);

  const spotlight = filtered.find(job => job.featured) || filtered[0] || jobs[0] || null;
  const marqueeCompanies = useMemo(() => {
    const seen = new Set<string>();
    const priorityOrderedJobs = [...jobs].sort(
      (a, b) => Number(Boolean(b.marqueeSpotlight)) - Number(Boolean(a.marqueeSpotlight))
    );
    return priorityOrderedJobs.filter(job => {
      const key = job.company.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [jobs]);

  if (showCareerTools) {
    return (
      <div className="planetai-nexora min-h-screen bg-[#f7f8f6] text-[#172b24]">
        <header className="sticky top-0 z-40 border-b border-[#e5e9e5] bg-[#fbfcfa]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-2 px-3 sm:h-[76px] sm:px-8">
            <a href="/" onClick={(event) => { event.preventDefault(); onReturnToMarketplace(); }} className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3" aria-label="PLANETAI marketplace home">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#183c32] text-white sm:h-10 sm:w-10"><PlanetAILogo className="h-8 w-8 sm:h-9 sm:w-9"/></span>
              <span className="min-w-0 leading-tight"><span className="block whitespace-nowrap text-[14px] font-extrabold tracking-[-0.06em] sm:text-[17px]">PLANET<span className="text-[#39836a]">AI</span></span><span className="hidden text-[9px] font-semibold uppercase tracking-[.2em] text-[#829089] sm:block">Career workspace</span></span>
            </a>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button type="button" onClick={onShareApp} aria-label={copied ? "PLANETAI link copied" : "Share PLANETAI"} title={copied ? "Copied!" : "Share PLANETAI"} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dce5dc] bg-white text-[#40534a] shadow-sm transition hover:border-[#a9bcae] hover:bg-[#f4f6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b] sm:h-11 sm:w-11">{copied ? <Check size={14} className="text-emerald-500"/> : <Share2 size={14}/>}</button>
              <button onClick={onReturnToMarketplace} className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full border border-[#dce5dc] bg-white px-3 py-1.5 text-xs font-bold text-[#40534a] transition hover:border-[#a9bcae] sm:min-h-11 sm:px-4 sm:py-2.5 sm:text-[11px]">Back to marketplace <ArrowRight className="inline" size={13}/></button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-5 py-9 sm:px-8 sm:py-12">
          <div className="mb-8 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#59816b]">PLANETAI · Free career tools</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#1b3027] sm:text-4xl">Your career workspace.</h1>
            <p className="mt-3 text-sm leading-6 text-[#77847b]">Build your resume, prepare for interviews and make your next career move—all in the same PLANETAI experience.</p>
            <nav aria-label="Career workspace sections" className="mt-6 flex flex-wrap gap-2">
              <a href="#career-ai-tools" className="rounded-full border border-[#dce5dc] bg-white px-4 py-2.5 text-[11px] font-bold text-[#40564a] hover:border-[#9fb6a4]">AI career tools</a>
              <a href="#career-discovery" className="rounded-full border border-[#dce5dc] bg-white px-4 py-2.5 text-[11px] font-bold text-[#40564a] hover:border-[#9fb6a4]">AI & developer discovery</a>
              <a href="#career-productivity" className="rounded-full border border-[#dce5dc] bg-white px-4 py-2.5 text-[11px] font-bold text-[#40564a] hover:border-[#9fb6a4]">Productivity toolkit</a>
            </nav>
          </div>
          {careerToolsContent}
        </main>
        <footer className="border-t border-[#e2e8e1] bg-[#f0f3ee]"><div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-6 text-[10px] font-medium text-[#819087] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-bold tracking-wide text-[#40564a]">PLANETAI · Global careers</span><div className="flex flex-wrap items-center gap-4"><button onClick={onOpenPrivacyPolicy} className="font-semibold text-[#52685a] underline-offset-4 hover:underline">Privacy Policy</button></div><span>Free tools · Browse freely</span></div></footer>
        {privacyPolicyModal}
      </div>
    );
  }

  return (
    <div className="planetai-nexora min-h-screen bg-[#f7f8f6] text-[#17231f]">
      <header className="sticky top-0 z-40 border-b border-[#e5e9e5] bg-[#fbfcfa]/95 backdrop-blur-xl">
        <div className="relative mx-auto max-w-[1320px] px-2 sm:px-8">
          <div className="flex h-[68px] items-center justify-between gap-2 sm:h-[76px] sm:gap-4">
            <a href="#top" className="flex shrink-0 items-center gap-1.5 sm:gap-3" aria-label="PLANETAI marketplace home">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#183c32] text-white sm:h-10 sm:w-10"><PlanetAILogo className="h-8 w-8 sm:h-9 sm:w-9"/></span>
              <span className="leading-tight"><span className="block whitespace-nowrap text-[14px] font-extrabold tracking-[-0.06em] sm:text-[17px]">PLANET<span className="text-[#39836a]">AI</span></span><span className="hidden truncate text-[9px] font-semibold uppercase tracking-[.2em] text-[#829089] sm:block">Global careers, with clarity</span></span>
            </a>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button type="button" onClick={onShareApp} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dce5dc] bg-white text-[#40534a] shadow-sm transition hover:border-[#a9bcae] hover:bg-[#f4f6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b] sm:h-11 sm:w-11" aria-label={copied ? "PLANETAI link copied" : "Share PLANETAI"} title={copied ? "Copied!" : "Share PLANETAI"}>{copied ? <Check size={14} className="text-emerald-500"/> : <Share2 size={14}/>}</button>
              <button onClick={onPostJob} className="inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-full bg-[#183c32] px-2.5 py-2 text-[10px] font-bold text-white shadow-sm transition hover:bg-[#285c4b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b] sm:min-h-11 sm:gap-1.5 sm:px-5 sm:py-3 sm:text-xs">Post a job <ArrowUpRight className="inline" size={13}/></button>
              <button
                type="button"
                onClick={() => setMenuOpen(value => !value)}
                aria-label={menuOpen ? "Close main menu" : "Open main menu"}
                aria-expanded={menuOpen}
                aria-controls="planetai-main-menu"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dce5dc] bg-white text-[#40534a] transition hover:border-[#a9bcae] hover:bg-[#f4f6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b] sm:h-11 sm:w-11"
              >
                {menuOpen ? <X size={19}/> : <Menu size={19}/>}
              </button>
            </div>
          </div>
          {menuOpen && (
            <nav
              id="planetai-main-menu"
              aria-label="Main navigation"
              onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }}
              className="absolute right-5 top-[calc(100%-0.25rem)] z-50 max-h-[calc(100vh-110px)] w-[min(92vw,420px)] overflow-y-auto rounded-2xl border border-[#e2e8e1] bg-white p-4 shadow-[0_24px_70px_rgba(20,44,38,.18)] sm:right-8 sm:p-5"
            >
              <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-6">
                <section>
                  <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#8a978e]">Explore</p>
                  <div className="flex flex-col gap-1">
                    <a href="#opportunities" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">Find opportunities</a>
                    <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">How it works</a>
                    <button onClick={() => { setMenuOpen(false); onOpenWorkspace('ai-tools'); }} className="rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">Career tools</button>
                  </div>
                </section>
                <section>
                  <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#8a978e]">For candidates</p>
                  <div className="flex flex-col gap-1">
                    <a href="/?experience=job-seeker-auth&mode=signin" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">Candidate sign in</a>
                    <a href="/?experience=job-seeker-auth&mode=signup" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">Create free account</a>
                  </div>
                </section>
                <section>
                  <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#8a978e]">For employers</p>
                  <div className="flex flex-col gap-1">
                    <a href="#employers" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">Employer information</a>
                    <a href="/?experience=employer-auth&mode=signin" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-[12px] font-semibold text-[#40534a] transition hover:bg-[#f1f5ef] hover:text-[#183c32]">Employer sign in</a>
                  </div>
                </section>
                <section>
                  <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#8a978e]">More</p>
                  <div className="px-2">
                    <PWAInstallButton compact/>
                  </div>
                </section>
              </div>
            </nav>
          )}
        </div>
      </header>

      <section className="mx-auto my-4 w-full max-w-[1320px] px-5 sm:px-8">
        <div
          role="region"
          aria-label="Companies with opportunities on PLANETAI"
          className="overflow-hidden rounded-2xl border border-[#9b8cff]/35 bg-gradient-to-r from-[#5636b8] via-[#5c45c9] to-[#2563c7] text-white shadow-[0_12px_32px_rgba(54,45,130,.16)]"
        >
          <p className="sr-only">Explore companies represented in current PLANETAI job listings.</p>
          <div className="grid grid-cols-1 items-center gap-2 px-6 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[.18em] text-white/90">Companies to explore</span>
            <div className="marquee-container marquee-fade-mask min-w-0 w-full overflow-hidden px-3 sm:px-4">
              <div className="marquee-track items-center gap-3 sm:gap-4">
                <div className="flex shrink-0 items-center gap-3 pr-3 sm:gap-4 sm:pr-4">{marqueeCompanies.map(job => <MarqueeCompanyLogo key={'a-' + job.company} job={job}/>)}</div>
                <div className="flex shrink-0 items-center gap-3 pr-3 sm:gap-4 sm:pr-4" aria-hidden="true">{marqueeCompanies.map(job => <MarqueeCompanyLogo key={'b-' + job.company} job={job}/>)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <main id="top">
        <section className="relative overflow-hidden bg-[#e9eee8]">
          <div className="pointer-events-none absolute -right-28 -top-40 h-[560px] w-[560px] rounded-full border border-[#d3ddd3] opacity-70"/>
          <div className="pointer-events-none absolute -right-8 top-10 h-[390px] w-[390px] rounded-full border border-[#d3ddd3] opacity-70"/>
          <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
            <div className="relative z-10 max-w-[720px]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d0dbd0] bg-white/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#426353]"><span className="h-1.5 w-1.5 rounded-full bg-[#4e9476]"/> PLANETAI · GLOBAL CAREERS</div>
              <h1 className="max-w-[700px] text-[clamp(3rem,6.3vw,5.9rem)] font-semibold leading-[.99] tracking-[-.075em] text-[#172b24]">Find work that moves <span className="font-serif font-normal italic text-[#54806b]">you forward.</span></h1>
              <p className="mt-7 max-w-[520px] text-[15px] leading-7 text-[#65736b] sm:text-[17px]">Discover opportunities from companies around the world. Clear details, transparent expectations and a direct path to apply.</p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a href="#opportunities" className="inline-flex items-center gap-3 rounded-full bg-[#183c32] px-6 py-4 text-[13px] font-bold text-white shadow-lg shadow-[#183c32]/10 transition hover:-translate-y-0.5 hover:bg-[#285c4b]">Explore opportunities <ArrowRight size={16}/></a>
                <span className="text-[11px] font-semibold text-[#75837a]"><ShieldCheck className="mr-1 inline text-[#54806b]" size={15}/> No candidate account required</span>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#d4ddd4] pt-6 text-[11px] font-semibold text-[#69786f]"><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Direct employer applications</span><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Clear job information</span><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Browse freely</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[480px]">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-[#dbe5db] blur-2xl"/>
              <div className="relative rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_30px_80px_rgba(28,55,42,.12)] sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#819087]">Opportunity spotlight</p><p className="mt-1 text-lg font-bold tracking-tight text-[#1d3028]">A better next step.</p></div><span className="rounded-full bg-[#eef4ee] px-3 py-1.5 text-[10px] font-bold text-[#47745c]">{spotlight ? (spotlight.isCustomEmployerPost ? 'Employer published' : 'Curated role') : 'Opportunities'}</span></div>
                {spotlight ? <button onClick={() => onOpenJob(spotlight)} className="mt-6 block w-full rounded-2xl bg-[#f4f6f2] p-4 text-left transition hover:bg-[#edf2eb]">
                  <div className="flex items-center gap-3"><CompanyLogo company={spotlight.company} short={spotlight.companyShort} explicitLogoUrl={spotlight.companyLogoUrl} websiteOrApplyUrl={spotlight.companyWebsite || spotlight.applyUrl} size="lg" lazy={false}/><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#25372e]">{spotlight.title}</p><p className="mt-1 text-[11px] text-[#7b8980]">{spotlight.company} · {spotlight.location}</p></div><Bookmark size={17} className="text-[#819087]"/></div>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#66766c]">{spotlight.workType}</span><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#66766c]">{spotlight.category}</span></div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#e1e7df] pt-4"><span className="text-sm font-extrabold tracking-wide text-[#38c8ff]">{formatPayRate(spotlight.payMinUsd, spotlight.payMaxUsd, spotlight.payUnit)}</span><span className="text-[10px] font-bold text-[#537a64]">VIEW ROLE ↗</span></div>
                </button> : <div className="mt-6 rounded-2xl bg-[#f4f6f2] p-8 text-center text-sm text-[#77847b]">New opportunities are on the way.</div>}
                <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#e8ece7] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8b978f]">Opportunities</p><p className="mt-1 text-xs font-bold text-[#33473b]">{jobs.length} available to explore</p></div><div className="rounded-xl border border-[#e8ece7] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8b978f]">Designed for</p><p className="mt-1 text-xs font-bold text-[#33473b]">Global talent</p></div></div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:block"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8a978e]">Your next chapter</p><p className="mt-1 text-xs font-bold text-[#315b47]">Starts with a possibility.</p></div>
            </div>
          </div>
        </section>

        <section id="opportunities" className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#59816b]">The opportunity board</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#1b3027] sm:text-4xl">Work worth exploring.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#77847b]">Search curated and employer-published roles by skill, company or location.</p></div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#718077]"><ShieldCheck size={16} className="text-[#58816b]"/> Employer listings are reviewed before publication</div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8a978f]">{lastSyncedAt ? `Updated ${new Date(lastSyncedAt).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}` : 'Checking listings'}</span>
                <button type="button" onClick={onRefreshJobs} disabled={isRefreshing} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#dce5dc] bg-white px-3.5 py-2 text-[11px] font-bold text-[#40534a] transition hover:border-[#a9bcae] disabled:cursor-wait disabled:opacity-60" aria-label="Refresh job listings">
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''}/>
                  {isRefreshing ? 'Refreshing' : 'Refresh jobs'}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-7 rounded-2xl border border-[#e2e8e1] bg-white p-3 shadow-[0_12px_40px_rgba(28,55,42,.04)] sm:mt-9 sm:flex sm:items-center sm:gap-3 sm:p-4">
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-2"><Search size={18} className="shrink-0 text-[#839087]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job title, skill or company" aria-label="Search opportunities" className="w-full min-w-0 bg-transparent text-sm text-[#25372e] outline-none placeholder:text-[#a2aca5]"/></div>
            <div className="flex items-center gap-2 border-t border-[#edf0ec] pt-3 sm:border-0 sm:pt-0">
              <label htmlFor="opportunity-sort" className="shrink-0 text-[10px] font-bold text-[#718077] sm:hidden">Sort by</label>
              <select id="opportunity-sort" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort opportunities" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#dce5dc] bg-[#f7f9f6] px-3 text-xs font-bold text-[#344a3d] outline-none transition focus:border-[#71917b] focus:ring-2 focus:ring-[#71917b]/20 sm:flex-none sm:min-w-[156px]"><option value="recommended">Recommended</option><option value="newest">Featured first</option><option value="pay">Highest pay</option><option value="company">Company A–Z</option></select>
              <button className="min-h-11 shrink-0 rounded-xl bg-[#183c32] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#285c4b] sm:px-5" onClick={() => document.getElementById('role-list')?.scrollIntoView({behavior:'smooth'})}>Search</button>
            </div>
          </div>
          <div className="no-scrollbar mt-6 -mr-2 flex gap-2 overflow-x-auto overscroll-x-contain pb-3 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mr-0 sm:pr-0">{JOB_CATEGORIES.map(item => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-bold transition ${category === item ? 'bg-[#183c32] text-white' : 'border border-[#e0e7df] bg-white text-[#68766d] hover:border-[#a9bcae]'}`}>{categoryLabel(item)}</button>)}</div>
          <div className="mt-5 flex items-center justify-between"><p className="text-xs font-bold text-[#40534a]">{filtered.length} opportunities</p><p className="text-[10px] text-[#9aa49d]">Curated and approved employer listings</p></div>
          <div id="role-list" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(job => <CompanyRevealCard key={job.id} job={job} isSaved={savedIds.includes(job.id)} onToggleSave={onToggleSave} onOpenJob={onOpenJob}/>)} 
          </div>
          {filtered.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#d7e0d7] bg-white p-12 text-center"><Search className="mx-auto text-[#8b9a8f]"/><p className="mt-3 font-bold text-[#344a3d]">No matching opportunities</p><p className="mt-1 text-xs text-[#87938b]">Try a different search or category.</p></div>}
        </section>

        <section id="how-it-works" className="border-y border-white/[0.07] bg-[#0d1425]">
          <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8d7aff]">Simple by design</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Less friction. More possibility.</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#9ba9c1]">A straightforward path from discovering an opportunity to taking your next career step.</p>
            </div>
            <div className="mt-10 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:gap-5">
              {[{n:'01',title:'Explore freely',body:'Browse roles and company information without creating a candidate account.'},{n:'02',title:'Know what to expect',body:'Review responsibilities, compensation, location, eligibility and requirements.'},{n:'03',title:'Apply directly',body:'Continue to the employer’s official application destination when you are ready.'}].map(item => <article key={item.n} className="flex h-full min-h-[220px] flex-col rounded-[22px] border border-white/[0.09] bg-[#111b30] p-6 shadow-[0_16px_44px_rgba(0,0,0,.16)] transition duration-300 hover:-translate-y-1 hover:border-[#8265ff]/35 sm:p-7">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#8265ff]/25 bg-[#292044] text-xs font-extrabold tracking-wide text-[#bcaaff]">{item.n}</span>
                <h3 className="mt-6 text-lg font-bold tracking-tight text-white">{item.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#aebbd0]">{item.body}</p>
              </article>)}
            </div>
          </div>
        </section>
        <section aria-label="Sponsored information" className="border-b border-[#e3e9e2] bg-[#f7f8f6] py-7"><div className="mx-auto max-w-[1320px] px-5 sm:px-8"><AdBanner placement="bottom-suite" /></div></section>

        <section id="employers" className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24"><div className="overflow-hidden rounded-[28px] bg-[#183c32] p-7 text-white sm:p-12 lg:p-16"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a7c7b2]">For employers</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-.055em] sm:text-5xl">Meet the people who can move your business forward.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#c4d6ca]">Create an employer workspace, submit a role for review, and publish after approval. Free listings are welcome.</p><div className="mt-7 flex flex-wrap gap-3 text-[11px] font-semibold text-[#d6e6db]"><span><Check className="mr-1 inline" size={14}/> Employer workspace</span><span><Check className="mr-1 inline" size={14}/> Human review</span><span><Check className="mr-1 inline" size={14}/> Clear listing packages</span></div></div><div className="flex flex-col items-start gap-3"><button onClick={onPostJob} className="inline-flex items-center gap-3 rounded-full bg-[#f1f5ec] px-6 py-4 text-[12px] font-extrabold text-[#183c32] transition hover:bg-white">Post a role <ArrowUpRight size={16}/></button><a href="/?experience=employer-auth&mode=signin" className="text-[11px] font-semibold text-[#d6e6db] underline underline-offset-4 hover:text-white">Already have an employer workspace? Sign in</a></div></div></div></section>
      </main>
      <footer className="border-t border-[#e2e8e1] bg-[#f0f3ee]"><div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-5 py-8 text-[10px] font-medium text-[#819087] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-bold tracking-wide text-[#40564a]">PLANETAI <span className="font-normal text-[#8b978e]">· Global careers</span></span><div className="flex flex-wrap gap-4"><button onClick={() => onOpenWorkspace('saved')} className="font-semibold hover:text-[#183c32]">Saved roles</button><button onClick={() => onOpenWorkspace('ai-tools')} className="font-semibold hover:text-[#183c32]">AI career tools</button><button onClick={() => onOpenWorkspace('platforms')} className="font-semibold hover:text-[#183c32]">Platforms</button><button onClick={onOpenPrivacyPolicy} className="font-semibold hover:text-[#183c32]">Privacy Policy</button></div><span>Browse freely · Apply directly</span></div></footer>
      {jobDetailModal}
      {postJobModal}
      {privacyPolicyModal}
      <div className="fixed bottom-3 right-3 z-40 hidden rounded-lg border border-[#dce4dc] bg-white/95 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#6b7d70] shadow-lg sm:block">PLANETAI Marketplace</div>
    </div>
  );
}
