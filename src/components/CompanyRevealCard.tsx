import React from 'react';
import {ArrowUpRight, Bookmark, MapPin, ShieldCheck} from 'lucide-react';
import {formatPayRate, type JobListing, resolveApplyUrl} from '../data/jobs';
import {CompanyLogo} from './JobCard';

interface CompanyRevealCardProps {
  job: JobListing;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onOpenJob: (job: JobListing) => void;
}

const categoryTone = (category: string) => {
  if (category === 'Coding') return 'border-indigo-400/25 bg-indigo-500/[0.18] text-indigo-200';
  if (category === 'AI Training') return 'border-violet-400/25 bg-violet-500/[0.16] text-violet-200';
  if (category === 'Remote') return 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-200';
  return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
};

export const CompanyRevealCard: React.FC<CompanyRevealCardProps> = ({
  job, isSaved, onToggleSave, onOpenJob,
}) => {
  const isCustomPost = Boolean(job.isCustomEmployerPost || job.id.startsWith('custom-'));
  const pay = isCustomPost
    ? formatPayRate(job.payMinUsd, job.payMaxUsd, job.payUnit)
    : 'Salary not disclosed';
  const hasPay = isCustomPost && pay !== 'Salary not disclosed';
  const applyUrl = isCustomPost ? job.applyUrl : resolveApplyUrl(job.company, job.applyUrl);

  return (
    <article className="group flex min-w-0 flex-col rounded-2xl border border-indigo-300/[0.24] bg-[linear-gradient(160deg,rgba(26,34,58,.82)_0%,rgba(13,18,34,.95)_100%)] p-[18px] shadow-[0_16px_44px_rgba(0,0,0,.2)] backdrop-blur-[14px] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-[0_20px_52px_rgba(0,0,0,.3)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <CompanyLogo company={job.company} short={job.companyShort} explicitLogoUrl={job.companyLogoUrl} websiteOrApplyUrl={job.companyWebsite || job.applyUrl} size="sm" lazy/>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-white">{job.company}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400">
            {job.verified ? <><ShieldCheck size={11} className="text-emerald-300"/> Employer verified</> : isCustomPost ? 'Employer-published listing' : 'Curated opportunity guide'}
          </p>
        </div>
        <span className={`max-w-[108px] shrink rounded-full border px-2.5 py-1 text-[9px] font-bold ${categoryTone(job.category)}`}>{job.category}</span>
        <button type="button" onClick={() => onToggleSave(job.id)} aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`} aria-pressed={isSaved} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isSaved ? 'border-cyan-300/45 bg-cyan-300/10 text-[#22d3ee]' : 'border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/40 hover:text-cyan-200'}`}>
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'}/>
        </button>
      </div>

      <button type="button" onClick={() => onOpenJob(job)} className="mt-4 text-left focus-visible:outline-none focus-visible:underline focus-visible:decoration-cyan-300">
        <h3 className="line-clamp-2 text-[1.15rem] font-extrabold leading-[1.25] tracking-[-.025em] text-white transition group-hover:text-cyan-100">{job.title}</h3>
      </button>
      <button type="button" onClick={() => onOpenJob(job)} className="mt-2 text-left focus-visible:outline-none focus-visible:underline focus-visible:decoration-cyan-300">
        <p className="line-clamp-3 text-xs leading-5 text-slate-400">{job.description}</p>
        <span className="sr-only">Open full role details</span>
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold tabular-nums ${hasPay ? 'border-emerald-400/35 bg-emerald-400/15 text-[#34d399]' : 'border-slate-700/70 bg-slate-800/60 text-slate-500'}`}>{pay}</span>
        <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-slate-400"><MapPin size={12} className="shrink-0 text-slate-500"/><span className="truncate">{job.location}</span></span>
      </div>

      {job.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{job.tags.slice(0,4).map(tag => <span key={tag} className="rounded-md border border-white/[0.07] bg-white/[0.035] px-2 py-1 text-[9px] font-medium text-slate-400">{tag.replace(/([a-z0-9])([A-Z])/g, '$1 $2')}</span>)}</div>}

      <div className="mt-auto mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="text-[10px] text-slate-500">{job.postedAgo}</span>
        <span className="text-[9px] font-semibold text-slate-500">No PLANETAI account needed</span>
      </div>
      <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#6366f1] px-4 py-2.5 text-[11px] font-extrabold text-[#070b14] shadow-lg shadow-cyan-950/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        Apply Direct ↗ <ArrowUpRight size={14}/>
      </a>
    </article>
  );
};
