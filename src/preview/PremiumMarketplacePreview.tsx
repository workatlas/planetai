import React, {useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import {
  ArrowRight, ArrowUpRight, Bookmark, Check, MapPin, Menu,
  Search, ShieldCheck, X,
} from 'lucide-react';
import {formatPayRate, JOB_CATEGORIES} from '../data/jobs';
import type {JobCategory, JobListing} from '../data/jobs';
import {CompanyLogo} from '../components/JobCard';
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

const categoryTones: Record<string, {card: string; badge: string}> = {
  'AI Training': {card: 'border-l-[#6f9fe0] bg-[#f5f8ff]', badge: 'bg-[#e8f0ff] text-[#3567a8]'},
  'Coding': {card: 'border-l-[#dfb84f] bg-[#fffaf0]', badge: 'bg-[#fff1c9] text-[#8a6413]'},
  'Audio/Voice': {card: 'border-l-[#a88bd4] bg-[#faf7ff]', badge: 'bg-[#f0e9fb] text-[#7352a5]'},
  'Data Annotation': {card: 'border-l-[#76a987] bg-[#f4faf5]', badge: 'bg-[#e6f3e8] text-[#42734f]'},
  'Remote': {card: 'border-l-[#9aa99d] bg-[#f8faf7]', badge: 'bg-[#edf1ed] text-[#617066]'},
};

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
  const [mobileMenu, setMobileMenu] = useState(false);

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
      <div className="bg-[#142c26] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-[#d6e7df] sm:text-xs">
        A clearer way to find meaningful work <span className="mx-2 text-[#88a99a]">·</span> Curated opportunities and employer-published roles
      </div>
      <header className="sticky top-0 z-40 border-b border-[#e5e9e5] bg-[#fbfcfa]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="PLANETAI marketplace home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#183c32] text-white"><PlanetAILogo className="h-9 w-9"/></span>
            <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-[-0.06em]">PLANET<span className="text-[#39836a]">AI</span></span><span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-[#829089]">Global careers, with clarity</span></span>
          </a>
          <nav className="hidden items-center gap-7 text-[13px] font-semibold text-[#52615a] lg:flex">
            <a className="text-[#183c32]" href="#opportunities">Find opportunities</a>
            <a className="transition hover:text-[#183c32]" href="#how-it-works">How it works</a>
            <a className="transition hover:text-[#183c32]" href="#employers">For employers</a>
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <button onClick={() => onOpenWorkspace('ai-tools')} className="px-3 py-2 text-[12px] font-bold text-[#40534a] hover:text-[#183c32]">Career tools</button>
            <PWAInstallButton compact /><a href="/?experience=employer-auth&mode=signin" className="rounded-full border border-[#dce5dc] bg-white px-4 py-3 text-[12px] font-bold text-[#40534a] transition hover:border-[#a9bcae]">Employer sign in</a><button onClick={onPostJob} className="rounded-full bg-[#183c32] px-5 py-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#285c4b]">Post a job <ArrowUpRight className="ml-1 inline" size={14}/></button>
          </div>
          <button onClick={() => setMobileMenu(v => !v)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e0e6e0] lg:hidden" aria-label="Toggle navigation">{mobileMenu ? <X size={19}/> : <Menu size={19}/>}</button>
        </div>
        {mobileMenu && <div className="border-t border-[#e5e9e5] bg-white px-6 py-4 lg:hidden"><div className="flex flex-col gap-4 text-sm font-semibold"><a href="#opportunities" onClick={() => setMobileMenu(false)}>Find opportunities</a><a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a><button className="text-left" onClick={() => {setMobileMenu(false); onOpenWorkspace('ai-tools');}}>Career tools</button><a href="/?experience=employer-auth&mode=signin" onClick={() => setMobileMenu(false)}>Employer sign in</a><button className="text-left" onClick={() => {setMobileMenu(false); onPostJob();}}>Post a job</button><PWAInstallButton /></div></div>}
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
                  <div className="mt-5 flex items-center justify-between border-t border-[#e1e7df] pt-4"><span className="text-sm font-extrabold text-[#315b47]">{formatPayRate(spotlight.payMinUsd, spotlight.payMaxUsd, spotlight.payUnit)}</span><span className="text-[10px] font-bold text-[#537a64]">VIEW ROLE ↗</span></div>
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
            {filtered.map(job => <article key={job.id} className={`group rounded-2xl border border-[#e2e8e1] border-l-[4px] ${categoryTones[job.category]?.card || "bg-white border-l-[#9aa99d]"} p-5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(28,55,42,.07)] sm:p-6`}>
              <div className="flex items-start justify-between gap-3"><CompanyLogo company={job.company} short={job.companyShort} explicitLogoUrl={job.companyLogoUrl} websiteOrApplyUrl={job.companyWebsite || job.applyUrl} size="lg" lazy={false}/><div className="flex items-center gap-2">{job.featured && <span className="rounded-full bg-[#f2f5ed] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#5c7b60]">Featured</span>}<button onClick={() => onToggleSave(job.id)} aria-label={savedIds.includes(job.id) ? 'Remove saved role' : 'Save role'} className={`grid h-9 w-9 place-items-center rounded-full border ${savedIds.includes(job.id) ? 'border-[#8eae98] bg-[#eef5ee] text-[#47745c]' : 'border-[#e7ece6] text-[#8a978e] hover:text-[#47745c]'}`}><Bookmark size={16} fill={savedIds.includes(job.id) ? 'currentColor' : 'none'}/></button></div></div>
              <div className="mt-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${categoryTones[job.category]?.badge || "bg-[#edf1ed] text-[#617066]"}`}>{job.category}</span></div><p className="mt-3 text-[11px] font-bold text-[#77867c]">{job.company}</p><h3 className="mt-1 text-[17px] font-bold tracking-[-.035em] text-[#1d3028]">{job.title}</h3><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-[#78867d]"><span className="inline-flex items-center gap-1"><MapPin size={12}/>{job.location}</span><span>·</span><span>{job.workType}</span></div><p className="mt-4 min-h-[42px] text-xs leading-5 text-[#7b887f]">{job.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{job.tags.slice(0,5).map(tag => <span key={tag} className="rounded-md bg-[#f4f6f2] px-2.5 py-1.5 text-[9px] font-semibold text-[#718077]">{tag}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-[#edf0ec] pt-4"><div><p className="text-sm font-extrabold text-[#315b47]">{formatPayRate(job.payMinUsd, job.payMaxUsd, job.payUnit)}</p><p className="mt-1 text-[9px] font-semibold text-[#9aa49d]">{job.isCustomEmployerPost ? 'Employer published' : 'Curated role'} · {job.postedAgo}</p></div><button onClick={() => onOpenJob(job)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#315b47] transition group-hover:gap-2.5">View details <ArrowUpRight size={14}/></button></div>
            </article>)}
          </div>
          {filtered.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[#d7e0d7] bg-white p-12 text-center"><Search className="mx-auto text-[#8b9a8f]"/><p className="mt-3 font-bold text-[#344a3d]">No matching opportunities</p><p className="mt-1 text-xs text-[#87938b]">Try a different search or category.</p></div>}
        </section>

        <section id="how-it-works" className="border-y border-[#e3e9e2] bg-white">
          <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20"><div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#59816b]">Simple by design</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#1b3027] sm:text-4xl">Less friction. More possibility.</h2></div><div className="mt-10 grid gap-8 md:grid-cols-3">{[{n:'01',title:'Explore freely',body:'Browse roles and company information without creating a candidate account.'},{n:'02',title:'Know what to expect',body:'Review responsibilities, compensation, location, eligibility and requirements.'},{n:'03',title:'Apply directly',body:'Continue to the employer’s official application destination when you are ready.'}].map(item => <div key={item.n} className="border-t border-[#dce5dc] pt-5"><p className="text-xs font-bold text-[#71917b]">{item.n}</p><h3 className="mt-5 text-lg font-bold tracking-tight text-[#263b30]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#7a887f]">{item.body}</p></div>)}</div></div>
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
