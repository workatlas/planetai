import React, {useEffect, useState} from 'react';
import { supabase } from '../lib/supabase';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Mail,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  CompanyTier,
  formatPayRate,
  JOB_CATEGORIES,
  JobCategory,
  JobListing,
  PayUnit,
} from '../data/jobs';
import {
  checkModerationViolations,
  sanitizeText,
  validateHttpsUrl,
} from '../utils/sanitize';


// ============================================================================
// LIVE CONFIGURATION — PlanetAI Employer Portal
// ============================================================================
const EMPLOYER_INBOX_EMAIL = 'workatlas.team@gmail.com';
const SUBMISSION_COOLDOWN_KEY = 'planetai_employer_cooldown_v1';
const SUBMISSION_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

type ListingTierId = 'free' | 'featured' | 'spotlight';

interface ListingTierOption {
  id: ListingTierId;
  name: string;
  priceUsd: number;
  cadenceLabel: string;
  description: string;
  featured: boolean;
  marqueeSpotlight: boolean;
}

const LISTING_TIERS: ListingTierOption[] = [
  {
    id: 'free',
    name: 'Free Standard',
    priceUsd: 0,
    cadenceLabel: '$0',
    description: 'Standard chronological placement after manual review.',
    featured: false,
    marqueeSpotlight: false,
  },
  {
    id: 'featured',
    name: 'Featured Boost',
    priceUsd: 49,
    cadenceLabel: '$49 / 30 days',
    description:
      'Highlighted ⭐ Featured Employer card border & pinned near the top of the feed.',
    featured: true,
    marqueeSpotlight: false,
  },
  {
    id: 'spotlight',
    name: 'Spotlight + Marquee',
    priceUsd: 149,
    cadenceLabel: '$149 / 30 days',
    description:
      'Everything in Featured Boost plus a rotating slot in the live header Marquee ticker.',
    featured: true,
    marqueeSpotlight: true,
  },
];

interface SubmittedReceipt {
  referenceId: string;
  status: string;
  verificationDelivery: string;
  job: JobListing;
  tier: ListingTierOption;
  addVerifiedBadge: boolean;
  totalDueUsd: number;
  approvalSnippet: string;
  emailMessageBody: string;
  submissionSaved: boolean;
  primaryPaypalUrl: string | null;
  secondaryAddonPaypalUrl: string | null;
}

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewLocalJob: (job: JobListing) => void;
  localPreviewJobs?: JobListing[];
  onDeleteLocalPreview?: (id: string) => void;
}

const VALID_CATEGORIES = JOB_CATEGORIES.filter(
  (c): c is Exclude<JobCategory, 'All'> => c !== 'All'
);

type ModalView = 'post' | 'manage';

function isNonEmptyUrlInput(raw: string): boolean {
  const cleaned = sanitizeText(raw, 300).trim();
  return cleaned.length > 0 && cleaned.toLowerCase() !== 'https://';
}

function getCooldownRemainingMs(): number {
  try {
    const raw = window.localStorage.getItem(SUBMISSION_COOLDOWN_KEY);
    if (!raw) return 0;
    const lastTimestamp = Number(raw);
    if (Number.isNaN(lastTimestamp)) return 0;
    const elapsed = Date.now() - lastTimestamp;
    return elapsed < SUBMISSION_COOLDOWN_MS
      ? SUBMISSION_COOLDOWN_MS - elapsed
      : 0;
  } catch {
    return 0;
  }
}

