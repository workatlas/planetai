import React, {useMemo, useState} from 'react';
import {
  ArrowRight, ArrowUpRight, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, Globe2, MapPin, Menu, Search, ShieldCheck, Sparkles,
  X, Building2, Clock3, SlidersHorizontal,
} from 'lucide-react';

type DemoJob = {
  id: number; role: string; company: string; initials: string; category: string;
  location: string; type: string; salary: string; tags: string[];
  featured?: boolean; tone: string; summary: string;
};

const demoJobs: DemoJob[] = [
  {id:1,role:'Senior Product Designer',company:'Northstar Studio',initials:'N',category:'Design',location:'Worldwide · Remote',type:'Full-time',salary:'$95k–$125k',tags:['Figma','Design Systems','SaaS'],featured:true,tone:'bg-violet-100 text-violet-700',summary:'Lead product experiences across a growing suite of global digital products.'},
  {id:2,role:'AI Research Engineer',company:'Meridian Labs',initials:'M',category:'Engineering',location:'US / Europe · Remote',type:'Full-time',salary:'$120k–$165k',tags:['Python','LLMs','Research'],tone:'bg-cyan-100 text-cyan-800',summary:'Build and evaluate reliable AI systems with a multidisciplinary research team.'},
  {id:3,role:'Growth Marketing Lead',company:'Form & Function',initials:'F',category:'Marketing',location:'Asia Pacific · Remote',type:'Full-time',salary:'$70k–$95k',tags:['Growth','Lifecycle','Analytics'],tone:'bg-amber-100 text-amber-800',summary:'Own acquisition strategy and turn customer insight into sustainable growth.'},
  {id:4,role:'Customer Success Manager',company:'Cloudwell',initials:'C',category:'Operations',location:'Worldwide · Remote',type:'Full-time',salary:'$55k–$75k',tags:['SaaS','Onboarding','CRM'],tone:'bg-emerald-100 text-emerald-800',summary:'Help international customers achieve measurable value from modern software.'},
  {id:5,role:'Frontend Developer',company:'Brightpath',initials:'B',category:'Engineering',location:'Worldwide · Remote',type:'Contract',salary:'$45–$65 / hr',tags:['React','TypeScript','UI'],tone:'bg-rose-100 text-rose-800',summary:'Create accessible, fast and polished interfaces for a distributed product team.'},
  {id:6,role:'People Operations Partner',company:'Common Ground',initials:'C',category:'People',location:'Europe · Remote',type:'Full-time',salary:'€60k–€78k',tags:['People Ops','Culture','HR'],tone:'bg-sky-100 text-sky-800',summary:'Build thoughtful people programmes for a remote-first international company.'},
];

const categories = ['All roles','Engineering','Design','Marketing','Operations','People'];

