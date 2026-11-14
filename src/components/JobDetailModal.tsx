import React, {useEffect, useState} from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Globe2,
  Lightbulb,
  Mic,
  ShieldCheck,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  formatPayRate,
  JobListing,
  resolveApplyUrl,
} from '../data/jobs';
import {sanitizeText, validateHttpsUrl} from '../utils/sanitize';
import {ApplicationStatus, AppliedRecord} from './JobCard';

interface JobDetailModalProps {
  job: JobListing | null;
  isSaved: boolean;
  appliedRecord?: AppliedRecord;
  onToggleSave: (id: string) => void;
  onUpsertApplied: (
    jobId: string,
    status: ApplicationStatus,
    note: string
  ) => void;
  onRemoveApplied: (jobId: string) => void;
  onTailorResume: (job: JobListing) => void;
  onLaunchPrepTool: (tool: 'voice' | 'learning') => void;
  onClose: () => void;
}

const STATUS_OPTIONS: ApplicationStatus[] = [
  'Applied',
  'Assessment Pending',
  'Interviewing',
  'Offer',
];

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  isSaved,
  appliedRecord,
  onToggleSave,
  onUpsertApplied,
  onRemoveApplied,
  onTailorResume,
  onLaunchPrepTool,
  onClose,
}) => {
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [note, setNote] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
    if (appliedRecord) {
      setStatus(appliedRecord.status);
      setNote(appliedRecord.note);
    } else {
      setStatus('Applied');
      setNote('');
    }
  }, [appliedRecord, job?.id, job?.companyLogoUrl]);

  if (!job) return null;

  const formattedPay = formatPayRate(
    job.payMinUsd,
    job.payMaxUsd,
    job.payUnit
  );

  const safeLogoUrl = job.companyLogoUrl
    ? validateHttpsUrl(job.companyLogoUrl)
    : null;
  const showLogo = Boolean(safeLogoUrl && !logoFailed);
  const safeWebsiteUrl = job.companyWebsite
    ? validateHttpsUrl(job.companyWebsite)
    : null;

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

  const prepTips =
    job.prepTips && job.prepTips.length > 0
      ? job.prepTips
      : [
          'Tailor your summary and skills using the AI Tools tab before submitting.',
          'Double-check qualification rubric instructions carefully prior to onboarding.',
        ];

  const isAudioRole = job.category === 'Audio/Voice';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-detail-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border bg-[#111827] p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
          isFeatured ? 'border-amber-400/50' : 'border-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {showLogo && safeLogoUrl ? (
              <img
                src={safeLogoUrl}
                alt={`${job.company} logo`}
                onError={() => setLogoFailed(true)}
                className="h-11 w-11 shrink-0 rounded-xl border border-slate-700 bg-slate-900 object-contain p-1"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 font-display text-sm font-bold text-cyan-300">
                {job.companyShort}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                <span>{job.company}</span>
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
                {isFeatured && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/45 bg-amber-950/50 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                    <span>⭐ Featured Employer</span>
                  </span>
                )}
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/45 bg-emerald-950/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>✓ Verified</span>
                  </span>
                )}
                {isCustomPost && (
                  <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    Custom Employer Post
                  </span>
                )}
                {job.urgent && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                    <Zap className="w-3.5 h-3.5" />
                    Urgent Hiring
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{job.category}</span>
                <span aria-hidden="true">·</span>
                <span>{job.workType}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {job.postedAgo}
                </span>
                {safeWebsiteUrl && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={safeWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                    >
                      <span>Career Portal</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close job details"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Pay */}
        <h2
          id="job-detail-title"
          className="mt-5 font-display text-xl sm:text-2xl font-bold text-slate-50 leading-snug"
        >
          {job.title}
        </h2>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B111E] p-4">
          <div>
            <span className="block text-xs text-slate-400">
              Global Compensation (USD)
            </span>
            <span className="font-mono tabular-nums text-xl font-bold text-cyan-300">
              {formattedPay}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Globe2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{job.location}</span>
          </div>
        </div>

        {/* Description, Requirements & Quick Prep Tips */}
        <div className="mt-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-1.5">
              Role Overview
            </h3>
            <p className="text-sm text-slate-200 leading-relaxed">
              {job.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-2">
              Qualifications &amp; Setup
            </h3>
            <ul className="space-y-2">
              {job.requirements.map((req) => (
                <li
                  key={req}
                  className="flex items-start gap-2.5 text-sm text-slate-300"
                >
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Lightbulb className="w-4 h-4 shrink-0" />
                <span>Quick Prep Tips</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onLaunchPrepTool(isAudioRole ? 'voice' : 'learning')
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-4"
              >
                {isAudioRole ? (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Test Mic in Voice Prep</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open Interview Prep</span>
                  </>
                )}
              </button>
            </div>
            <ul className="space-y-1.5">
              {prepTips.map((tip) => (
                <li
                  key={tip}
                  className="text-xs sm:text-sm text-slate-200 leading-relaxed"
                >
                  • {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Local Application Tracker */}
          <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">
                  Application Tracker (Saved Locally)
                </span>
              </div>
              {appliedRecord && (
                <button
                  type="button"
                  onClick={() => onRemoveApplied(job.id)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                aria-label="Application status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ApplicationStatus)
                }
                className="min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g., Passed rubric quiz)"
                aria-label="Application note"
                className="flex-1 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  onUpsertApplied(job.id, status, sanitizeText(note, 200))
                }
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-colors whitespace-nowrap"
              >
                {appliedRecord ? 'Update Status' : 'Mark as Applied'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-1.5">
              Focus Areas
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              {job.tags.map((tag, idx) => (
                <React.Fragment key={tag}>
                  {idx > 0 && (
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <span>{tag}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions: Save, Tailor Resume Shortcut, Apply Now ↗ */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => onToggleSave(job.id)}
            className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
              isSaved
                ? 'border-cyan-500/50 bg-cyan-950/50 text-cyan-300'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Bookmark
              className="w-4 h-4"
              fill={isSaved ? 'currentColor' : 'none'}
            />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onTailorResume(job)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm font-semibold text-slate-100 hover:border-cyan-500/50 hover:text-cyan-200 transition-colors whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tailor Resume for This Role</span>
            </button>

            <a
              href={externalApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>Apply Now</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
