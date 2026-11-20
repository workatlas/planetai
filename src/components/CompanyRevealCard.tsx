import React, {useState} from 'react';
import {ArrowLeft, ArrowUpRight, Bookmark, RotateCcw} from 'lucide-react';
import {formatPayRate, type JobListing} from '../data/jobs';
import {CompanyLogo} from './JobCard';

interface CompanyRevealCardProps {
  job: JobListing;
  isSaved: boolean;
  isResumeTarget?: boolean;
  onToggleSave: (id: string) => void;
  onOpenJob: (job: JobListing) => void;
}

const TONES: Record<string, {border: string; badge: string}> = {
  'AI Training': {border: 'border-l-[#7d8cff]', badge: 'border-[#6478ff]/25 bg-[#1b2850] text-[#b8c5ff]'},
  Coding: {border: 'border-l-[#b79aff]', badge: 'border-[#9b7cff]/25 bg-[#292044] text-[#d0bdff]'},
  'Audio/Voice': {border: 'border-l-[#c08cff]', badge: 'border-[#bd8cff]/25 bg-[#2a1e42] text-[#e0c5ff]'},
  'Data Annotation': {border: 'border-l-[#48d9b0]', badge: 'border-[#48d9b0]/25 bg-[#12372f] text-[#8be9ce]'},
  Remote: {border: 'border-l-[#38c8ff]', badge: 'border-[#38c8ff]/25 bg-[#123044] text-[#8bdcff]'},
};

export const CompanyRevealCard: React.FC<CompanyRevealCardProps> = ({
  job, isSaved, isResumeTarget = false, onToggleSave, onOpenJob,
}) => {
  const [revealed, setRevealed] = useState(false);
  const tone = TONES[job.category] || TONES.Remote;
  const isCustomPost = Boolean(job.isCustomEmployerPost || job.id.startsWith('custom-'));
  const pay = isCustomPost ? formatPayRate(job.payMinUsd, job.payMaxUsd, job.payUnit) : 'Salary not disclosed';

  return (
    <article className="group relative h-full min-h-[390px] [perspective:1200px]">
      <div className={`relative grid h-full min-h-[390px] rounded-[22px] [transform-style:preserve-3d] transition-transform duration-500 motion-reduce:transition-none [&>*]:[grid-area:1/1] ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
        <section aria-label={`${job.company} job preview`} aria-hidden={revealed} className={`flex h-full min-h-[390px] flex-col overflow-hidden rounded-[22px] border ${isResumeTarget ? 'border-[#38c8ff]/65 ring-2 ring-[#38c8ff]/25 shadow-[0_0_32px_rgba(56,200,255,.14)]' : 'border-white/[0.09]'} border-l-[3px] ${tone.border} bg-[#111b30] p-5 shadow-[0_18px_55px_rgba(0,0,0,.18)] [backface-visibility:hidden] sm:p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <CompanyLogo company={job.company} short={job.companyShort} explicitLogoUrl={job.companyLogoUrl} websiteOrApplyUrl={job.companyWebsite || job.applyUrl} size="lg" lazy={false}/>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-white">{job.company}</p>
                <p className="mt-1 text-[10px] text-[#9ba9c1]">{isCustomPost ? 'Employer published' : 'Curated opportunity'}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isResumeTarget && <span className="rounded-full border border-[#38c8ff]/40 bg-[#123044] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8bdcff]">Resume target</span>}
              {job.featured && <span className="rounded-full border border-[#8265ff]/30 bg-[#292044] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#c7b8ff]">Featured</span>}
              <button type="button" tabIndex={revealed ? -1 : 0} onClick={() => onToggleSave(job.id)} aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} aria-pressed={isSaved} className={`grid h-10 w-10 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38c8ff] ${isSaved ? 'border-[#38c8ff]/50 bg-[#123044] text-[#8bdcff]' : 'border-white/10 bg-[#0d1425] text-[#8393ad] hover:border-[#38c8ff]/40 hover:text-[#8bdcff]'}`}>
                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'}/>
              </button>
            </div>
          </div>
          <div className="mt-6">
            <span className={`inline-flex rounded-full border px-3 py-1.5 text-[9px] font-bold tracking-wide ${tone.badge}`}>{job.category}</span>
            <h3 className="mt-4 h-[84px] min-h-[84px] line-clamp-3 text-xl font-bold leading-7 tracking-[-.035em] text-white">{job.title}</h3>
            <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#b7c3d8]">{job.description}</p>
          </div>
          <div className="mt-auto pt-5">
            <p className="text-lg font-extrabold tracking-wide text-[#38c8ff]">{pay}</p>
            <p className="mt-1 text-[10px] text-[#9ba9c1]">{job.location} · {job.workType}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.09] pt-4">
              <span className="shrink-0 text-[9px] font-medium text-[#8393ad]">{job.postedAgo}</span>
              <button type="button" tabIndex={revealed ? -1 : 0} aria-expanded={revealed} onClick={() => setRevealed(true)} className="ml-auto inline-flex min-h-10 max-w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#8265ff]/35 bg-[#292044] px-4 py-2 text-[10px] font-bold text-[#c7b8ff] transition hover:border-[#a18aff]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8265ff]">
                Reveal company details <ArrowUpRight size={14}/>
              </button>
            </div>
          </div>
        </section>

        <section aria-label={`${job.company} additional job details`} aria-hidden={!revealed} className="flex h-full min-h-[390px] flex-col overflow-hidden rounded-[22px] border border-[#8265ff]/25 border-l-[3px] bg-[#111b30] p-5 shadow-[0_18px_55px_rgba(0,0,0,.22)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">{job.company}</p>
              <p className="mt-1 text-[10px] text-[#9ba9c1]">{isResumeTarget ? 'Your selected resume target' : 'Company & role overview'}</p>
            </div>
            <button type="button" tabIndex={revealed ? 0 : -1} aria-expanded={revealed} onClick={() => setRevealed(false)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#0d1425] px-3 py-2 text-[10px] font-semibold text-[#b7c3d8] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38c8ff]">
              <ArrowLeft size={13}/> Back
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">{isResumeTarget && <span className="rounded-full border border-[#38c8ff]/35 bg-[#123044] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8bdcff]">Resume target</span>}<h3 className="text-lg font-bold leading-6 text-white">{job.title}</h3></div>
          <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#b7c3d8]">{job.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {job.tags.slice(0, 5).map(tag => <span key={tag} className="rounded-lg border border-white/[0.07] bg-[#0d1425] px-2.5 py-1.5 text-[9px] font-semibold text-[#b7c3d8]">{tag}</span>)}
          </div>
          {job.requirements.length > 0 && <div className="mt-4">
            <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8d7aff]">What you'll need</p>
            <ul className="mt-2 space-y-1.5">{job.requirements.slice(0, 2).map((item, index) => <li key={index} className="text-[10px] leading-4 text-[#b7c3d8]">• {item}</li>)}</ul>
          </div>}
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.09] pt-4">
            <button type="button" tabIndex={revealed ? 0 : -1} onClick={() => setRevealed(false)} className="inline-flex min-h-10 items-center gap-1.5 text-[10px] font-semibold text-[#9ba9c1] hover:text-white"><RotateCcw size={13}/> Flip back</button>
            <button type="button" tabIndex={revealed ? 0 : -1} onClick={() => onOpenJob(job)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#38c8ff]/25 bg-[#123044] px-4 py-2 text-[10px] font-bold text-[#8bdcff] transition hover:border-[#38c8ff]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38c8ff]">
              View full details <ArrowUpRight size={14}/>
            </button>
          </div>
        </section>
      </div>
    </article>
  );
};