export default function PremiumMarketplacePreview() {
  const [query,setQuery] = useState('');
  const [category,setCategory] = useState('All roles');
  const [saved,setSaved] = useState<number[]>([]);
  const [selected,setSelected] = useState<DemoJob|null>(null);
  const [employerOpen,setEmployerOpen] = useState(false);
  const [mobileMenu,setMobileMenu] = useState(false);
  const [sort,setSort] = useState('Recommended');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = demoJobs.filter(job =>
      (category === 'All roles' || job.category === category) &&
      (!q || [job.role,job.company,job.category,job.location,...job.tags].join(' ').toLowerCase().includes(q))
    );
    if (sort === 'Company A–Z') return [...matches].sort((a,b)=>a.company.localeCompare(b.company));
    return matches;
  },[query,category,sort]);

  const toggleSaved = (id:number) => setSaved(current => current.includes(id) ? current.filter(x=>x!==id) : [...current,id]);

  return (
    <div className="min-h-screen bg-[#f7f8f6] text-[#17231f]">
      <div className="bg-[#142c26] px-4 py-2 text-center text-[11px] font-medium tracking-wide text-[#d6e7df] sm:text-xs">
        A clearer way to find meaningful work <span className="mx-2 text-[#88a99a]">·</span> Opportunities without the noise
      </div>
      <header className="sticky top-0 z-40 border-b border-[#e5e9e5] bg-[#fbfcfa]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Work marketplace home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#183c32] text-white"><Globe2 size={21}/></span>
            <span className="leading-tight"><span className="block text-[17px] font-extrabold tracking-[-0.06em]">WORK<span className="text-[#39836a]"> / WORLD</span></span><span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-[#829089]">Global opportunity network</span></span>
          </a>
          <nav className="hidden items-center gap-9 text-[13px] font-semibold text-[#52615a] lg:flex">
            <a className="text-[#183c32]" href="#opportunities">Find opportunities</a>
            <a className="transition hover:text-[#183c32]" href="#how-it-works">How it works</a>
            <a className="transition hover:text-[#183c32]" href="#employers">For employers</a>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <a href="#opportunities" className="px-3 py-2 text-[13px] font-bold text-[#40534a] hover:text-[#183c32]">Explore roles</a>
            <button onClick={()=>setEmployerOpen(true)} className="rounded-full bg-[#183c32] px-5 py-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#285c4b]">Post a job <ArrowUpRight className="ml-1 inline" size={14}/></button>
          </div>
          <button onClick={()=>setMobileMenu(v=>!v)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e0e6e0] lg:hidden" aria-label="Toggle navigation">{mobileMenu?<X size={19}/>:<Menu size={19}/>}</button>
        </div>
        {mobileMenu && <div className="border-t border-[#e5e9e5] bg-white px-6 py-4 lg:hidden"><div className="flex flex-col gap-4 text-sm font-semibold"><a href="#opportunities" onClick={()=>setMobileMenu(false)}>Find opportunities</a><a href="#how-it-works" onClick={()=>setMobileMenu(false)}>How it works</a><button className="text-left" onClick={()=>{setEmployerOpen(true);setMobileMenu(false)}}>Post a job</button></div></div>}
      </header>

      <main id="top">
        <section className="relative overflow-hidden bg-[#e9eee8]">
          <div className="pointer-events-none absolute -right-28 -top-40 h-[560px] w-[560px] rounded-full border border-[#d3ddd3] opacity-70"/>
          <div className="pointer-events-none absolute -right-8 top-10 h-[390px] w-[390px] rounded-full border border-[#d3ddd3] opacity-70"/>
          <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:grid-cols-[1.12fr_.88fr] lg:gap-16">
            <div className="relative z-10 max-w-[720px]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d0dbd0] bg-white/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#426353]"><span className="h-1.5 w-1.5 rounded-full bg-[#4e9476]"/> A more human global job market</div>
              <h1 className="max-w-[700px] text-[clamp(3rem,6.3vw,5.9rem)] font-semibold leading-[.99] tracking-[-.075em] text-[#172b24]">Find work that moves <span className="font-serif font-normal italic text-[#54806b]">you forward.</span></h1>
              <p className="mt-7 max-w-[520px] text-[15px] leading-7 text-[#65736b] sm:text-[17px]">Discover thoughtful opportunities from companies around the world. Clear details, transparent expectations and a direct path to apply.</p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a href="#opportunities" className="inline-flex items-center gap-3 rounded-full bg-[#183c32] px-6 py-4 text-[13px] font-bold text-white shadow-lg shadow-[#183c32]/10 transition hover:-translate-y-0.5 hover:bg-[#285c4b]">Explore opportunities <ArrowRight size={16}/></a>
                <span className="text-[11px] font-semibold text-[#75837a]"><ShieldCheck className="mr-1 inline text-[#54806b]" size={15}/> No candidate account required</span>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#d4ddd4] pt-6 text-[11px] font-semibold text-[#69786f]"><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Direct employer applications</span><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Clear job information</span><span><Check className="mr-1.5 inline text-[#4e9476]" size={14}/> Browse freely</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[480px]">
              <div className="absolute -inset-5 rounded-[2.5rem] bg-[#dbe5db] blur-2xl"/>
              <div className="relative rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_30px_80px_rgba(28,55,42,.12)] sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#819087]">Opportunity spotlight</p><p className="mt-1 text-lg font-bold tracking-tight text-[#1d3028]">A better next step.</p></div><span className="rounded-full bg-[#eef4ee] px-3 py-1.5 text-[10px] font-bold text-[#47745c]">Curated roles</span></div>
                <div className="mt-6 rounded-2xl bg-[#f4f6f2] p-4">
                  <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e6e0f5] text-sm font-extrabold text-[#7055a4]">N</div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#25372e]">Senior Product Designer</p><p className="mt-1 text-[11px] text-[#7b8980]">Northstar Studio · Remote</p></div><Bookmark size={17} className="text-[#819087]"/></div>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#66766c]">Full-time</span><span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#66766c]">Global remote</span></div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#e1e7df] pt-4"><span className="text-sm font-extrabold text-[#315b47]">$95k–$125k <span className="text-[10px] font-medium text-[#819087]">/ year</span></span><span className="text-[10px] font-bold text-[#537a64]">VIEW ROLE ↗</span></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#e8ece7] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8b978f]">Built around</p><p className="mt-1 text-xs font-bold text-[#33473b]">Real opportunities</p></div><div className="rounded-xl border border-[#e8ece7] p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8b978f]">Designed for</p><p className="mt-1 text-xs font-bold text-[#33473b]">Global talent</p></div></div>
                <p className="mt-4 text-center text-[9px] leading-4 text-[#9aa49d]">Illustrative preview card · Not a live vacancy</p>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:block"><p className="text-[9px] font-bold uppercase tracking-wider text-[#8a978e]">Your next chapter</p><p className="mt-1 text-xs font-bold text-[#315b47]">Starts with a possibility.</p></div>
            </div>
          </div>
        </section>

        <section id="opportunities" className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#59816b]">The opportunity board</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#1b3027] sm:text-4xl">Work worth exploring.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#77847b]">Search roles by skill, company or location. Every listing should make the important details easy to understand.</p></div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#718077]"><ShieldCheck size={16} className="text-[#58816b]"/> Built around employer accountability</div>
          </div>
          <div className="mt-9 rounded-2xl border border-[#e2e8e1] bg-white p-3 shadow-[0_12px_40px_rgba(28,55,42,.04)] sm:flex sm:items-center sm:gap-3 sm:p-4">
            <div className="flex min-h-12 flex-1 items-center gap-3 px-2"><Search size={18} className="shrink-0 text-[#839087]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Job title, skill or company" aria-label="Search sample opportunities" className="w-full bg-transparent text-sm text-[#25372e] outline-none placeholder:text-[#a2aca5]"/></div>
            <div className="flex items-center gap-2 border-t border-[#edf0ec] pt-3 sm:border-0 sm:pt-0"><SlidersHorizontal size={16} className="text-[#839087]"/><select value={sort} onChange={e=>setSort(e.target.value)} className="min-h-10 flex-1 bg-transparent text-xs font-semibold text-[#56675d] outline-none"><option>Recommended</option><option>Company A–Z</option></select><button className="rounded-xl bg-[#183c32] px-5 py-3 text-xs font-bold text-white" onClick={()=>document.getElementById('role-list')?.scrollIntoView({behavior:'smooth'})}>Search</button></div>
          </div>
          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">{categories.map(item=><button key={item} onClick={()=>setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-bold transition ${category===item?'bg-[#183c32] text-white':'border border-[#e0e7df] bg-white text-[#68766d] hover:border-[#a9bcae]'}`}>{item}</button>)}</div>
          <div className="mt-5 flex items-center justify-between"><p className="text-xs font-bold text-[#40534a]">{filtered.length} sample opportunities</p><p className="text-[10px] text-[#9aa49d]">Demonstration data only</p></div>
          <div id="role-list" className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(job=><article key={job.id} className="group rounded-2xl border border-[#e2e8e1] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-[#c1d2c4] hover:shadow-[0_18px_42px_rgba(28,55,42,.07)] sm:p-6">
              <div className="flex items-start justify-between gap-3"><div className={`grid h-11 w-11 place-items-center rounded-xl text-sm font-extrabold ${job.tone}`}>{job.initials}</div><div className="flex items-center gap-2">{job.featured&&<span className="rounded-full bg-[#f2f5ed] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#5c7b60]">Featured</span>}<button onClick={()=>toggleSaved(job.id)} aria-label={saved.includes(job.id)?'Remove saved role':'Save role'} className={`grid h-9 w-9 place-items-center rounded-full border ${saved.includes(job.id)?'border-[#8eae98] bg-[#eef5ee] text-[#47745c]':'border-[#e7ece6] text-[#8a978e] hover:text-[#47745c]'}`}><Bookmark size={16} fill={saved.includes(job.id)?'currentColor':'none'}/></button></div></div>
              <p className="mt-5 text-[11px] font-bold text-[#77867c]">{job.company}</p><h3 className="mt-1 text-[17px] font-bold tracking-[-.035em] text-[#1d3028]">{job.role}</h3><div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-[#78867d]"><span className="inline-flex items-center gap-1"><MapPin size={12}/>{job.location}</span><span>·</span><span>{job.type}</span></div><p className="mt-4 min-h-[42px] text-xs leading-5 text-[#7b887f]">{job.summary}</p><div className="mt-4 flex flex-wrap gap-1.5">{job.tags.map(tag=><span key={tag} className="rounded-md bg-[#f4f6f2] px-2.5 py-1.5 text-[9px] font-semibold text-[#718077]">{tag}</span>)}</div><div className="mt-5 flex items-center justify-between border-t border-[#edf0ec] pt-4"><span className="text-sm font-extrabold text-[#315b47]">{job.salary}</span><button onClick={()=>setSelected(job)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#315b47] transition group-hover:gap-2.5">View details <ArrowUpRight size={14}/></button></div>
            </article>)}
          </div>
          {filtered.length===0&&<div className="mt-5 rounded-2xl border border-dashed border-[#d7e0d7] bg-white p-12 text-center"><Search className="mx-auto text-[#8b9a8f]"/><p className="mt-3 font-bold text-[#344a3d]">No matching sample roles</p><p className="mt-1 text-xs text-[#87938b]">Try a different search or category.</p></div>}
          <p className="mt-5 text-center text-[10px] leading-5 text-[#9aa49d]">All roles, companies and compensation shown in this design preview are fictional examples. They are not advertised vacancies.</p>
        </section>

        <section id="how-it-works" className="border-y border-[#e3e9e2] bg-white">
          <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-20"><div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#59816b]">Simple by design</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.055em] text-[#1b3027] sm:text-4xl">Less friction. More possibility.</h2></div><div className="mt-10 grid gap-8 md:grid-cols-3">{[{n:'01',title:'Explore freely',body:'Browse roles and company information without creating a candidate account.'},{n:'02',title:'Know what to expect',body:'Review responsibilities, compensation, location, eligibility and requirements.'},{n:'03',title:'Apply directly',body:'Continue to the employer’s official application destination when you are ready.'}].map(item=><div key={item.n} className="border-t border-[#dce5dc] pt-5"><p className="text-xs font-bold text-[#71917b]">{item.n}</p><h3 className="mt-5 text-lg font-bold tracking-tight text-[#263b30]">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[#7a887f]">{item.body}</p></div>)}</div></div>
        </section>

        <section id="employers" className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 sm:py-24"><div className="overflow-hidden rounded-[28px] bg-[#183c32] p-7 text-white sm:p-12 lg:p-16"><div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a7c7b2]">For employers</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-.055em] sm:text-5xl">Meet the people who can move your business forward.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#c4d6ca]">Submit a role without creating an account. Our proposed review process is designed to put employer identity and listing quality first.</p><div className="mt-7 flex flex-wrap gap-3 text-[11px] font-semibold text-[#d6e6db]"><span><Check className="mr-1 inline" size={14}/> No employer account</span><span><Check className="mr-1 inline" size={14}/> Human review</span><span><Check className="mr-1 inline" size={14}/> Clear ad packages</span></div></div><div><button onClick={()=>setEmployerOpen(true)} className="inline-flex items-center gap-3 rounded-full bg-[#f1f5ec] px-6 py-4 text-[12px] font-extrabold text-[#183c32] transition hover:bg-white">Explore employer posting <ArrowUpRight size={16}/></button></div></div></div></section>
      </main>
      <footer className="border-t border-[#e2e8e1] bg-[#f0f3ee]"><div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-5 py-8 text-[10px] font-medium text-[#819087] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-bold tracking-wide text-[#40564a]">WORK / WORLD <span className="font-normal text-[#8b978e]">· Working brand placeholder</span></span><span>Global opportunity network · Design concept, not yet launched</span><span>Privacy · Terms · Contact</span></div></footer>

      {(selected||employerOpen)&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#12241d]/55 p-4 backdrop-blur-sm" onClick={()=>{setSelected(null);setEmployerOpen(false)}}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#62816b]">{selected?'Role preview':'Employer experience'}</p><h3 className="mt-2 text-2xl font-bold tracking-tight text-[#20362a]">{selected?selected.role:'A simpler way to hire.'}</h3></div><button onClick={()=>{setSelected(null);setEmployerOpen(false)}} aria-label="Close dialog" className="grid h-9 w-9 place-items-center rounded-full bg-[#f0f4ef] text-[#52665a]"><X size={17}/></button></div>{selected?<><p className="mt-2 text-sm font-semibold text-[#688071]">{selected.company} · {selected.location}</p><p className="mt-5 text-sm leading-6 text-[#728077]">{selected.summary}</p><div className="mt-5 rounded-xl bg-[#f4f6f2] p-4"><p className="text-xs font-bold text-[#315b47]">{selected.salary}</p><p className="mt-1 text-[10px] text-[#87938b]">{selected.type} · {selected.category}</p></div><p className="mt-4 text-[10px] leading-5 text-[#9aa49d]">This is a fictional role used to demonstrate the future job detail experience. No application is available in this preview.</p></>:<><p className="mt-4 text-sm leading-6 text-[#728077]">The planned employer journey: submit your vacancy, verify your business email, receive a review decision, pay only after approval, then publish once payment is confirmed.</p><div className="mt-5 space-y-3">{['Submit job details without an account','Verify your business email','Wait for manual listing review','Receive payment link after approval','Listing publishes after payment confirmation'].map((item,i)=><div key={item} className="flex items-center gap-3 text-xs font-semibold text-[#506257]"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf4ed] text-[10px] font-bold text-[#52765d]">{i+1}</span>{item}</div>)}</div><p className="mt-5 rounded-xl bg-[#f4f6f2] p-3 text-[10px] leading-5 text-[#7c8a80]">Workflow concept only. Secure submission, email verification, payments and publishing still need implementation.</p></>}</div></div>}
      <div className="fixed bottom-3 right-3 z-40 rounded-lg border border-[#dce4dc] bg-white/95 px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[#6b7d70] shadow-lg">Development preview · Sample data</div>
    </div>
  );
}