function formatCooldown(ms: number): string {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({
  isOpen,
  onClose,
  onPreviewLocalJob,
  localPreviewJobs = [],
  onDeleteLocalPreview,
}) => {
  const [modalView, setModalView] = useState<ModalView>('post');
  const [selectedTierId, setSelectedTierId] =
    useState<ListingTierId>('free');
  const addVerifiedBadge = false;

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [companyTier, setCompanyTier] = useState<CompanyTier>('Custom Partner');
  const [category, setCategory] =
    useState<Exclude<JobCategory, 'All'>>('AI Training');
  const [workType, setWorkType] =
    useState<JobListing['workType']>('Async Contract');
  const [payMin, setPayMin] = useState('35');
  const [payMax, setPayMax] = useState('55');
  const [payUnit, setPayUnit] = useState<PayUnit>('hr');
  const [location, setLocation] = useState('Worldwide Remote');
  const [companyWebsite, setCompanyWebsite] = useState('https://');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [applyUrl, setApplyUrl] = useState('https://');
  const [contactEmail, setContactEmail] = useState('');
  const [tagsInput, setTagsInput] = useState('RLHF, Evaluation, Async');
  const [requirementsInput, setRequirementsInput] = useState('');
  const [description, setDescription] = useState('');
  const [noUpfrontFeesChecked, setNoUpfrontFeesChecked] = useState(false);
  const [botCheck, setBotCheck] = useState(''); // Hidden CSS honeypot field

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cooldownMs, setCooldownMs] = useState(0);
  const [receipt, setReceipt] = useState<SubmittedReceipt | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [previewActivated, setPreviewActivated] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCooldownMs(getCooldownRemainingMs());
    const timer = window.setInterval(() => {
      setCooldownMs(getCooldownRemainingMs());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedTier =
    LISTING_TIERS.find((t) => t.id === selectedTierId) || LISTING_TIERS[0];
  const totalDueUsd =
    selectedTier.priceUsd;

  const resetFormFields = () => {
    setTitle('');
    setCompany('');
    setCompanyTier('Custom Partner');
    setWorkType('Async Contract');
    setCompanyWebsite('https://');
    setCompanyLogoUrl('');
    setDescription('');
    setRequirementsInput('');
    setContactEmail('');
    setApplyUrl('https://');
    setNoUpfrontFeesChecked(false);
    setBotCheck('');
    setError('');
  };

  const handleCloseModal = () => {
    setError('');
    onClose();
  };

  const handleCopySnippet = async (snippet: string) => {
    let ok = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(snippet);
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = snippet;
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
      setCopiedSnippet(true);
      window.setTimeout(() => setCopiedSnippet(false), 2200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Honeypot Bot Check
    if (botCheck.trim() !== '') {
      setError('Automated submission rejected.');
      return;
    }

    // 2. 15-Minute Browser Cooldown Check
    const remaining = getCooldownRemainingMs();
    if (remaining > 0) {
      setCooldownMs(remaining);
      setError(
        `Anti-spam cooldown active. Please wait ${formatCooldown(remaining)} before submitting another role.`
      );
      return;
    }

    // 3. Mandatory No-Upfront-Fees Confirmation
    if (!noUpfrontFeesChecked) {
      setError(
        'Please confirm the "No upfront fees charged to applicants" checkbox before submitting.'
      );
      return;
    }

    const cleanTitle = sanitizeText(title, 120);
    const cleanCompany = sanitizeText(company, 80);
    const cleanLocation = sanitizeText(location, 80) || 'Worldwide Remote';
    const cleanDescription = sanitizeText(description, 400);
    const cleanEmail = sanitizeText(contactEmail, 120);
    const min = Number(payMin);
    const max = Number(payMax);

    if (!cleanTitle || !cleanCompany) {
      setError('Please enter your company name and job title.');
      return;
    }
    if (Number.isNaN(min) || Number.isNaN(max) || min <= 0 || max < min) {
      setError('Please enter a valid USD pay range.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(
        'Please enter a valid recruiter or company contact email for approval notifications.'
      );
      return;
    }

    // 4. URL Validation & Shortener Blocking
    let validatedWebsite: string | undefined;
    if (isNonEmptyUrlInput(companyWebsite)) {
      const parsedWebsite = validateHttpsUrl(companyWebsite);
      if (!parsedWebsite) {
        setError(
          'Company Website / Career Portal must use https:// and cannot be a URL shortener (e.g., bit.ly, tinyurl.com).'
        );
        return;
      }
      validatedWebsite = parsedWebsite;
    }

    let validatedLogoUrl: string | undefined;
    if (isNonEmptyUrlInput(companyLogoUrl)) {
      const parsedLogo = validateHttpsUrl(companyLogoUrl);
      if (!parsedLogo) {
        setError(
          'Company Logo URL must use https:// and cannot be a URL shortener.'
        );
        return;
      }
      validatedLogoUrl = parsedLogo;
    }

    const validatedApplyUrl = isNonEmptyUrlInput(applyUrl)
      ? validateHttpsUrl(applyUrl)
      : validatedWebsite || null;

    if (!validatedApplyUrl) {
      setError(
        'Please enter a valid https:// Apply URL or Company Career Portal (no http:// or URL shorteners).'
      );
      return;
    }

    // 5. Anti-Spam & Profanity / Scam Keyword Moderation Scan
    const moderationError = checkModerationViolations([
      cleanTitle,
      cleanCompany,
      cleanLocation,
      cleanDescription,
      tagsInput,
      requirementsInput,
      companyWebsite,
      companyLogoUrl,
      applyUrl,
    ]);
    if (moderationError) {
      setError(moderationError);
      return;
    }

    const short = cleanCompany
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const tags = tagsInput
      .split(',')
      .map((t) => sanitizeText(t, 28))
      .filter(Boolean)
      .slice(0, 4);

    const parsedRequirements = requirementsInput
      .split(/[\n,;]+/)
      .map((r) => sanitizeText(r, 140))
      .filter(Boolean)
      .slice(0, 5);

    const stagedJob: JobListing = {
      id: `submission-${Date.now()}`,
      title: cleanTitle,
      company: cleanCompany,
      companyShort: short,
      companyTier,
      companyWebsite: validatedWebsite,
      companyLogoUrl: validatedLogoUrl,
      isCustomEmployerPost: true,
      featured: false,
      verified: false,
      marqueeSpotlight: false,
      category,
      payMinUsd: min,
      payMaxUsd: max,
      payUnit,
      location: cleanLocation,
      workType,
      postedAgo: 'Just submitted',
      tags: tags.length ? tags : [category, 'Remote'],
      applyUrl: validatedApplyUrl,
      description: cleanDescription,
      requirements: parsedRequirements,
      prepTips: [],
      contactEmail: cleanEmail,
    };

    setIsSubmitting(true);
    try {
      const { data, error: submitError } = await supabase.functions.invoke('job-submission', {
        body: {
          company: cleanCompany, contact_email: cleanEmail, title: cleanTitle,
          category, employment_type: workType, location: cleanLocation,
          remote_policy: workType.toLowerCase().includes('remote') || cleanLocation.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid',
          salary_min: min, salary_max: max, pay_period: payUnit,
          description: stagedJob.description,
          requirements: parsedRequirements.length ? parsedRequirements : stagedJob.requirements,
          tags: tags.length ? tags : [category, 'Remote'],
          company_website: validatedWebsite || '', company_logo_url: validatedLogoUrl || '',
          apply_url: validatedApplyUrl,
          package_tier: selectedTier.id === 'free' ? 'standard' : selectedTier.id,
          verified_employer_addon: false, bot_check: botCheck,
        },
      });
      if (submitError) throw new Error(submitError.message || 'Secure submission service unavailable.');
      if (!data?.submission?.reference_code) throw new Error(data?.error || 'No confirmation reference was returned.');
      const persistedReference = data.submission.reference_code as string;
      const approvalSnippet = JSON.stringify(stagedJob, null, 2);
      const emailMessageBody = [`PlanetAI submission ${persistedReference}`, `Company: ${cleanCompany}`, `Role: ${cleanTitle}`, approvalSnippet].join('\\n');
      try { window.localStorage.setItem(SUBMISSION_COOLDOWN_KEY, String(Date.now())); } catch { /* optional */ }
      setCooldownMs(SUBMISSION_COOLDOWN_MS);
      setPreviewActivated(false);
      setReceipt({
        referenceId: persistedReference, status: data.submission.status, verificationDelivery: data.email_verification_delivery || 'unknown', job: stagedJob,
        tier: selectedTier, addVerifiedBadge: false, totalDueUsd, approvalSnippet, emailMessageBody,
        submissionSaved: true, primaryPaypalUrl: null, secondaryAddonPaypalUrl: null,
      });
      resetFormFields();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to save your job submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-job-title"
    >
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-[#e2e8e1] bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4ee] border border-[#c1d2c4] text-[#47745c]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="add-job-title"
                className="font-display text-lg font-bold text-[#1d3028]"
              >
                Employer &amp; Recruiter Portal
              </h2>
              <p className="text-xs text-[#77847b]">
                Submit for review without an account · Existing employers can sign in
              </p>
            </div>
            <a href="/?experience=employer-auth" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#47745c] underline underline-offset-2 hover:text-[#285c4b]">Already have an employer workspace? Sign in <ArrowUpRight className="h-3 w-3" /></a>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Close post job modal"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-[#77847b] hover:text-[#25372e] hover:bg-[#e9eee8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Moderation & Launch Special Notices */}
        <div className="mt-4 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/35 px-3 py-1.5 text-xs font-medium text-sky-200">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span>Moderated Job Board — Reviewed before going live</span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-950/45 via-amber-900/20 to-cyan-950/30 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Tag className="w-4 h-4 text-amber-300 shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-amber-100">
                Free job posting for growing teams — no upfront fee
              </p>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-300 shrink-0">
              $0 TO SUBMIT
            </span>
          </div>
        </div>

        {/* Confirmation Receipt Screen (Shown after submit) */}
        {receipt ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[#c1d2c4] bg-emerald-950/25 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#1d3028]">
                    Submission Saved Successfully
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-[#65736b]">
                    Reference{' '}
                    <span className="font-mono font-semibold text-[#47745c]">
                      {receipt.referenceId}
                    </span>{' '}
                    has been securely saved. Current status: <strong className="text-[#25372e]">{receipt.status.replaceAll('_', ' ')}</strong>. Jobs do not publish until verification and moderation are complete.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77847b]">Company &amp; Role</span>
                  <span className="font-semibold text-[#25372e] text-right">
                    {receipt.job.company} — {receipt.job.title}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77847b]">Listing Tier</span>
                  <span className="font-medium text-[#47745c]">
                    {receipt.tier.name} ({receipt.tier.cadenceLabel})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77847b]">Employer verification</span>
                  <span className="font-medium text-[#40534a]">Separate review process</span>
                </div>
                <div className="pt-2 border-t border-[#e2e8e1] flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#40534a]">
                    Total Amount Due
                  </span>
                  <span className="font-mono text-base font-bold text-amber-300">
                    ${receipt.totalDueUsd} USD
                  </span>
                </div>
              </div>

              {receipt.totalDueUsd > 0 && (
                <div className="rounded-xl border border-[#c1d2c4] bg-[#eef4ee] p-3.5 text-xs leading-5 text-[#40534a]">
                  No payment is collected now. Your paid listing must pass moderation first. Once approved, sign in to your employer workspace and complete payment from Listings &amp; Payments.
                  <a href="/?experience=employer-payments" className="mt-3 inline-flex min-h-[38px] items-center justify-center rounded-lg bg-cyan-400 px-3.5 py-2 font-bold text-white hover:bg-cyan-300">Open Listings &amp; Payments</a>
                </div>
              )}

              {receipt.verificationDelivery === 'email_provider_not_configured' && receipt.status === 'email_verification_pending' && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 text-xs text-amber-200">
                  Your submission is saved, but guest email verification cannot be sent yet. We will enable this once the verification email service is configured. Please do not submit the same job again.
                </div>
              )}
              {!receipt.submissionSaved && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-2">
                  <p className="font-medium">
                    Web3Forms access key placeholder detected — use the 1-click Email Draft below to send your submission directly to {EMPLOYER_INBOX_EMAIL}:
                  </p>
                  <a
                    href={`mailto:${EMPLOYER_INBOX_EMAIL}?subject=${encodeURIComponent(
                      `[PlanetAI Job Submission] ${receipt.job.company} — ${receipt.job.title} ($${receipt.totalDueUsd} USD)`
                    )}&body=${encodeURIComponent(receipt.emailMessageBody)}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-amber-400 text-white text-xs font-bold hover:bg-amber-300 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Submission Email Now</span>
                  </a>
                </div>
              )}
            </div>

            {/* Temporary Local Preview & Copy Approval Snippet */}
            <div className="rounded-2xl border border-[#e2e8e1] bg-[#f4f6f2] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#40534a]">
                  Temporary Local Preview &amp; Moderator JSON
                </span>
                <button
                  type="button"
                  onClick={() => handleCopySnippet(receipt.approvalSnippet)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#47745c] hover:text-[#54806b]"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#47745c]">Copied JSON!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Approval JSON</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-[#77847b]">
                Want to see how your card looks in your own browser while waiting for review? Load a temporary local preview below (visible only to you).
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={previewActivated}
                  onClick={() => {
                    onPreviewLocalJob(receipt.job);
                    setPreviewActivated(true);
                  }}
                  className={`inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    previewActivated
                      ? 'border-[#c1d2c4] bg-emerald-950/40 text-[#47745c] cursor-default'
                      : 'border-[#d7e0d7] bg-[#f4f6f2] text-[#25372e] hover:border-[#a9bcae] hover:text-[#54806b]'
                  }`}
                >
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>
                    {previewActivated
                      ? 'Added to Your Local Feed Preview'
                      : 'Preview Card Locally (Temporary)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceipt(null)}
                  className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium text-[#65736b] hover:text-[#25372e] hover:bg-[#e9eee8] transition-colors"
                >
                  Back to Portal
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#e9eee8] text-[#25372e] text-xs font-semibold hover:bg-slate-700 transition-colors ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Portal Sub-Tabs (Submit Role vs Your Local Previews) */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#e2e8e1] bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setModalView('post')}
                className={`flex-1 min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                  modalView === 'post'
                    ? 'bg-[#183c32] text-white'
                    : 'text-[#65736b] hover:text-[#25372e]'
                }`}
              >
                Submit Company Role
              </button>
              <button
                type="button"
                onClick={() => setModalView('manage')}
                className={`flex-1 min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                  modalView === 'manage'
                    ? 'bg-[#183c32] text-white'
                    : 'text-[#65736b] hover:text-[#25372e]'
                }`}
              >
                Local Previews ({localPreviewJobs.length})
              </button>
            </div>

            {modalView === 'manage' ? (
              <div className="mt-4 space-y-3">
                {localPreviewJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#e2e8e1] bg-[#f4f6f2]/50 p-6 text-center">
                    <Building2 className="w-6 h-6 text-[#9aa49d] mx-auto" />
                    <p className="mt-2 text-sm font-medium text-[#40534a]">
                      No temporary local previews active
                    </p>
                    <p className="mt-1 text-xs text-[#77847b]">
                      Submitted roles are emailed for moderation first and never publish globally without review.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalView('post')}
                      className="mt-4 inline-flex items-center justify-center min-h-[40px] px-4 rounded-xl bg-[#183c32] text-white text-xs font-bold hover:bg-[#285c4b] transition-colors"
                    >
                      Submit a Company Role
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {localPreviewJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2]/70 p-3.5"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {job.companyLogoUrl ? (
                            <img
                              src={job.companyLogoUrl}
                              alt={`${job.company} logo`}
                              className="h-9 w-9 rounded-lg border border-[#d7e0d7] bg-slate-950 object-contain p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d7e0d7] bg-slate-950 font-display text-xs font-bold text-[#47745c]">
                              {job.companyShort}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-semibold text-[#25372e] truncate">
                                {job.title}
                              </p>
                              <span className="inline-flex items-center rounded border border-amber-500/35 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                                Custom Employer Post
                              </span>
                            </div>
                            <p className="text-xs text-[#77847b] mt-0.5">
                              {job.company} · {job.companyTier} ·{' '}
                              <span className="font-mono text-[#47745c]">
                                {formatPayRate(
                                  job.payMinUsd,
                                  job.payMaxUsd,
                                  job.payUnit
                                )}
                              </span>
                            </p>
                            <p className="text-[11px] text-[#9aa49d] truncate mt-1">
                              {job.companyWebsite || job.applyUrl}
                            </p>
                          </div>
                        </div>
                        {onDeleteLocalPreview && (
                          <button
                            type="button"
                            onClick={() => onDeleteLocalPreview(job.id)}
                            aria-label={`Remove ${job.title}`}
                            className="min-h-[40px] min-w-[40px] shrink-0 flex items-center justify-center rounded-lg border border-rose-500/30 bg-rose-950/30 text-rose-300 hover:bg-rose-950/60 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* Hidden Honeypot Anti-Bot Field */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="bot-check-field">Leave blank</label>
                  <input
                    id="bot-check-field"
                    name="bot_check"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={botCheck}
                    onChange={(e) => setBotCheck(e.target.value)}
                  />
                </div>

                {cooldownMs > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-200">
                    <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      Submission cooldown active: you can submit another role in{' '}
                      <strong className="font-mono">
                        {formatCooldown(cooldownMs)}
                      </strong>
                      .
                    </span>
                  </div>
                )}

                {/* 1. Monetized Pricing Tiers */}
                <div className="space-y-2.5">
                  <span className="block text-xs font-semibold text-[#40534a]">
                    1. Choose Listing Tier
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {LISTING_TIERS.map((tier) => {
                      const active = selectedTierId === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSelectedTierId(tier.id)}
                          disabled={tier.id === 'spotlight'}
                          aria-pressed={active}
                          className={`text-left rounded-xl border p-3 transition-all ${
                            active
                              ? tier.featured
                                ? 'border-amber-400 bg-amber-950/35 ring-1 ring-amber-400/50'
                                : 'border-[#54806b] bg-[#eef4ee] ring-1 ring-cyan-400/40'
                               : tier.id === 'spotlight' ? 'border-[#e2e8e1] bg-slate-950/40 opacity-55 cursor-not-allowed' : 'border-[#e2e8e1] bg-[#f4f6f2]/70 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-[#25372e] flex items-center gap-1">
                              {tier.featured && (
                                <Star className="w-3 h-3 fill-amber-300 text-amber-300 shrink-0" />
                              )}
                              <span>{tier.name}</span>
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-sm font-bold text-[#47745c]">
                            {tier.cadenceLabel}
                          </p>
                          <p className="mt-1 text-[11px] text-[#77847b] leading-snug">
                            {tier.id === 'spotlight' ? 'Coming soon — Marquee placement will be activated before this tier accepts payment.' : tier.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] leading-5 text-[#77847b]">Paid upgrades are charged only after your listing passes moderation. Featured and Spotlight require a signed-in employer workspace.</p>
                </div>

                {/* 2. Company & Role Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-company-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Your Company / Organization
                    </label>
                    <input
                      id="job-company-input"
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g., Acme AI Labs"
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="job-tier-select"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Partner / Company Type
                    </label>
                    <select
                      id="job-tier-select"
                      value={companyTier}
                      onChange={(e) =>
                        setCompanyTier(e.target.value as CompanyTier)
                      }
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    >
                      <option value="Custom Partner">Custom Partner</option>
                      <option value="Emerging AI Startup">
                        Emerging AI Startup
                      </option>
                      <option value="Established Leader">
                        Established Leader
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-website-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Company Website / Career Portal
                    </label>
                    <input
                      id="job-website-input"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://yourcompany.com/careers"
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="job-logo-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Company Logo URL (Optional)
                    </label>
                    <input
                      id="job-logo-input"
                      type="url"
                      value={companyLogoUrl}
                      onChange={(e) => setCompanyLogoUrl(e.target.value)}
                      placeholder="https://yourcompany.com/logo.png"
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="job-title-input"
                    className="block text-xs font-medium text-[#65736b] mb-1.5"
                  >
                    Job Title
                  </label>
                  <input
                    id="job-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Bilingual AI Prompt Evaluator"
                    className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-category-select"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Category
                    </label>
                    <select
                      id="job-category-select"
                      value={category}
                      onChange={(e) =>
                        setCategory(
                          e.target.value as Exclude<JobCategory, 'All'>
                        )
                      }
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    >
                      {VALID_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="job-worktype-select"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Work Arrangement
                    </label>
                    <select
                      id="job-worktype-select"
                      value={workType}
                      onChange={(e) =>
                        setWorkType(e.target.value as JobListing['workType'])
                      }
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    >
                      <option value="Async Contract">Async Contract</option>
                      <option value="Full-Time Remote">Full-Time Remote</option>
                      <option value="Part-Time Flexible">
                        Part-Time Flexible
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="job-paymin-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Min USD
                    </label>
                    <input
                      id="job-paymin-input"
                      type="number"
                      min={1}
                      required
                      value={payMin}
                      onChange={(e) => setPayMin(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3 py-2 font-mono text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-paymax-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Max USD
                    </label>
                    <input
                      id="job-paymax-input"
                      type="number"
                      min={1}
                      required
                      value={payMax}
                      onChange={(e) => setPayMax(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3 py-2 font-mono text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-payunit-select"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Cadence
                    </label>
                    <select
                      id="job-payunit-select"
                      value={payUnit}
                      onChange={(e) => setPayUnit(e.target.value as PayUnit)}
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    >
                      <option value="hr">/ hour</option>
                      <option value="yr">/ year</option>
                      <option value="project">/ task</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-url-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Direct Role Apply URL (https://)
                    </label>
                    <input
                      id="job-url-input"
                      type="url"
                      value={applyUrl}
                      onChange={(e) => setApplyUrl(e.target.value)}
                      placeholder="https://yourcompany.com/jobs/role"
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-contact-email"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Recruiter / Approval Email *
                    </label>
                    <input
                      id="job-contact-email"
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="hiring@yourcompany.com"
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-location-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Location
                    </label>
                    <input
                      id="job-location-input"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-tags-input"
                      className="block text-xs font-medium text-[#65736b] mb-1.5"
                    >
                      Skills / Tags (comma separated)
                    </label>
                    <input
                      id="job-tags-input"
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] focus:border-[#54806b] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="job-desc-input"
                    className="block text-xs font-medium text-[#65736b] mb-1.5"
                  >
                    Role &amp; Company Overview
                  </label>
                  <textarea
                    id="job-desc-input"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what your company builds and what the candidate will do..."
                    className="w-full rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2.5 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="job-req-input"
                    className="block text-xs font-medium text-[#65736b] mb-1.5"
                  >
                    Key Requirements (Optional, comma separated)
                  </label>
                  <input
                    id="job-req-input"
                    type="text"
                    value={requirementsInput}
                    onChange={(e) => setRequirementsInput(e.target.value)}
                    placeholder="e.g., 2+ yrs Python, Fluent English, Async availability"
                    className="w-full min-h-[44px] rounded-xl border border-[#d7e0d7] bg-[#f4f6f2] px-3.5 py-2 text-sm text-[#25372e] placeholder:text-[#9aa49d] focus:border-[#54806b] focus:outline-none"
                  />
                </div>

                {/* Mandatory No-Upfront-Fees Confirmation */}
                <label className="flex items-start gap-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2]/60 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={noUpfrontFeesChecked}
                    onChange={(e) => setNoUpfrontFeesChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-[#f4f6f2] text-cyan-500 focus:ring-[#54806b]"
                  />
                  <span className="text-xs text-[#65736b] leading-relaxed">
                    <strong className="text-[#25372e]">
                      No upfront fees charged to applicants.
                    </strong>{' '}
                    I confirm this role is genuine, uses official company https:// links, and complies with PlanetAI moderation rules.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {error}
                      {(error.toLowerCase().includes('employer account') || error.toLowerCase().includes('employer workspace')) && (
                        <a href="/?experience=employer-auth" className="ml-1 inline-flex font-bold text-[#47745c] underline underline-offset-2">
                          Sign in or create your free employer account
                        </a>
                      )}
                    </span>
                  </div>
                )}

                {/* Order Summary & Submit Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2] px-4 py-3">
                  <div>
                    <p className="text-[11px] text-[#77847b]">
                      {selectedTier.name}
                      {addVerifiedBadge ? ' + Verified Badge' : ''}
                    </p>
                    <p className="font-mono text-base font-bold text-[#47745c]">
                      Total Due: ${totalDueUsd} USD
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-[#65736b] hover:text-[#25372e] hover:bg-[#e9eee8] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || cooldownMs > 0}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-[#183c32] text-white text-sm font-bold hover:bg-[#285c4b] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting
                        ? 'Submitting...'
                        : `Submit ${selectedTier.name} for Review`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {/* Secondary Optional Hiring Partner Link */}
        <div className="mt-5 pt-4 border-t border-[#e2e8e1]/80">
          <a
            href="//https://company.micro1.ai/register/?referralCode=6b7ac363-af71-444b-97b2-ecc6dcc25f19&utm_source=referral&utm_medium=share&utm_campaign=job_referral"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-[#e2e8e1] bg-[#f4f6f2]/60 px-3.5 py-2.5 hover:border-[#c1d2c4] transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-[#47745c] shrink-0" />
              <p className="text-xs text-[#65736b] truncate">
                <span className="font-semibold text-[#25372e]">
                  Optional Partner:
                </span>{' '}
                Need pre-vetted AI talent fast? Explore micro1
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#47745c] shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
};
