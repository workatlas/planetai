import React, {useEffect, useState} from 'react';
import {
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Globe2,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';
import {
  formatPayRate,
  JobListing,
  resolveApplyUrl,
} from '../data/jobs';
import {validateHttpsUrl} from '../utils/sanitize';

export type ApplicationStatus =
  | 'Applied'
  | 'Assessment Pending'
  | 'Interviewing'
  | 'Offer';

export interface AppliedRecord {
  jobId: string;
  status: ApplicationStatus;
  note: string;
  updatedAt: string;
}

interface JobCardProps {
  job: JobListing;
  isSaved: boolean;
  appliedStatus?: ApplicationStatus;
  onToggleSave: (id: string) => void;
  onOpenDetails: (job: JobListing) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isSaved,
  appliedStatus,
  onToggleSave,
  onOpenDetails,
}) => {
  const formattedPay = formatPayRate(
    job.payMinUsd,
    job.payMaxUsd,
    job.payUnit
  );

  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [job.companyLogoUrl]);

  const safeLogoUrl = job.companyLogoUrl
    ? validateHttpsUrl(job.companyLogoUrl)
    : null;
  const showLogo = Boolean(safeLogoUrl && !logoFailed);

  const isCustomPost = Boolean(
    job.isCustomEmployerPost || job.id.startsWith('custom-')
  );
  const isFeatured = Boolean(job.featured);
  const isVerified = Boolean(job.verified);
  const isEstablished = job.companyTier === 'Established Leader';
  const isCustomPartner = job.companyTier === 'Custom Partner';
  const externalApplyUrl = isCustomPost
    ? job.applyUrl
    : resolveApplyUrl(job.company, job.applyUrl);

  return (
    <article
      onClick={() => onOpenDetails(job)}
      className={`group cursor-pointer flex flex-col justify-between rounded-2xl border p-5 transition-all duration-150 ${
        isFeatured
          ? 'border-amber-400/60 bg-gradient-to-b from-amber-950/20 via-[#111827] to-[#111827] shadow-[0_0_28px_-8px_rgba(251,191,36,0.35)] hover:border-amber-300/80'
          : 'border-slate-800/90 bg-[#111827] hover:border-cyan-500/45'
      }`}
    >
      <div>
        {/* Featured Employer & Verified Banner Strip */}
        {(isFeatured || isVerified) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/45 bg-amber-950/55 px-2 py-0.5 text-[11px] font-semibold text-amber-200 shadow-sm">
                <Star className="w-3 h-3 fill-amber-300 text-amber-300 shrink-0" />
                <span>⭐ Featured Employer</span>
              </span>
            )}
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/45 bg-emerald-950/55 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                <span>✓ Verified</span>
              </span>
            )}
          </div>
        )}

        {/* Top Metadata Row: Company Logo/Monogram + Company + Urgent + Save */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {showLogo && safeLogoUrl ? (
              <img
                src={safeLogoUrl}
                alt={`${job.company} logo`}
                loading="lazy"
                onError={() => setLogoFailed(true)}
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-700/80 bg-slate-900 object-contain p-1"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900 font-display text-xs font-bold tracking-tight text-cyan-300"
              >
                {job.companyShort}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 truncate">
                <span className="truncate">{job.company}</span>
                {job.urgent && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 shrink-0">
                    <Zap className="w-3 h-3" />
                    Urgent
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 truncate">
                <span>{job.category}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {job.postedAgo}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(job.id);
            }}
            aria-label={
              isSaved
                ? `Remove ${job.title} from saved`
                : `Save ${job.title}`
            }
            aria-pressed={isSaved}
            className={`min-h-[44px] min-w-[44px] -mr-2 -mt-1.5 flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
              isSaved
                ? 'text-cyan-300 bg-cyan-950/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
            }`}
          >
            <Bookmark
              className="w-4 h-4"
              fill={isSaved ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {/* Company Tier Badge, Custom Employer Post Badge & Applied Tracker Status */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
              isCustomPartner
                ? 'border-violet-500/35 bg-violet-950/40 text-violet-300'
                : isEstablished
                  ? 'border-sky-500/30 bg-sky-950/40 text-sky-300'
                  : 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
            }`}
          >
            {job.companyTier}
          </span>
          {isCustomPost && (
            <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              Custom Employer Post
            </span>
          )}
          {appliedStatus ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              {appliedStatus}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">{job.workType}</span>
          )}
        </div>

        {/* Job Title */}
        <h3 className="mt-3 font-display text-base sm:text-lg font-bold text-slate-50 leading-snug group-hover:text-cyan-300 transition-colors">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(job);
            }}
            className="text-left focus-visible:outline-none focus-visible:underline"
          >
            {job.title}
          </button>
        </h3>

        {/* Global USD Pay Rate & Remote Location */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono tabular-nums text-lg font-semibold text-cyan-300">
            {formattedPay}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Globe2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{job.location}</span>
          </span>
        </div>

        {/* Short Role Summary */}
        <p className="mt-3 text-sm text-slate-300/90 leading-relaxed line-clamp-2">
          {job.description}
        </p>

        {/* Unboxed Tags Metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          {job.tags.map((tag, idx) => (
            <React.Fragment key={tag}>
              {idx > 0 && (
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
              )}
              <span className="text-slate-300/90">{tag}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Bottom Dual-Action Bar */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(job);
          }}
          className="min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-slate-50 hover:bg-slate-800/70 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          View Details
        </button>

        <a
          href={externalApplyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <span>Apply Now</span>
          <ArrowUpRight className="w-4 h-4 shrink-0" />
        </a>
      </div>
    </article>
  );
};
