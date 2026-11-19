import React, {useEffect, useState} from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Globe2,
  Lightbulb,
  Mic,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import {
  formatPayRate,
  JobListing,
  resolveApplyUrl,
} from '../data/jobs';
import {
  computeSkillMatch,
  getAssessmentAndPayoutInfo,
} from '../utils/careerIntel';
import {sanitizeText, validateHttpsUrl} from '../utils/sanitize';
import {ApplicationStatus, AppliedRecord, CompanyLogo} from './JobCard';

interface JobDetailModalProps {
  job: JobListing | null;
  isSaved: boolean;
  appliedRecord?: AppliedRecord;
  userSkills?: string;
  onToggleSave: (id: string) => void;
  onUpsertApplied: (
    jobId: string,
    status: ApplicationStatus,
    note: string
  ) => void;
  onRemoveApplied: (jobId: string) => void;
  onTailorResume: (job: JobListing) => void;
  onLaunchPrepTool: (tool: 'voice' | 'learning', job: JobListing) => void;
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
  userSkills = '',
  onToggleSave,
  onUpsertApplied,
  onRemoveApplied,
  onTailorResume,
  onLaunchPrepTool,
  onClose,
}) => {
  const [status, setStatus] = useState<ApplicationStatus>('Applied');
  const [note, setNote] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(25);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    setShareCopied(false);
    if (appliedRecord) {
      setStatus(appliedRecord.status);
      setNote(appliedRecord.note);
    } else {
      setStatus('Applied');
      setNote('');
    }
  }, [appliedRecord, job?.id]);

  if (!job) return null;

  const formattedPay = formatPayRate(
    job.payMinUsd,
    job.payMaxUsd,
    job.payUnit
  );

  const safeWebsiteUrl = job.companyWebsite
    ? validateHttpsUrl(job.companyWebsite)
    : null;

  const isCustomPost = Boolean(
    job.isCustomEmployerPost || job.id.startsWith('custom-')
  );
  const isCuratedGuide = !isCustomPost;
  const isFeatured = isCustomPost && Boolean(job.featured);
  const isVerified = isCustomPost && Boolean(job.verified);
  const isEstablished = job.companyTier === 'Established Leader';
  const isCustomPartner = job.companyTier === 'Custom Partner';
  const externalApplyUrl = isCustomPost
    ? job.applyUrl
    : resolveApplyUrl(job.company, job.applyUrl);
  const displayPay = isCuratedGuide
    ? 'Not listed — confirm with employer'
    : formattedPay;

  const prepTips =
    job.prepTips && job.prepTips.length > 0
      ? job.prepTips
      : [
          'Tailor your summary and skills using the AI Tools tab before submitting.',
          'Double-check qualification rubric instructions carefully prior to onboarding.',
        ];

  const isAudioRole = job.category === 'Audio/Voice';
  const intel = getAssessmentAndPayoutInfo(job);
  const skillMatch = computeSkillMatch(job, userSkills);

  const weeklyMinUsd = Math.round(job.payMinUsd * weeklyHours);
  const weeklyMaxUsd = Math.round(job.payMaxUsd * weeklyHours);
  const monthlyMinUsd = Math.round(weeklyMinUsd * 4.33);
  const monthlyMaxUsd = Math.round(weeklyMaxUsd * 4.33);

  const handleShareRole = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?job=${encodeURIComponent(
      job.id
    )}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} at ${job.company} — PlanetAI`,
          text: isCuratedGuide
            ? `Explore this opportunity guide on PLANETAI and confirm current details with the employer.`
            : `Check out this remote role (${formattedPay}) on PLANETAI:`, 
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unsupported; fall back to clipboard copy
      }
    }

    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = shareUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2200);
    }
  };

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
        className={`w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${
          isFeatured ? 'border-amber-400/50' : 'border-[#e2e8e1]'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <CompanyLogo
              company={job.company}
              short={job.companyShort}
              explicitLogoUrl={job.companyLogoUrl}
              websiteOrApplyUrl={job.companyWebsite || job.applyUrl}
              size="lg"
              lazy={false}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#40534a]">
                <span>{job.company}</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                    isCustomPartner
                      ? 'border-violet-500/35 bg-violet-950/40 text-violet-300'
                      : isEstablished
                        ? 'border-sky-500/30 bg-sky-950/40 text-sky-300'
                        : 'border-emerald-500/30 bg-emerald-950/40 text-[#47745c]'
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
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/45 bg-[#eef4ee] px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-[#47745c]" />
                    <span>✓ Verified</span>
                  </span>
                )}
                {isCustomPost && (
                  <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                    Custom Employer Post
                  </span>
                )}
                {isCustomPost && job.urgent && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                    <Zap className="w-3.5 h-3.5" />
                    Urgent Hiring
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#77847b] mt-1">
                <span>{job.category}</span>
                <span aria-hidden="true">·</span>
                <span>{job.workType}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isCuratedGuide ? 'Opportunity guide · availability not confirmed' : job.postedAgo}
                </span>
                {safeWebsiteUrl && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={safeWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#47745c] hover:text-[#54806b] underline underline-offset-2"
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
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-[#77847b] hover:text-[#25372e] hover:bg-[#e9eee8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title & Pay */}
        <h2
          id="job-detail-title"
          className="mt-5 font-display text-xl sm:text-2xl font-bold text-[#1d3028] leading-snug"
        >
          {job.title}
        </h2>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4">
          <div>
            <span className="block text-xs text-[#77847b]">
              Global Compensation (USD)
            </span>
            <span className="font-mono tabular-nums text-xl font-bold text-[#47745c]">
              {displayPay}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#65736b]">
            <Globe2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{job.location}</span>
          </div>
        </div>

        {/* Skill Match Breakdown (when user saved skills locally) */}
        {skillMatch && (
          <div className="mt-3 rounded-xl border border-[#c1d2c4] bg-[#eef4ee] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-[#54806b]">
              <Sparkles className="w-4 h-4 text-[#47745c] shrink-0" />
              <span>
                <strong className="font-mono text-[#47745c]">
                  {skillMatch.score}% Skill Match
                </strong>{' '}
                {skillMatch.matchedSkills.length > 0
                  ? `— Matched: ${skillMatch.matchedSkills.join(', ')}`
                  : '— No direct overlap with your saved skills yet'}
              </span>
            </div>
          </div>
        )}

        {/* Assessment & Payout Transparency */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#77847b]">
              <ClipboardCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Screening Format</span>
            </div>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#25372e]">
              {intel.screeningFormat}
            </p>
            <p className="mt-0.5 text-[11px] text-[#77847b]">
              Est. assessment length: {intel.screeningDuration}
            </p>
          </div>

          <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#77847b]">
              <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Payout Cadence &amp; Methods</span>
            </div>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#25372e]">
              {intel.payoutSchedule}
            </p>
            <p className="mt-0.5 text-[11px] text-[#77847b]">
              Paid in standard USD
            </p>
          </div>
        </div>

        {/* Income estimates are shown only for employer-submitted listings with stated pay. */}
        {!isCuratedGuide && job.payUnit === 'hr' && (
          <div className="mt-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#40534a]">
                <Calculator className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Weekly &amp; Monthly Income Estimator</span>
              </div>
              <span className="font-mono text-xs font-semibold text-[#47745c] tabular-nums">
                {weeklyHours} hrs/week
              </span>
            </div>

            <input
              type="range"
              min={5}
              max={45}
              step={5}
              aria-label="Estimated hours per week"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#77847b]">
                Weekly:{' '}
                <strong className="font-mono text-[#25372e] tabular-nums">
                  ${weeklyMinUsd.toLocaleString()}–$
                  {weeklyMaxUsd.toLocaleString()}
                </strong>
              </span>
              <span className="text-[#77847b]">
                Monthly Est.:{' '}
                <strong className="font-mono text-[#47745c] tabular-nums">
                  ${monthlyMinUsd.toLocaleString()}–$
                  {monthlyMaxUsd.toLocaleString()}/mo
                </strong>
              </span>
            </div>
          </div>
        )}

        {isCuratedGuide && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
            <strong>Important:</strong> This is a curated role guide, not a confirmed live vacancy or an offer from the employer. Open the employer's official site to check whether the role is currently available, who can apply, and the latest compensation and terms.
          </div>
        )}

        {/* Description, Requirements & Quick Prep Tips */}
        <div className="mt-5 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-[#77847b] mb-1.5">
              Role Overview
            </h3>
            <p className="text-sm text-[#40534a] leading-relaxed">
              {job.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#77847b] mb-2">
              Qualifications &amp; Setup
            </h3>
            <ul className="space-y-2">
              {job.requirements.map((req) => (
                <li
                  key={req}
                  className="flex items-start gap-2.5 text-sm text-[#65736b]"
                >
                  <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#c1d2c4] bg-[#eef4ee] p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#47745c]">
                <Lightbulb className="w-4 h-4 shrink-0" />
                <span>Quick Prep Tips</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onLaunchPrepTool(isAudioRole ? 'voice' : 'learning', job)
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#47745c] hover:text-[#54806b] underline underline-offset-4"
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
                  className="text-xs sm:text-sm text-[#40534a] leading-relaxed"
                >
                  • {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Local Application Tracker */}
          <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-[#40534a]">
                  Application Tracker (Saved Locally)
                </span>
              </div>
              {appliedRecord && (
                <button
                  type="button"
                  onClick={() => onRemoveApplied(job.id)}
                  className="inline-flex items-center gap-1 text-xs text-[#77847b] hover:text-rose-400 transition-colors"
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
                className="min-h-[40px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3 py-1.5 text-xs font-medium text-[#25372e] focus:border-[#54806b] focus:outline-none"
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
                className="flex-1 min-h-[40px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3 py-1.5 text-xs text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  onUpsertApplied(job.id, status, sanitizeText(note, 200))
                }
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#c1d2c4] bg-[#eef4ee] text-xs font-semibold text-[#47745c] hover:bg-emerald-900/50 transition-colors whitespace-nowrap"
              >
                {appliedRecord ? 'Update Status' : 'Mark as Applied'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#77847b] mb-1.5">
              Focus Areas
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#65736b]">
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

        {/* Footer Actions: Save, Share Role, Tailor Resume, Apply Now ↗ */}
        <div className="mt-6 pt-4 border-t border-[#e2e8e1] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleSave(job.id)}
              className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                isSaved
                  ? 'border-cyan-500/50 bg-cyan-950/50 text-[#47745c]'
                  : 'border-[#d7e0d7] bg-[#f4f6f2] text-[#40534a] hover:bg-[#e9eee8]'
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                fill={isSaved ? 'currentColor' : 'none'}
              />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareRole}
              aria-label="Share direct link to this role"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] text-xs sm:text-sm font-medium text-[#40534a] hover:bg-[#e9eee8] transition-colors"
            >
              {shareCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#47745c]">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-[#77847b]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onTailorResume(job)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] text-xs sm:text-sm font-semibold text-[#25372e] hover:border-[#a9bcae] hover:text-[#54806b] transition-colors whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Tailor Resume</span>
            </button>

            <a
              href={externalApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#183c32] text-white text-xs sm:text-sm font-bold hover:bg-[#285c4b] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>{isCustomPost ? 'View Listing' : 'Visit Employer Site'}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
