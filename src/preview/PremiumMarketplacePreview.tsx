import React, {useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {
  ArrowRight, ArrowUpRight, Bookmark, Check, Menu,
  Search, ShieldCheck, X,
} from 'lucide-react';
import {formatPayRate, JOB_CATEGORIES} from '../data/jobs';
import type {JobCategory, JobListing} from '../data/jobs';
import {CompanyLogo} from '../components/JobCard';
import {CompanyRevealCard} from '../components/CompanyRevealCard';
import {PlanetAILogo} from '../components/PlanetAILogo';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {AdBanner} from '../components/AdBanner';

interface PremiumMarketplacePreviewProps {
  jobs: JobListing[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
  onOpenJob: (job: JobListing) => void;
  onPostJob: () => void;
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

export default function PremiumMarketplacePreview({
  jobs,
  savedIds,
  onToggleSave,
  onOpenJob,
  onPostJob,
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

  if (showCareerTools) {
    return (
      <div className="planetai-nexora min-h-screen bg-[#f7f8f6] text-[#172b24]">
        <header className="sticky top-0 z-40 border-b border-[#e5e9e5] bg-[#fbfcfa]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
            <a href="/" onClick={(event) => { event.preventDefault(); onReturnToMarketplace(); }} className="flex items-center gap-3" aria-label="PLANETAI marketplace home">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#183c32] text-white"><PlanetAILogo className="h-9 w-9"/></span>
              <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-[-0.06em]">PLANET<span className="text-[#39836a]">AI</span></span><span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-[#829089]">Career workspace</span></span>
            </a>
            <div className="flex items-center gap-2"><PWAInstallButton compact /><button onClick={onReturnToMarketplace} className="rounded-full border border-[#dce5dc] bg-white px-4 py-2.5 text-[11px] font-bold text-[#40534a] transition hover:border-[#a9bcae]">Back to marketplace <ArrowRight className="ml-1 inline" size={13}/></button></div>
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
        <footer className="border-t border-[#e2e8e1] bg-[#f0f3ee]"><div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-6 text-[10px] font-medium text-[#819087] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-bold tracking-wide text-[#40564a]">PLANETAI · Global careers</span><div className="flex flex-wrap items-center gap-4"><button onClick={onOpenPrivacyPolicy} className="font-semibold text-[#52685a] underline-offset-4 hover:underline">Privacy Policy</button><PWAInstallButton compact /></div><span>Free tools · Browse freely</span></div></footer>
        {privacyPolicyModal}
      </div>
    );
  }

  return (
    <div className="planetai-nexora min-h-screen bg-[#f7f8f6] text-[#17231f]">
      <div
        role="region"
        aria-label="Employer listing options"
        className="overflow-hidden border-b border-[#29493c] bg-[#142c26] text-[#d6e7df]"
      >
        <p className="sr-only">For employers: free standard listings and optional Featured Boost placement for additional listing visibility. All listings are reviewed before publication. Paid upgrades do not bypass moderation.</p>
        <div className="marquee-container mx-auto max-w-[1320px] overflow-hidden px-4 sm:px-8">
          <div className="marquee-track min-h-10 items-center text-[10px] font-semibold tracking-[.08em] sm:text-[11px]">
            <div className="flex items-center">
              <span className="px-5 text-[#a9c9b4]">FOR EMPLOYERS</span>
              <span aria-hidden="true" className="text-[#6d9680]">✦</span>
              <span className="px-5">FREE STANDARD LISTINGS</span>
              <span aria-hidden="true" className="text-[#6d9680]">✦</span>
              <span className="px-5 text-white">FEATURED BOOST · EXTRA VISIBILITY</span>
              <span aria-hidden="true" className="text-[#6d9680]">✦</span>
              <span className="px-5">EXTRA LISTING VISIBILITY</span>
              <span aria-hidden="true" className="text-[#6d9680]">✦</span>
              <span className="px-5 text-[#a9c9b4]">EVERY LISTING REVIEWED BEFORE PUBLICATION</span>
              <span aria-hidden="true" className="px-5 text-[#6d9680]">✦</span>
            </div>
            <div className="flex items-center" aria-hidden="true">
              <span className="px-5 text-[#a9c9b4]">FOR EMPLOYERS</span>
              <span className="text-[#6d9680]">✦</span>
              <span className="px-5">FREE STANDARD LISTINGS</span>
              <span className="text-[#6d9680]">✦</span>
              <span className="px-5 text-white">FEATURED BOOST · EXTRA VISIBILITY</span>
              <span className="text-[#6d9680]">✦</span>
              <span className="px-5">EXTRA LISTING VISIBILITY</span>
              <span className="text-[#6d9680]">✦</span>
              <span className="px-5 text-[#a9c9b4]">EVERY LISTING REVIEWED BEFORE PUBLICATION</span>
              <span className="px-5 text-[#6d9680]">✦</span>
            </div>
          </div>
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-[#e5e9e5] bg-[#fbfcfa]/95 backdrop-blur-xl">
        <div className="relative mx-auto max-w-[1320px] px-5 sm:px-8">
          <div className="flex h-[76px] items-center justify-between gap-4">
            <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="PLANETAI marketplace home">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#183c32] text-white"><PlanetAILogo className="h-9 w-9"/></span>
              <span className="min-w-0 leading-tight"><span className="block text-[17px] font-extrabold tracking-[-0.06em]">PLANET<span className="text-[#39836a]">AI</span></span><span className="block truncate text-[9px] font-semibold uppercase tracking-[.2em] text-[#829089]">Global careers, with clarity</span></span>
            </a>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={onPostJob} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#183c32] px-4 py-3 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#285c4b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b] sm:px-5 sm:text-xs">Post a job <ArrowUpRight className="inline" size={14}/></button>
              <button
                type="button"
                onClick={() => setMenuOpen(value => !value)}
                aria-label={menuOpen ? "Close main menu" : "Open main menu"}
                aria-expanded={menuOpen}
                aria-controls="planetai-main-menu"
                className="grid h-11 w-11 place-items-center rounded-full border border-[#dce5dc] bg-white text-[#40534a] transition hover:border-[#a9bcae] hover:bg-[#f4f6f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71917b]"
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
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#718077]"><ShieldCheck size={16} className="text-[#58816b]"/> Employer listings are reviewed before publication</div>
          </div>
          <div className="mt-9 rounded-2xl border border-[#e2e8e1] bg-white p-3 shadow-[0_12px_40px_rgba(28,55,42,.04)] sm:flex sm:items-center sm:gap-3 sm:p-4">
            <div className="flex min-h-12 flex-1 items-center gap-3 px-2"><Search size={18} className="shrink-0 text-[#839087]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job title, skill or company" aria-label="Search opportunities" className="w-full bg-transparent text-sm text-[#25372e] outline-none placeholder:text-[#a2aca5]"/></div>
            <div className="flex items-center gap-2 border-t border-[#edf0ec] pt-3 sm:border-0 sm:pt-0"><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort opportunities" className="min-h-10 flex-1 bg-transparent text-xs font-semibold text-[#56675d] outline-none"><option value="recommended">Recommended</option><option value="newest">Featured first</option><option value="pay">Highest pay</option><option value="company">Company A–Z</option></select><button className="rounded-xl bg-[#183c32] px-5 py-3 text-xs font-bold text-white" onClick={() => document.getElementById('role-list')?.scrollIntoView({behavior:'smooth'})}>Search</button></div>
          </div>
          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">{JOB_CATEGORIES.map(item => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-bold transition ${category === item ? 'bg-[#183c32] text-white' : 'border border-[#e0e7df] bg-white text-[#68766d] hover:border-[#a9bcae]'}`}>{categoryLabel(item)}</button>)}</div>
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
      <div className="fixed bottom-3 right-3 z-40 rounded-lg border border-[#dce4dc] bg-white/95 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#6b7d70] shadow-lg">PLANETAI Marketplace</div>
    </div>
  );
}
