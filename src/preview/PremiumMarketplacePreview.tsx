import React, {useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {
  ArrowRight, ArrowUpRight, Check, Menu, RefreshCw, Share2,
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


const MarqueeCompanyLogo: React.FC<{company: string; job?: JobListing}> = ({company, job}) => {
  const [failed, setFailed] = useState(false);
  const logoUrl = getCompanyLogoUrl(company, job?.companyLogoUrl, job?.companyWebsite || job?.applyUrl);
  const initials = company.trim().split(/\s+/).map(part => part[0] || '').join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex h-6 shrink-0 items-center gap-2">
      {logoUrl && !failed ? <img src={logoUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-4 w-4 object-contain grayscale opacity-65"/> : <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded bg-white/10 text-[7px] font-bold text-slate-400">{initials || 'CO'}</span>}
      <span className="whitespace-nowrap text-[10px] font-semibold tracking-wide text-slate-400">{company}</span>
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
  const [quickFilter, setQuickFilter] = useState<'All' | 'Paid Only' | 'Saved' | 'Coding' | 'AI Training' | 'Remote'>('All');
  const visibleJobs = useMemo(() => jobs.filter(job => !(job.isCustomEmployerPost && job.title.trim().toLowerCase() === 'planetai test')), [jobs]);

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleJobs.filter(job =>
      (category === 'All' || job.category === category) &&
      (!q || [job.title, job.company, job.category, job.location, job.description, ...job.tags].join(' ').toLowerCase().includes(q))
    );
  }, [visibleJobs, query, category]);

  const filtered = useMemo(() => {
    const matches = baseFiltered.filter(job => {
      if (quickFilter === 'Saved') return savedIds.includes(job.id);
      if (quickFilter === 'Paid Only') return Boolean(job.isCustomEmployerPost) && formatPayRate(job.payMinUsd, job.payMaxUsd, job.payUnit) !== 'Salary not disclosed';
      if (quickFilter === 'Coding' || quickFilter === 'AI Training') return job.category === quickFilter;
      if (quickFilter === 'Remote') return job.category === 'Remote' || /remote|worldwide/i.test(`${job.location} ${job.workType}`);
      return true;
    });
    if (sort === 'company') return [...matches].sort((a,b) => a.company.localeCompare(b.company));
    if (sort === 'pay') return [...matches].sort((a,b) => b.payMaxUsd - a.payMaxUsd);
    if (sort === 'newest') return [...matches].sort((a,b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return [...matches].sort((a,b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
  }, [baseFiltered, quickFilter, savedIds, sort]);

  const quickFilterCounts = useMemo(() => ({
    All: baseFiltered.length,
    'Paid Only': baseFiltered.filter(job => Boolean(job.isCustomEmployerPost) && formatPayRate(job.payMinUsd, job.payMaxUsd, job.payUnit) !== 'Salary not disclosed').length,
    Saved: baseFiltered.filter(job => savedIds.includes(job.id)).length,
    Coding: baseFiltered.filter(job => job.category === 'Coding').length,
    'AI Training': baseFiltered.filter(job => job.category === 'AI Training').length,
    Remote: baseFiltered.filter(job => job.category === 'Remote' || /remote|worldwide/i.test(`${job.location} ${job.workType}`)).length,
  }), [baseFiltered, savedIds]);

  const spotlight = visibleJobs.find(job => job.featured && !job.isCustomEmployerPost) || visibleJobs.find(job => job.featured && job.verified) || visibleJobs.find(job => !job.isCustomEmployerPost && job.company.trim().toLowerCase() === 'mercor') || visibleJobs.find(job => !job.isCustomEmployerPost) || visibleJobs[0] || null;
  const marqueeCompanies = useMemo(() => {
    const names = ['Mercor', 'micro1', 'Outlier', 'Scale AI', 'Alignerr', 'Appen'];
    return names.map(company => ({
      company,
      job: visibleJobs.find(item => item.company.trim().toLowerCase() === company.toLowerCase() ||
        (company === 'Appen' && /appen|crowdgen/i.test(item.company))),
    }));
  }, [visibleJobs]);

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
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070b14]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1320px] items-center justify-between gap-3 px-4">
          <a href="#top" className="flex min-w-0 items-center gap-2.5" aria-label="PLANETAI marketplace home">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/[0.08] shadow-[0_0_24px_rgba(34,211,238,.18)]"><span className="absolute inset-0 rounded-xl bg-cyan-300/10 blur-md"/><PlanetAILogo className="relative h-8 w-8"/></span>
            <span className="whitespace-nowrap text-[16px] font-extrabold tracking-[-.055em] text-white">PLANET<span className="text-cyan-300">AI</span></span>
          </a>
          <button type="button" onClick={onPostJob} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#4F46E5] px-4 py-2 text-[11px] font-bold text-white shadow-[0_8px_24px_rgba(79,70,229,.25)] transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Post a job <ArrowUpRight size={13}/></button>
        </div>
      </header>

      <section role="region" aria-label="Featured companies" className="h-10 overflow-hidden border-y border-white/[0.08] bg-[#070b14]">
        <p className="sr-only">Companies represented on PLANETAI: Mercor, micro1, Outlier, Scale AI, Alignerr and Appen.</p>
        <div className="marquee-container h-10 overflow-hidden">
          <div className="marquee-track flex h-10 items-center gap-6">
            <div className="flex shrink-0 items-center gap-6 pr-6">{marqueeCompanies.map(item => <MarqueeCompanyLogo key={'a-' + item.company} company={item.company} job={item.job}/>)}</div>
            <div className="flex shrink-0 items-center gap-6 pr-6" aria-hidden="true">{marqueeCompanies.map(item => <MarqueeCompanyLogo key={'b-' + item.company} company={item.company} job={item.job}/>)}</div>
          </div>
        </div>
      </section>
      <main id="top">
        <section className="relative overflow-hidden bg-[#e9eee8]">
          <div className="pointer-events-none absolute -right-28 -top-40 h-[560px] w-[560px] rounded-full border border-[#d3ddd3] opacity-70"/>
          <div className="pointer-events-none absolute -right-8 top-10 h-[390px] w-[390px] rounded-full border border-[#d3ddd3] opacity-70"/>
          <div className="mx-auto grid max-w-[1320px] items-center gap-5 px-4 pb-[18px] pt-[18px] min-[769px]:gap-12 min-[769px]:px-8 min-[769px]:pb-24 min-[769px]:pt-24 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
            <div className="relative z-10 max-w-[720px]">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.17em] text-cyan-200 sm:mb-7 sm:py-2 sm:text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-[#4e9476]"/> PLANETAI · GLOBAL CAREERS</div>
              <h1 className="max-w-[700px] text-[clamp(2.05rem,8vw,5.9rem)] max-[768px]:text-[clamp(2.05rem,6vw,3rem)] font-semibold leading-[1.02] tracking-[-.075em] text-white">Find work that moves <span className="font-serif font-normal italic text-cyan-300">you forward.</span></h1>
              <p className="mt-3 max-w-[520px] text-[12px] leading-5 text-slate-400 sm:mt-7 sm:text-[17px] sm:leading-7">Discover opportunities from companies around the world. Clear details, transparent expectations and a direct path to apply.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-9 sm:gap-4">
                <a href="#opportunity-filters" onClick={(event) => { event.preventDefault(); document.getElementById("opportunity-filters")?.scrollIntoView({behavior:"smooth", block:"start"}); }} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-5 py-3 text-[11px] font-extrabold text-white shadow-lg shadow-cyan-950/30 transition hover:-translate-y-0.5 sm:min-h-12 sm:px-6 sm:text-[13px]">Explore Live Roles ↓</a>
                <span className="text-[10px] font-semibold text-slate-400 sm:text-[11px]"><ShieldCheck className="mr-1 inline text-cyan-300" size={15}/> Browse without signup</span>
              </div>
              <div className="mt-4 hidden flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5 text-[11px] font-semibold text-slate-400 min-[769px]:mt-12 min-[769px]:flex min-[769px]:pt-6"><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Direct employer applications</span><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Clear job information</span><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Browse freely</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[480px]">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-emerald-500/10 blur-2xl"/>
              <div className="relative rounded-2xl border border-emerald-400/35 bg-[linear-gradient(160deg,rgba(26,34,58,.88)_0%,rgba(13,18,34,.98)_100%)] p-[18px] shadow-[0_24px_70px_rgba(0,0,0,.3)] min-[769px]:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-emerald-300">Opportunity Spotlight</p><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold text-emerald-200">{spotlight?.verified ? "Verified • No Signup" : "Open access • No Signup"}</span></div>
                {spotlight ? <button onClick={() => onOpenJob(spotlight)} className="mt-3 block w-full rounded-xl bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]">
                  <div className="flex items-center gap-3"><CompanyLogo company={spotlight.company} short={spotlight.companyShort} explicitLogoUrl={spotlight.companyLogoUrl} websiteOrApplyUrl={spotlight.companyWebsite || spotlight.applyUrl} size="lg" lazy={false}/><div className="min-w-0 flex-1"><p className="text-[15px] font-extrabold leading-tight text-white min-[769px]:text-xl">{spotlight.title}</p><p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{spotlight.company} • {spotlight.location} • {spotlight.workType}</p></div></div>
                  <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold text-slate-300">{spotlight.category}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold text-slate-300">{spotlight.workType}</span></div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3"><span className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${!spotlight.isCustomEmployerPost || formatPayRate(spotlight.payMinUsd, spotlight.payMaxUsd, spotlight.payUnit) === "Salary not disclosed" ? "border-slate-700 bg-slate-800/60 text-slate-400" : "border-emerald-400/35 bg-emerald-400/15 text-emerald-300"}`}>{spotlight.isCustomEmployerPost ? formatPayRate(spotlight.payMinUsd, spotlight.payMaxUsd, spotlight.payUnit) : "Pay not listed — check employer"}</span><span className="text-[9px] font-bold text-cyan-300">VIEW ROLE ↗</span></div>
                </button> : <div className="mt-6 rounded-2xl bg-[#f4f6f2] p-8 text-center text-sm text-[#77847b]">New opportunities are on the way.</div>}
                <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg border border-white/10 bg-white/[0.025] p-2.5"><p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Opportunities</p><p className="mt-1 text-[10px] font-bold text-slate-200">{visibleJobs.length} to explore</p></div><div className="rounded-lg border border-white/10 bg-white/[0.025] p-2.5"><p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Access</p><p className="mt-1 text-[10px] font-bold text-slate-200">No candidate signup</p></div></div>
              </div>
              
            </div>
          </div>
        </section>

        <section id="opportunities" className="mx-auto max-w-[1320px] px-4 py-8 sm:px-8 min-[769px]:py-24">
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
          <div id="opportunity-filters" className="mt-5 scroll-mt-24 rounded-2xl border border-white/10 bg-[#0b1220]/90 p-3 shadow-[0_12px_40px_rgba(0,0,0,.24)] backdrop-blur-xl min-[769px]:sticky min-[769px]:top-[76px] min-[769px]:z-30 min-[769px]:mt-9 min-[769px]:flex min-[769px]:items-center min-[769px]:gap-3 min-[769px]:p-4">
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-2"><Search size={18} className="shrink-0 text-[#839087]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job title, skill or company" aria-label="Search opportunities" className="w-full min-w-0 bg-transparent text-sm text-[#25372e] outline-none placeholder:text-[#a2aca5]"/></div>
            <div className="flex items-center gap-2 border-t border-[#edf0ec] pt-3 sm:border-0 sm:pt-0">
              <label htmlFor="opportunity-sort" className="shrink-0 text-[10px] font-bold text-[#718077] sm:hidden">Sort by</label>
              <select id="opportunity-sort" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort opportunities" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#dce5dc] bg-[#f7f9f6] px-3 text-xs font-bold text-[#344a3d] outline-none transition focus:border-[#71917b] focus:ring-2 focus:ring-[#71917b]/20 sm:flex-none sm:min-w-[156px]"><option value="recommended">Recommended</option><option value="newest">Featured first</option><option value="pay">Highest pay</option><option value="company">Company A–Z</option></select>
              <button className="min-h-11 shrink-0 rounded-xl bg-[#183c32] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#285c4b] sm:px-5" onClick={() => document.getElementById('role-list')?.scrollIntoView({behavior:'smooth'})}>Search</button>
            </div>
          </div>
          <div className="no-scrollbar sticky top-[68px] z-30 -mx-4 mt-3 flex gap-2 overflow-x-auto border-y border-white/10 bg-[#070b14]/90 px-4 py-3 backdrop-blur-xl min-[769px]:top-[136px] min-[769px]:mx-0 min-[769px]:mt-6 min-[769px]:border-0 min-[769px]:bg-[#070b14]/90 min-[769px]:px-0 min-[769px]:py-2">{(['All','Paid Only','Saved','Coding','AI Training','Remote'] as const).map(item => <button key={item} onClick={() => setQuickFilter(item)} aria-pressed={quickFilter === item} className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[10px] font-bold transition ${quickFilter === item ? 'border-white bg-white text-[#070b14]' : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/25 hover:text-white'}`}>{item} <span className="ml-1 tabular-nums opacity-70">({quickFilterCounts[item]})</span></button>)}</div>
           <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4">{JOB_CATEGORIES.filter(item => !['All', 'Coding', 'AI Training', 'Remote'].includes(item)).map(item => <button key={item} onClick={() => setCategory(category === item ? 'All' : item)} aria-pressed={category === item} className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] font-semibold transition ${category === item ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/[0.025] text-slate-500 hover:text-slate-300'}`}>{categoryLabel(item)}</button>)}</div>
          <div className="mt-4 flex items-center justify-between"><p className="text-xs font-bold text-slate-200">{filtered.length} opportunities</p><p className="text-[10px] text-slate-500">Browse freely · No signup</p></div>
          <div id="role-list" className="mt-4 grid grid-cols-1 gap-[14px] min-[769px]:grid-cols-2 xl:grid-cols-3">
             {filtered.map((job, index) => <React.Fragment key={job.id}><CompanyRevealCard job={job} isSaved={savedIds.includes(job.id)} onToggleSave={onToggleSave} onOpenJob={onOpenJob}/>{(index + 1) % 9 === 0 && <div className="min-[769px]:col-span-2 xl:col-span-3"><AdBanner placement="inline-feed"/></div>}</React.Fragment>)}
           </div>
           {filtered.length === 0 && <div className="mt-5 rounded-2xl border border-white/10 bg-[#111b30]/80 p-10 text-center shadow-xl"><Search className="mx-auto text-slate-500"/><p className="mt-3 font-bold text-white">No matching opportunities</p><p className="mt-1 text-xs text-slate-400">Try a different search or category.</p><button type="button" onClick={() => { setQuickFilter('All'); setCategory('All'); setQuery(''); }} className="mt-5 rounded-full bg-white px-5 py-2.5 text-xs font-extrabold text-[#070b14] transition hover:bg-cyan-100">Reset Filters</button></div>}
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
        <section aria-label="Sponsored information" className="border-b border-white/10 bg-[#070b14] py-7"><div className="mx-auto max-w-[1320px] px-5 sm:px-8"><AdBanner placement="bottom-suite" /></div></section>

        <section id="employers" className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24"><div className="overflow-hidden rounded-[28px] bg-[#183c32] p-7 text-white sm:p-12 lg:p-16"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a7c7b2]">For employers</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-.055em] sm:text-5xl">Meet the people who can move your business forward.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#c4d6ca]">Create an employer workspace, submit a role for review, and publish after approval. Free listings are welcome.</p><div className="mt-7 flex flex-wrap gap-3 text-[11px] font-semibold text-[#d6e6db]"><span><Check className="mr-1 inline" size={14}/> Employer workspace</span><span><Check className="mr-1 inline" size={14}/> Human review</span><span><Check className="mr-1 inline" size={14}/> Clear listing packages</span></div></div><div className="flex flex-col items-start gap-3"><button onClick={onPostJob} className="inline-flex items-center gap-3 rounded-full bg-[#f1f5ec] px-6 py-4 text-[12px] font-extrabold text-[#183c32] transition hover:bg-white">Post a role <ArrowUpRight size={16}/></button><a href="/?experience=employer-auth&mode=signin" className="text-[11px] font-semibold text-[#d6e6db] underline underline-offset-4 hover:text-white">Already have an employer workspace? Sign in</a></div></div></div></section>
      </main>
      <footer className="border-t border-[#e2e8e1] bg-[#f0f3ee]"><div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-5 py-8 text-[10px] font-medium text-[#819087] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-bold tracking-wide text-[#40564a]">PLANETAI <span className="font-normal text-[#8b978e]">· Global careers</span></span><div className="flex flex-wrap gap-4"><button onClick={() => onOpenWorkspace('saved')} className="font-semibold hover:text-[#183c32]">Saved roles</button><button onClick={() => onOpenWorkspace('ai-tools')} className="font-semibold hover:text-[#183c32]">AI career tools</button><button onClick={() => onOpenWorkspace('platforms')} className="font-semibold hover:text-[#183c32]">Platforms</button><button onClick={onOpenPrivacyPolicy} className="font-semibold hover:text-[#183c32]">Privacy Policy</button></div><span>Browse freely · Apply directly</span></div></footer>
      {jobDetailModal}
      {postJobModal}
      {privacyPolicyModal}
    </div>
  );
}
