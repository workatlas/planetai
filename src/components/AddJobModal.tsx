import React, {useEffect, useState} from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
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
const WEB3FORMS_ENDPOINT = 'https://web3forms.com';
const WEB3FORMS_ACCESS_KEY = '3b9ef417-e803-4adb-8e5a-a0dbd9ffb631';
const WEB3FORMS_ENDPOINT = 'https://web3forms.com';

const PAYPAL_LINKS = {
  featured: 'https://www.paypal.com/ncp/payment/W5G33ADWVLC9U',
  spotlight: 'https://www.paypal.com/ncp/payment/WT8YASEX3UGHJ',
  verifiedAddon: 'https://www.paypal.com/ncp/payment/LDUK8WPY4DCR4',
};


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

const VERIFIED_ADDON_PRICE_USD = 39;

interface SubmittedReceipt {
  referenceId: string;
  job: JobListing;
  tier: ListingTierOption;
  addVerifiedBadge: boolean;
  totalDueUsd: number;
  approvalSnippet: string;
  emailMessageBody: string;
  emailSentViaWeb3Forms: boolean;
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
    useState<ListingTierId>('featured');
  const [addVerifiedBadge, setAddVerifiedBadge] = useState(false);

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
    selectedTier.priceUsd + (addVerifiedBadge ? VERIFIED_ADDON_PRICE_USD : 0);

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

    const referenceId = `PAI-${Date.now().toString(36).toUpperCase()}`;

    const stagedJob: JobListing = {
      id: `custom-${Date.now()}`,
      title: cleanTitle,
      company: cleanCompany,
      companyShort: short || 'CO',
      companyTier,
      companyWebsite: validatedWebsite,
      companyLogoUrl: validatedLogoUrl,
      isCustomEmployerPost: true,
      featured: selectedTier.featured,
      verified: addVerifiedBadge,
      marqueeSpotlight: selectedTier.marqueeSpotlight,
      category,
      payMinUsd: min,
      payMaxUsd: max,
      payUnit,
      location: cleanLocation,
      workType,
      postedAgo: 'Just now',
      urgent: selectedTier.featured,
      tags: tags.length > 0 ? tags : [category, 'Remote'],
      applyUrl: validatedApplyUrl,
      contactEmail: cleanEmail,
      description:
        cleanDescription ||
        `Remote ${category} role at ${cleanCompany} (${workType}). Apply directly via ${cleanCompany}'s career portal.`,
      requirements:
        parsedRequirements.length > 0
          ? parsedRequirements
          : [
              'Reliable internet connection and desktop workspace',
              'Strong written communication and analytical accuracy',
            ],
      prepTips: [
        'Use the Tailor Resume shortcut inside this modal before clicking Apply Now.',
      ],
    };

    const approvalSnippet = JSON.stringify(stagedJob, null, 2);
    const payRateLabel = formatPayRate(min, max, payUnit);
    const emailMessageBody = [
      `PlanetAI Employer Submission (${referenceId})`,
      `==================================================`,
      `Selected Tier: ${selectedTier.name} (${selectedTier.cadenceLabel})`,
      `Verified Employer Badge (+$${VERIFIED_ADDON_PRICE_USD}): ${
        addVerifiedBadge ? 'YES (+$39 one-time)' : 'No'
      }`,
      `Total Amount Due: $${totalDueUsd} USD`,
      `--------------------------------------------------`,
      `Company: ${cleanCompany} (${companyTier})`,
      `Role Title: ${cleanTitle}`,
      `Category: ${category} | Work Type: ${workType}`,
      `Pay Rate (USD): ${payRateLabel}`,
      `Location: ${cleanLocation}`,
      `Recruiter Email: ${cleanEmail}`,
      `Company Website / Career Portal: ${validatedWebsite || 'Not provided'}`,
      `Company Logo URL: ${validatedLogoUrl || 'Not provided'}`,
      `Direct Apply URL: ${validatedApplyUrl}`,
      `No Upfront Fees Confirmed: YES`,
      ``,
      `READY-TO-PASTE APPROVAL OBJECT (Copy into INITIAL_JOBS in src/data/jobs.ts):`,
      `--------------------------------------------------`,
      approvalSnippet,
    ].join('\n');

    // Determine PayPal checkout link(s)
    let primaryPaypalUrl: string | null = null;
    let secondaryAddonPaypalUrl: string | null = null;
    if (selectedTier.id === 'featured') {
      primaryPaypalUrl = PAYPAL_LINKS.featured;
      if (addVerifiedBadge) {
        secondaryAddonPaypalUrl = PAYPAL_LINKS.verifiedAddon;
      }
    } else if (selectedTier.id === 'spotlight') {
      primaryPaypalUrl = PAYPAL_LINKS.spotlight;
      if (addVerifiedBadge) {
        secondaryAddonPaypalUrl = PAYPAL_LINKS.verifiedAddon;
      }
    } else if (addVerifiedBadge) {
      primaryPaypalUrl = PAYPAL_LINKS.verifiedAddon;
    }

    setIsSubmitting(true);
    let emailSentViaWeb3Forms = false;

    try {
      if (
        WEB3FORMS_ACCESS_KEY &&
        WEB3FORMS_ACCESS_KEY !== 'YOUR_WEB3FORMS_ACCESS_KEY'
      ) {
        const response = await fetch(WEB3FORMS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            access_key: WEB3FORMS_ACCESS_KEY,
            to: EMPLOYER_INBOX_EMAIL,
            replyto: cleanEmail,
            from_name: `${cleanCompany} via PlanetAI Employer Portal`,
            subject: `[PlanetAI Job Submission] ${cleanCompany} — ${cleanTitle} ($${totalDueUsd} USD)`,
            reference_id: referenceId,
            listing_tier: selectedTier.name,
            verified_addon: addVerifiedBadge ? 'Yes (+$39)' : 'No',
            total_due_usd: `$${totalDueUsd}`,
            company_website: validatedWebsite || '',
            company_logo_url: validatedLogoUrl || '',
            apply_url: validatedApplyUrl,
            message: emailMessageBody,
          }),
        });
        const data = (await response.json()) as {success?: boolean};
        if (!response.ok || !data.success) {
          setError(
            'Unable to deliver submission via Web3Forms right now. Please try again or use the email fallback.'
          );
          setIsSubmitting(false);
          return;
        }
        emailSentViaWeb3Forms = true;
      }

      // Record 15-minute cooldown in localStorage
      try {
        window.localStorage.setItem(
          SUBMISSION_COOLDOWN_KEY,
          String(Date.now())
        );
      } catch {
        // Ignore storage errors
      }
      setCooldownMs(SUBMISSION_COOLDOWN_MS);
      setPreviewActivated(false);
      setReceipt({
        referenceId,
        job: stagedJob,
        tier: selectedTier,
        addVerifiedBadge,
        totalDueUsd,
        approvalSnippet,
        emailMessageBody,
        emailSentViaWeb3Forms,
        primaryPaypalUrl,
        secondaryAddonPaypalUrl,
      });
      resetFormFields();
    } catch {
      setError(
        'Network error while sending submission. Please check your connection and try again.'
      );
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
      <div className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-800 bg-[#111827] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="add-job-title"
                className="font-display text-lg font-bold text-slate-50"
              >
                Employer &amp; Recruiter Portal
              </h2>
              <p className="text-xs text-slate-400">
                Submit your company role for manual approval — zero account needed
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Close post job modal"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
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
                Launch Special: 50% Off Featured Listings
              </p>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-300 shrink-0">
              FROM $49
            </span>
          </div>
        </div>

        {/* Confirmation Receipt Screen (Shown after submit) */}
        {receipt ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base font-bold text-slate-50">
                    Submission Received for Manual Review
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300">
                    Reference{' '}
                    <span className="font-mono font-semibold text-cyan-300">
                      {receipt.referenceId}
                    </span>{' '}
                    has been staged for moderation at{' '}
                    <span className="font-medium text-slate-100">
                      {EMPLOYER_INBOX_EMAIL}
                    </span>
                    . Jobs do not publish globally until reviewed and approved.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0B111E] p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Company &amp; Role</span>
                  <span className="font-semibold text-slate-100 text-right">
                    {receipt.job.company} — {receipt.job.title}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Listing Tier</span>
                  <span className="font-medium text-cyan-300">
                    {receipt.tier.name} ({receipt.tier.cadenceLabel})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Verified Badge Add-On</span>
                  <span className="font-medium text-slate-200">
                    {receipt.addVerifiedBadge
                      ? `Included (+$${VERIFIED_ADDON_PRICE_USD})`
                      : 'Not selected'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200">
                    Total Amount Due
                  </span>
                  <span className="font-mono text-base font-bold text-amber-300">
                    ${receipt.totalDueUsd} USD
                  </span>
                </div>
              </div>

              {!receipt.emailSentViaWeb3Forms && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-2">
                  <p className="font-medium">
                    Web3Forms access key placeholder detected — use the 1-click Email Draft below to send your submission directly to {EMPLOYER_INBOX_EMAIL}:
                  </p>
                  <a
                    href={`mailto:${EMPLOYER_INBOX_EMAIL}?subject=${encodeURIComponent(
                      `[PlanetAI Job Submission] ${receipt.job.company} — ${receipt.job.title} ($${receipt.totalDueUsd} USD)`
                    )}&body=${encodeURIComponent(receipt.emailMessageBody)}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Submission Email Now</span>
                  </a>
                </div>
              )}
            </div>

            {/* PayPal Checkout Links for Paid Selections */}
            {receipt.totalDueUsd > 0 && receipt.primaryPaypalUrl && (
              <div className="rounded-2xl border border-cyan-500/35 bg-cyan-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                  <CreditCard className="w-4 h-4 text-cyan-300 shrink-0" />
                  <span>Complete Payment via PayPal Checkout</span>
                </div>
                <p className="text-xs text-slate-300">
                  Complete your ${receipt.totalDueUsd} USD payment via PayPal so we can prioritize your approval and apply your Featured / Verified badges.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                  <a
                    href={receipt.primaryPaypalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 transition-colors"
                  >
                    <span>
                      Re-open PayPal Checkout ({receipt.tier.id === 'free' ? `$${VERIFIED_ADDON_PRICE_USD}` : `$${receipt.tier.priceUsd}`})
                    </span>
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                  </a>
                  {receipt.secondaryAddonPaypalUrl && (
                    <a
                      href={receipt.secondaryAddonPaypalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-emerald-500/45 bg-emerald-950/40 text-emerald-200 text-xs sm:text-sm font-semibold hover:bg-emerald-950/70 transition-colors"
                    >
                      <span>Pay Verified Add-On (+${VERIFIED_ADDON_PRICE_USD})</span>
                      <ArrowUpRight className="w-4 h-4 shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Temporary Local Preview & Copy Approval Snippet */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B111E] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Temporary Local Preview &amp; Moderator JSON
                </span>
                <button
                  type="button"
                  onClick={() => handleCopySnippet(receipt.approvalSnippet)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied JSON!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Approval JSON</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">
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
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 cursor-default'
                      : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-500/50 hover:text-cyan-200'
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
                  className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                >
                  Back to Portal
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 text-slate-100 text-xs font-semibold hover:bg-slate-700 transition-colors ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Portal Sub-Tabs (Submit Role vs Your Local Previews) */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setModalView('post')}
                className={`flex-1 min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                  modalView === 'post'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                Submit Company Role
              </button>
              <button
                type="button"
                onClick={() => setModalView('manage')}
                className={`flex-1 min-h-[38px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                  modalView === 'manage'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-slate-100'
                }`}
              >
                Local Previews ({localPreviewJobs.length})
              </button>
            </div>

            {modalView === 'manage' ? (
              <div className="mt-4 space-y-3">
                {localPreviewJobs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center">
                    <Building2 className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="mt-2 text-sm font-medium text-slate-200">
                      No temporary local previews active
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted roles are emailed for moderation first and never publish globally without review.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalView('post')}
                      className="mt-4 inline-flex items-center justify-center min-h-[40px] px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                    >
                      Submit a Company Role
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {localPreviewJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3.5"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {job.companyLogoUrl ? (
                            <img
                              src={job.companyLogoUrl}
                              alt={`${job.company} logo`}
                              className="h-9 w-9 rounded-lg border border-slate-700 bg-slate-950 object-contain p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 font-display text-xs font-bold text-cyan-300">
                              {job.companyShort}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-100 truncate">
                                {job.title}
                              </p>
                              <span className="inline-flex items-center rounded border border-amber-500/35 bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                                Custom Employer Post
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {job.company} · {job.companyTier} ·{' '}
                              <span className="font-mono text-cyan-300">
                                {formatPayRate(
                                  job.payMinUsd,
                                  job.payMaxUsd,
                                  job.payUnit
                                )}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-1">
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
                  <span className="block text-xs font-semibold text-slate-200">
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
                          aria-pressed={active}
                          className={`text-left rounded-xl border p-3 transition-all ${
                            active
                              ? tier.featured
                                ? 'border-amber-400 bg-amber-950/35 ring-1 ring-amber-400/50'
                                : 'border-cyan-400 bg-cyan-950/35 ring-1 ring-cyan-400/40'
                              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                              {tier.featured && (
                                <Star className="w-3 h-3 fill-amber-300 text-amber-300 shrink-0" />
                              )}
                              <span>{tier.name}</span>
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-sm font-bold text-cyan-300">
                            {tier.cadenceLabel}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                            {tier.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Verified Employer Add-On Checkbox */}
                  <label className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 cursor-pointer hover:border-emerald-400/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={addVerifiedBadge}
                      onChange={(e) => setAddVerifiedBadge(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                    />
                    <span className="text-xs text-slate-200 leading-relaxed">
                      <strong className="text-emerald-300">
                        ✓ Add Verified Employer Badge (+${VERIFIED_ADDON_PRICE_USD} one-time)
                      </strong>{' '}
                      — Permanent verification checkmark on your company and all active listings.
                    </span>
                  </label>
                </div>

                {/* 2. Company & Role Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-company-input"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="job-tier-select"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Partner / Company Type
                    </label>
                    <select
                      id="job-tier-select"
                      value={companyTier}
                      onChange={(e) =>
                        setCompanyTier(e.target.value as CompanyTier)
                      }
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
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
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Company Website / Career Portal
                    </label>
                    <input
                      id="job-website-input"
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://yourcompany.com/careers"
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="job-logo-input"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Company Logo URL (Optional)
                    </label>
                    <input
                      id="job-logo-input"
                      type="url"
                      value={companyLogoUrl}
                      onChange={(e) => setCompanyLogoUrl(e.target.value)}
                      placeholder="https://yourcompany.com/logo.png"
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="job-title-input"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
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
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-category-select"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
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
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Work Arrangement
                    </label>
                    <select
                      id="job-worktype-select"
                      value={workType}
                      onChange={(e) =>
                        setWorkType(e.target.value as JobListing['workType'])
                      }
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
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
                      className="block text-xs font-medium text-slate-300 mb-1.5"
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-paymax-input"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-payunit-select"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Cadence
                    </label>
                    <select
                      id="job-payunit-select"
                      value={payUnit}
                      onChange={(e) => setPayUnit(e.target.value as PayUnit)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
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
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Direct Role Apply URL (https://)
                    </label>
                    <input
                      id="job-url-input"
                      type="url"
                      value={applyUrl}
                      onChange={(e) => setApplyUrl(e.target.value)}
                      placeholder="https://yourcompany.com/jobs/role"
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-contact-email"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
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
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="job-location-input"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Location
                    </label>
                    <input
                      id="job-location-input"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="job-tags-input"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Skills / Tags (comma separated)
                    </label>
                    <input
                      id="job-tags-input"
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="job-desc-input"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Role &amp; Company Overview
                  </label>
                  <textarea
                    id="job-desc-input"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what your company builds and what the candidate will do..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="job-req-input"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Key Requirements (Optional, comma separated)
                  </label>
                  <input
                    id="job-req-input"
                    type="text"
                    value={requirementsInput}
                    onChange={(e) => setRequirementsInput(e.target.value)}
                    placeholder="e.g., 2+ yrs Python, Fluent English, Async availability"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                {/* Mandatory No-Upfront-Fees Confirmation */}
                <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={noUpfrontFeesChecked}
                    onChange={(e) => setNoUpfrontFeesChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-slate-100">
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
                    <span>{error}</span>
                  </div>
                )}

                {/* Order Summary & Submit Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B111E] px-4 py-3">
                  <div>
                    <p className="text-[11px] text-slate-400">
                      {selectedTier.name}
                      {addVerifiedBadge ? ' + Verified Badge' : ''}
                    </p>
                    <p className="font-mono text-base font-bold text-cyan-300">
                      Total Due: ${totalDueUsd} USD
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || cooldownMs > 0}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSubmitting
                        ? 'Submitting...'
                        : totalDueUsd > 0
                          ? `Submit & Checkout ($${totalDueUsd})`
                          : 'Submit for Free Review'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {/* Secondary Optional Hiring Partner Link */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <a
            href="//https://company.micro1.ai/register/?referralCode=6b7ac363-af71-444b-97b2-ecc6dcc25f19&utm_source=referral&utm_medium=share&utm_campaign=job_referral"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 hover:border-cyan-500/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
              <p className="text-xs text-slate-300 truncate">
                <span className="font-semibold text-slate-100">
                  Optional Partner:
                </span>{' '}
                Need pre-vetted AI talent fast? Explore micro1
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-cyan-300 shrink-0" />
          </a>
        </div>
      </div>
    </div>
  );
};
