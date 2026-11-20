import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import PremiumMarketplacePreview from './preview/PremiumMarketplacePreview';
import AdminDashboardPreview from './preview/AdminDashboardPreview';
import ToolkitPreview from './preview/ToolkitPreview';
import {
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Globe2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {AddJobModal} from './components/AddJobModal';
import {EmployerEntryModal} from './components/EmployerEntryModal';
import EmployerAuth from './preview/EmployerAuth';
import EmployerProfile from './preview/EmployerProfile';
import EmployerPayments from './preview/EmployerPayments';
import AdminModeration from './preview/AdminModeration';
import JobSeekerAuth from './preview/JobSeekerAuth';
import JobSeekerDashboard from './preview/JobSeekerDashboard';
import {
  AIToolsView,
  RequestedAITool,
  TailoredResumeDraft,
} from './components/AIToolsView';
import {CareerWorkspaceHub} from './components/CareerWorkspaceHub';
import {AppReadinessView} from './components/AppReadinessView';
import {AppTab, Header} from './components/Header';
import {
  ApplicationStatus,
  AppliedRecord,
  CompanyLogo,
  JobCard,
} from './components/JobCard';
import {JobDetailModal} from './components/JobDetailModal';
import {MobileBottomNav} from './components/MobileBottomNav';
import {NewsDevToolsView} from './components/NewsDevToolsView';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PlatformsView} from './components/PlatformsView';
import {PrivacyTermsModal} from './components/PrivacyTermsModal';
import {
  CompanyTier,
  formatPayRate,
  INITIAL_JOBS,
  JOB_CATEGORIES,
  JobCategory,
  JobListing,
  resolveApplyUrl,
} from './data/jobs';
import {
  computeSkillMatch,
  parseUserSkills,
  QUICK_SKILL_SUGGESTIONS,
} from './utils/careerIntel';
import {sanitizeText, validateHttpsUrl} from './utils/sanitize';
import {syncSeoMetadata} from './utils/seo';
import {supabase} from './lib/supabase';
import {PWAInstallProvider} from './hooks/usePWAInstall';

function mapPublishedDatabaseJob(row: {
  id: string; job_title: string; company_name: string; company_website: string | null;
  company_logo_url: string | null; category: string; employment_type: string;
  location: string; salary_min: number | string | null; salary_max: number | string | null;
  pay_period: string | null; description: string; requirements: string[] | null;
  tags: string[] | null; apply_url: string; featured: boolean; verified_employer: boolean;
  published_at: string;
  spotlight_active?: boolean;
}): JobListing {
  const category = JOB_CATEGORIES.includes(row.category as JobCategory) && row.category !== 'All'
    ? row.category as Exclude<JobCategory, 'All'> : 'Remote';
  const workType: JobListing['workType'] = row.employment_type === 'Full-Time Remote' ||
    row.employment_type === 'Part-Time Flexible' ? row.employment_type : 'Async Contract';
  const payUnit: JobListing['payUnit'] = row.pay_period === 'yr' || row.pay_period === 'project'
    ? row.pay_period : 'hr';
  const initials = row.company_name.trim().split(/\s+/).map(part => part[0] || '').join('').slice(0, 2).toUpperCase();
  const publishedDate = new Date(row.published_at);
  const ageDays = Number.isNaN(publishedDate.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - publishedDate.getTime()) / 86400000));
  return {
    id: `database-${row.id}`,
    title: row.job_title,
    company: row.company_name,
    companyShort: initials || 'PA',
    companyTier: 'Custom Partner',
    companyWebsite: row.company_website || undefined,
    companyLogoUrl: row.company_logo_url || undefined,
    isCustomEmployerPost: true,
    featured: Boolean(row.featured),
    verified: Boolean(row.verified_employer),
    marqueeSpotlight: Boolean(row.spotlight_active),
    category,
    payMinUsd: Number(row.salary_min || 0),
    payMaxUsd: Number(row.salary_max || 0),
    payUnit,
    location: row.location,
    workType,
    postedAgo: ageDays === 0 ? 'Today' : ageDays === 1 ? '1 day ago' : `${ageDays} days ago`,
    tags: Array.isArray(row.tags) ? row.tags : [],
    applyUrl: row.apply_url,
    description: row.description,
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    prepTips: [],
  };
}

async function fetchPublishedDatabaseJobs(): Promise<JobListing[]> {
  const baseQuery = supabase.from('jobs');
  const spotlightResult = await baseQuery
    .select('id, job_title, company_name, company_website, company_logo_url, category, employment_type, location, salary_min, salary_max, pay_period, description, requirements, tags, apply_url, featured, verified_employer, published_at, spotlight_active')
    .eq('status', 'published')
    .gt('expires_at', new Date().toISOString())
    .order('spotlight_active', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(100);
  if (!spotlightResult.error) {
    return (spotlightResult.data || []).map(row => mapPublishedDatabaseJob(row));
  }

  // Keep the existing preview usable before the Spotlight migration is
  // applied. Once the column exists, active paid placements sort first.
  const fallback = await supabase.from('jobs')
    .select('id, job_title, company_name, company_website, company_logo_url, category, employment_type, location, salary_min, salary_max, pay_period, description, requirements, tags, apply_url, featured, verified_employer, published_at')
    .eq('status', 'published')
    .gt('expires_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(100);
  if (fallback.error) throw fallback.error;
  return (fallback.data || []).map(row => mapPublishedDatabaseJob(row));
}

type SortOption = 'newest' | 'highest-pay' | 'urgent' | 'alphabetical';
type TierFilter = 'All' | CompanyTier;
type PayTierFilter = 'all' | '25plus' | '50plus' | 'annual';
type SavedSubTab = 'saved' | 'applied';

const STORAGE_KEYS = {
  SAVED: 'planetai_saved_jobs',
  APPLIED: 'planetai_applied_jobs_v1',
  CUSTOM_JOBS: 'planetai_custom_jobs_v1',
  SKILLS: 'planetai_user_skills_v1',
};

const PARTNER_SPOTLIGHT_COMPANIES = [
  'micro1',
  'Mercor',
  'Babel Audio',
  'Visora',
  'Spout',
];

const JOBS_PER_PAGE = 24;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function hydrateCustomJobs(): JobListing[] {
  const stored = readStorage<JobListing[]>(STORAGE_KEYS.CUSTOM_JOBS, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (item) =>
        item &&
        typeof item.title === 'string' &&
        typeof item.company === 'string' &&
        Boolean(validateHttpsUrl(item.applyUrl))
    )
    .map((item) => {
      const validTier: CompanyTier =
        item.companyTier === 'Established Leader' ||
        item.companyTier === 'Emerging AI Startup' ||
        item.companyTier === 'Custom Partner'
          ? item.companyTier
          : 'Custom Partner';
      const validWebsite = item.companyWebsite
        ? validateHttpsUrl(item.companyWebsite) || undefined
        : undefined;
      const validLogo = item.companyLogoUrl
        ? validateHttpsUrl(item.companyLogoUrl) || undefined
        : undefined;

      return {
        ...item,
        title: sanitizeText(item.title, 120),
        company: sanitizeText(item.company, 80),
        companyTier: validTier,
        companyWebsite: validWebsite,
        companyLogoUrl: validLogo,
        isCustomEmployerPost: true,
        featured: Boolean(item.featured),
        verified: Boolean(item.verified),
        marqueeSpotlight: Boolean(item.marqueeSpotlight),
        description: sanitizeText(item.description || '', 400),
        location: sanitizeText(item.location || 'Worldwide Remote', 80),
        applyUrl: validateHttpsUrl(item.applyUrl) as string,
      };
    });
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    return requestedTab === 'ai-tools' || requestedTab === 'news' || requestedTab === 'saved' || requestedTab === 'platforms' || requestedTab === 'app'
      ? requestedTab
      : 'jobs';
  });
  const [isCareerToolsOpen, setIsCareerToolsOpen] = useState(() => new URLSearchParams(window.location.search).get('experience') === 'career-tools');
  const [savedSubTab, setSavedSubTab] = useState<SavedSubTab>('saved');
  const [customJobs, setCustomJobs] = useState<JobListing[]>(hydrateCustomJobs);
  const [databaseJobs, setDatabaseJobs] = useState<JobListing[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.SAVED, readStorage<string[]>('planetai_saved_jobs_v1', []))
  );
  const [appliedRecords, setAppliedRecords] = useState<
    Record<string, AppliedRecord>
  >(() => readStorage<Record<string, AppliedRecord>>(STORAGE_KEYS.APPLIED, {}));
  const [userSkills, setUserSkills] = useState<string>(() =>
    readStorage<string>(STORAGE_KEYS.SKILLS, '')
  );
  const [isSkillsEditorOpen, setIsSkillsEditorOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory>('All');
  const [selectedTier, setSelectedTier] = useState<TierFilter>('All');
  const [selectedPayTier, setSelectedPayTier] = useState<PayTierFilter>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [visibleCount, setVisibleCount] = useState<number>(JOBS_PER_PAGE);
  const [isFiltersBarOpen, setIsFiltersBarOpen] = useState(false);

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [isEmployerEntryOpen, setIsEmployerEntryOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [inspectedJob, setInspectedJob] = useState<JobListing | null>(null);
  const [tailoredDraft, setTailoredDraft] =
    useState<TailoredResumeDraft | null>(null);
  const [requestedAITool, setRequestedAITool] =
    useState<RequestedAITool | null>(null);

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastJobsSyncAt, setLastJobsSyncAt] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);

  const refreshPublishedJobs = useCallback(async (): Promise<JobListing[] | null> => {
    if (refreshInFlightRef.current) return null;
    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    try {
      const publishedJobs = await fetchPublishedDatabaseJobs();
      setDatabaseJobs(publishedJobs);
      setLastJobsSyncAt(new Date().toISOString());
      return publishedJobs;
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const syncPublishedJobs = async () => {
      if (!active || document.visibilityState !== 'visible') return;
      try {
        await refreshPublishedJobs();
      } catch (error) {
        console.warn('Published PLANETAI listings could not be refreshed.', error);
      }
    };
    void syncPublishedJobs();
    const interval = window.setInterval(syncPublishedJobs, 5 * 60 * 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncPublishedJobs();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshPublishedJobs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.CUSTOM_JOBS,
        JSON.stringify(customJobs)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [customJobs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(savedIds));
      window.localStorage.setItem('planetai_saved_jobs_v1', JSON.stringify(savedIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.APPLIED,
        JSON.stringify(appliedRecords)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [appliedRecords]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.SKILLS,
        JSON.stringify(userSkills)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [userSkills]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const allJobs = useMemo(
    () => [...databaseJobs, ...customJobs, ...INITIAL_JOBS],
    [databaseJobs, customJobs]
  );

  // Open deep-linked role on initial load if ?job=<id> is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (jobId) {
      const target = allJobs.find((j) => j.id === jobId);
      if (target) {
        setInspectedJob(target);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Schema.org JobPosting JSON-LD, canonical URL & ?job= query state
  useEffect(() => {
    syncSeoMetadata(allJobs, inspectedJob);
    try {
      const url = new URL(window.location.href);
      if (inspectedJob) {
        url.searchParams.set('job', inspectedJob.id);
      } else {
        url.searchParams.delete('job');
      }
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {
      // Ignore history API restrictions
    }
  }, [allJobs, inspectedJob]);

  const spotlightJobs = useMemo(() => {
    return PARTNER_SPOTLIGHT_COMPANIES.map((partner) =>
      allJobs.find(
        (j) =>
          j.company.toLowerCase() === partner.toLowerCase() && Boolean(j.urgent)
      )
    ).filter((j): j is JobListing => Boolean(j));
  }, [allJobs]);

  const categoryCounts = useMemo(() => {
    const counts: Record<JobCategory, number> = {
      All: allJobs.length,
      'AI Training': 0,
      'Audio/Voice': 0,
      Coding: 0,
      'Data Annotation': 0,
      Remote: 0,
    };
    for (const job of allJobs) {
      counts[job.category] += 1;
    }
    return counts;
  }, [allJobs]);

  const tierCounts = useMemo(() => {
    let established = 0;
    let emerging = 0;
    let customPartner = 0;
    for (const job of allJobs) {
      if (job.companyTier === 'Established Leader') {
        established += 1;
      } else if (job.companyTier === 'Custom Partner') {
        customPartner += 1;
      } else {
        emerging += 1;
      }
    }
    return {established, emerging, customPartner};
  }, [allJobs]);

  const filteredJobs = useMemo(() => {
    const q = sanitizeText(searchQuery, 120).toLowerCase();
    const list = allJobs.filter((job) => {
      if (selectedCategory !== 'All' && job.category !== selectedCategory) {
        return false;
      }
      if (selectedTier !== 'All' && job.companyTier !== selectedTier) {
        return false;
      }
      if (selectedPayTier === '25plus') {
        if (job.payUnit === 'yr' || job.payMaxUsd < 25) return false;
      } else if (selectedPayTier === '50plus') {
        if (job.payUnit === 'yr' || job.payMaxUsd < 50) return false;
      } else if (selectedPayTier === 'annual') {
        if (job.payUnit !== 'yr') return false;
      }
      if (
        selectedPlatform &&
        !job.company.toLowerCase().includes(selectedPlatform.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      return (
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.companyTier.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'highest-pay') {
      return [...list].sort((a, b) => {
        const aHourly = a.payUnit === 'yr' ? a.payMaxUsd / 2000 : a.payMaxUsd;
        const bHourly = b.payUnit === 'yr' ? b.payMaxUsd / 2000 : b.payMaxUsd;
        return bHourly - aHourly;
      });
    }
    if (sortBy === 'urgent') {
      return [...list].sort(
        (a, b) =>
          Number(Boolean(b.isCustomEmployerPost && b.featured)) -
            Number(Boolean(a.isCustomEmployerPost && a.featured)) ||
          Number(Boolean(b.isCustomEmployerPost && b.urgent)) -
            Number(Boolean(a.isCustomEmployerPost && a.urgent))
      );
    }
    if (sortBy === 'alphabetical') {
      return [...list].sort(
        (a, b) =>
          a.company.localeCompare(b.company, undefined, {
            sensitivity: 'base',
          }) ||
          a.title.localeCompare(b.title, undefined, {sensitivity: 'base'})
      );
    }
    return [...list].sort(
      (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
    );
  }, [
    allJobs,
    searchQuery,
    selectedCategory,
    selectedTier,
    selectedPayTier,
    selectedPlatform,
    sortBy,
  ]);

  useEffect(() => {
    setVisibleCount(JOBS_PER_PAGE);
  }, [
    searchQuery,
    selectedCategory,
    selectedTier,
    selectedPayTier,
    selectedPlatform,
    sortBy,
  ]);

  const visibleJobs = useMemo(
    () => filteredJobs.slice(0, visibleCount),
    [filteredJobs, visibleCount]
  );

  const savedJobs = useMemo(
    () => allJobs.filter((job) => savedIds.includes(job.id)),
    [allJobs, savedIds]
  );

  const appliedJobsList = useMemo(
    () =>
      allJobs
        .filter((job) => Boolean(appliedRecords[job.id]))
        .map((job) => ({job, record: appliedRecords[job.id]})),
    [allJobs, appliedRecords]
  );

  const toggleSaveJob = (id: string) => {
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      showToast(
        exists ? 'Removed from Saved jobs.' : 'Saved to your Saved tab.'
      );
      return exists ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleUpsertApplied = (
    jobId: string,
    status: ApplicationStatus,
    note: string
  ) => {
    setAppliedRecords((prev) => ({
      ...prev,
      [jobId]: {
        jobId,
        status,
        note: sanitizeText(note, 200),
        updatedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      },
    }));
    showToast(`Tracker updated: ${status}`);
  };

  const handleRemoveApplied = (jobId: string) => {
    setAppliedRecords((prev) => {
      const next = {...prev};
      delete next[jobId];
      return next;
    });
    showToast('Removed from Applied Tracker.');
  };

  const handleExportTracker = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      savedJobs: savedJobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        pay: j.isCustomEmployerPost ? formatPayRate(j.payMinUsd, j.payMaxUsd, j.payUnit) : 'Not listed — confirm with employer',
        applyUrl: resolveApplyUrl(j.company, j.applyUrl),
      })),
      appliedTracker: appliedJobsList.map(({job, record}) => ({
        title: job.title,
        company: job.company,
        status: record.status,
        note: record.note,
        updatedAt: record.updatedAt,
        applyUrl: resolveApplyUrl(job.company, job.applyUrl),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planetai-job-tracker.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported Saved & Applied tracker JSON.');
  };

  const handleTailorResumeForJob = (job: JobListing) => {
    setTailoredDraft({
      role: job.title,
      company: job.company,
      skills: job.tags.join(', '),
      description: job.description,
      nonce: Date.now(),
    });
    setInspectedJob(null);
    setActiveTab('ai-tools');
    window.scrollTo({top: 0, behavior: 'smooth'});
    showToast(`Loaded "${job.title}" into Resume Builder.`);
  };

  const handleLaunchPrepTool = (tool: 'voice' | 'learning', job: JobListing) => {
    setRequestedAITool({
      tool,
      nonce: Date.now(),
      role: job.title,
      company: job.company,
      skills: job.tags.join(', '),
      description: job.description,
    });
    setInspectedJob(null);
    setActiveTab('ai-tools');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleRefreshFeed = async () => {
    try {
      const publishedJobs = await refreshPublishedJobs();
      if (!publishedJobs) {
        showToast('A job-feed refresh is already in progress.');
        return;
      }
      showToast(`Employer listings refreshed — ${publishedJobs.length} published roles checked.`);
    } catch {
      showToast('Feed refresh failed. Showing the latest available listings.');
    }
  };

  const handleShareApp = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PLANETAI | Global Careers',
          text: 'Discover global career opportunities with PLANETAI.',
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    let didCopy = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        didCopy = true;
      } catch {
        didCopy = false;
      }
    }

    if (!didCopy) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        didCopy = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        didCopy = false;
      }
    }

    setCopied(true);
    showToast('Copied! PlanetAI app link copied to clipboard.');
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleSelectPlatformFromTicker = (platform: string) => {
    setActiveTab('jobs');
    setSelectedPlatform(platform);
    setSelectedCategory('All');
    setSelectedTier('All');
    setSelectedPayTier('all');
    setSearchQuery('');
  };

  const handleOpenPostJob = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) {
      // The server verifies actual employer membership; user-editable metadata
      // must never be used as the authorization source.
      setIsAddJobOpen(true);
      return;
    }
    setIsEmployerEntryOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedTier('All');
    setSelectedPayTier('all');
    setSelectedPlatform('');
    setSortBy('newest');
  };

  const handlePreviewLocalJob = (newJob: JobListing) => {
    setCustomJobs((prev) => [
      newJob,
      ...prev.filter((existing) => existing.id !== newJob.id),
    ]);
    setActiveTab('jobs');
    setSelectedCategory('All');
    setSelectedTier('All');
    setSelectedPayTier('all');
    setSelectedPlatform('');
    showToast(
      `Temporary local preview loaded for "${newJob.title}". Global posting goes live after review.`
    );
  };

  const handleDeleteCustomJob = (jobId: string) => {
    setCustomJobs((prev) => prev.filter((job) => job.id !== jobId));
    showToast('Removed temporary local preview.');
  };

  const isDefaultUnfiltered =
    !searchQuery.trim() &&
    selectedCategory === 'All' &&
    selectedTier === 'All' &&
    selectedPayTier === 'all' &&
    !selectedPlatform;

  const firstThreeJobs = visibleJobs.slice(0, 3);
  const remainingJobs = visibleJobs.slice(3);
  const activeFilterCount =
    (selectedPayTier !== 'all' ? 1 : 0) +
    (selectedTier !== 'All' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  const experience = new URLSearchParams(window.location.search).get('experience');

  if (experience === 'employer-auth') return <EmployerAuth />;
  if (experience === 'employer-profile') return <EmployerProfile />;
  if (experience === 'employer-payments') return <EmployerPayments />;
  if (experience === 'admin-moderation') return <AdminModeration />;
  if (experience === 'job-seeker-auth' || experience === 'job-seeker-reset') return <JobSeekerAuth />;
  if (experience === 'job-seeker-dashboard') return <JobSeekerDashboard />;
  if (experience === 'dashboard') return <AdminDashboardPreview />;
  if (experience === 'toolkit') return <ToolkitPreview />;

  const openCareerWorkspace = (tab: AppTab = 'ai-tools', resumeMode?: 'resume' | 'cover') => {
    setRequestedAITool(resumeMode ? {tool: 'resume', resumeMode, nonce: Date.now()} : null);
    const url = new URL(window.location.href);
    url.searchParams.set('experience', 'career-tools');
    window.history.replaceState({}, '', url.pathname + url.search);
    setIsCareerToolsOpen(true);
    setActiveTab(tab);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const marketplaceJobs = [...databaseJobs, ...INITIAL_JOBS];

  if (experience === 'premium' || experience === null || experience === 'career-tools') {
    return (
      <PremiumMarketplacePreview
        jobs={marketplaceJobs}
        onRefreshJobs={handleRefreshFeed}
        isRefreshing={isRefreshing}
        lastSyncedAt={lastJobsSyncAt}
        showCareerTools={isCareerToolsOpen || experience === 'career-tools'}
        careerToolsContent={<CareerWorkspaceHub tailoredDraft={tailoredDraft} requestedTool={requestedAITool} />}
        jobDetailModal={
          <JobDetailModal
            job={inspectedJob}
            isSaved={inspectedJob ? savedIds.includes(inspectedJob.id) : false}
            appliedRecord={inspectedJob ? appliedRecords[inspectedJob.id] : undefined}
            userSkills={userSkills}
            onToggleSave={toggleSaveJob}
            onUpsertApplied={handleUpsertApplied}
            onRemoveApplied={handleRemoveApplied}
            onTailorResume={job => {
              openCareerWorkspace('ai-tools');
              handleTailorResumeForJob(job);
            }}
            onLaunchPrepTool={(tool, job) => {
              openCareerWorkspace('ai-tools');
              handleLaunchPrepTool(tool, job);
            }}
            onClose={() => setInspectedJob(null)}
          />
        }
        postJobModal={
          <>
            <EmployerEntryModal
              isOpen={isEmployerEntryOpen}
              onClose={() => setIsEmployerEntryOpen(false)}
            />
            <AddJobModal
              isOpen={isAddJobOpen}
              onClose={() => setIsAddJobOpen(false)}
              onOpenPrivacyPolicy={() => setIsPrivacyOpen(true)}
              onPreviewLocalJob={handlePreviewLocalJob}
              localPreviewJobs={customJobs}
              onDeleteLocalPreview={handleDeleteCustomJob}
            />
          </>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col pb-20 lg:pb-0">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        liveJobCount={
          activeTab === 'saved' ? savedJobs.length : filteredJobs.length
        }
        totalJobCount={allJobs.length}
        savedCount={savedJobs.length}
        onShareApp={handleShareApp}
        copied={copied}
      />

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-8">
        {activeTab === 'jobs' && (
          <div className="space-y-3 sm:space-y-6">
            {/* Compact Top Controls: Search Bar, Collapsible Filters & Post, and Horizontal Category Pills */}
            <section aria-labelledby="feed-heading" className="space-y-2 sm:space-y-4">
              {/* Desktop Hero Header (Hidden on <640px mobile so job cards appear above the fold) */}
              <div className="hidden sm:flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1
                      id="feed-heading"
                      className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-50 text-balance"
                    >
                      Remote AI &amp; Tech Opportunities
                    </h1>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/35 bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      No Signup Required
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-400 max-w-2xl">
                    Curated opportunity guides across AI and tech platforms. These are not confirmed vacancies—check the employer's official site for current openings, eligibility, and pay.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="inline-flex items-center gap-2 min-h-[44px] rounded-xl border border-slate-800 bg-[#111827] px-3.5 py-2 text-xs font-medium text-slate-200">
                    <Globe2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Global Opportunities • Free Discovery</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshFeed}
                    aria-label="Refresh job feed"
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border border-slate-800 bg-[#111827] text-xs font-medium text-slate-300 hover:text-slate-100 hover:border-slate-700 transition-colors shrink-0"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-cyan-400 ${
                        isRefreshing ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search opportunity guides, companies (micro1, Mercor, Babel Audio, Anthropic...), or skills..."
                  aria-label="Search AI and remote jobs"
                  className="w-full min-h-[42px] sm:min-h-[46px] rounded-xl border border-slate-800 bg-[#111827] pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Compact Collapsible "Filters & Post" Bar (Collapsed by default on mobile) */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsFiltersBarOpen((prev) => !prev)}
                  aria-expanded={isFiltersBarOpen}
                  className="sm:hidden flex w-full items-center justify-between gap-2 min-h-[40px] rounded-xl border border-slate-800/90 bg-[#0D1320] px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-700 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 shrink-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Filters &amp; Post</span>
                    {activeFilterCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.2 font-mono text-[10px] font-bold text-cyan-300">
                        {activeFilterCount}
                      </span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
                    <span className="truncate">Rate · Sort · Companies · + Post</span>
                    {isFiltersBarOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </span>
                </button>

                <div
                  className={`${
                    isFiltersBarOpen ? 'flex' : 'hidden sm:flex'
                  } flex-col lg:flex-row lg:items-center justify-between gap-2.5 rounded-xl border border-slate-800/80 sm:border-0 bg-[#0D1320] sm:bg-transparent p-2.5 sm:p-0`}
                >
                  {/* Rate, Sort & + Post Role */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
                    <div className="relative flex items-center">
                      <DollarSign
                        aria-hidden="true"
                        className="pointer-events-none absolute left-2.5 sm:left-3 w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400"
                      />
                      <select
                        aria-label="Filter by USD pay tier"
                        value={selectedPayTier}
                        onChange={(e) =>
                          setSelectedPayTier(e.target.value as PayTierFilter)
                        }
                        className="w-full sm:w-auto min-h-[38px] sm:min-h-[44px] rounded-xl border border-slate-800 bg-[#111827] pl-8 sm:pl-9 pr-6 sm:pr-7 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="all">Rate: All USD</option>
                        <option value="25plus">Rate: $25+/hr</option>
                        <option value="50plus">Rate: $50+/hr</option>
                        <option value="annual">Full-Time Annual</option>
                      </select>
                    </div>

                    <div className="relative flex items-center">
                      <SlidersHorizontal
                        aria-hidden="true"
                        className="pointer-events-none absolute left-2.5 sm:left-3.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400"
                      />
                      <select
                        id="sort-select"
                        aria-label="Sort job listings"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as SortOption)
                        }
                        className="w-full sm:w-auto min-h-[38px] sm:min-h-[44px] rounded-xl border border-slate-800 bg-[#111827] pl-8 sm:pl-10 pr-6 sm:pr-8 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="newest">Sort: Newest</option>
                        <option value="highest-pay">Sort: Highest Pay</option>
                        <option value="urgent">Sort: Featured Employer First</option>
                        <option value="alphabetical">
                          Sort: Alphabetical (A–Z)
                        </option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddJobOpen(true)}
                      className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[44px] px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm font-semibold text-slate-100 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                      <span>Post Role</span>
                    </button>
                  </div>

                  {/* All Companies / Established / Emerging Segmented Filter */}
                  <div
                    role="group"
                    aria-label="Filter by company tier"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-[#111827] p-1 self-start shrink-0 overflow-x-auto max-w-full"
                  >
                    {(
                      [
                        {id: 'All', label: 'All Companies'},
                        {
                          id: 'Established Leader',
                          label: `Established (${tierCounts.established})`,
                        },
                        {
                          id: 'Emerging AI Startup',
                          label: `Emerging (${tierCounts.emerging})`,
                        },
                        ...(tierCounts.customPartner > 0
                          ? [
                              {
                                id: 'Custom Partner' as const,
                                label: `Custom Partner (${tierCounts.customPartner})`,
                              },
                            ]
                          : []),
                      ] as const
                    ).map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTier(tier.id)}
                        className={`min-h-[32px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          selectedTier === tier.id
                            ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                            : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Filter Pills (2-column grid on mobile, wrap row on desktop) */}
              <div
                role="tablist"
                aria-label="Filter jobs by category"
                className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 py-0.5"
              >
                {JOB_CATEGORIES.map((category) => {
                  const isActive = selectedCategory === category;
                  const count = categoryCounts[category];
                  return (
                    <button
                      key={category}
                      role="tab"
                      aria-selected={isActive}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`inline-flex items-center justify-between sm:justify-center gap-2 w-full sm:w-auto min-h-[38px] sm:min-h-[42px] px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isActive
                          ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-semibold'
                          : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:text-slate-100'
                      }`}
                    >
                      <span className="truncate">{category}</span>
                      <span
                        className={`font-mono text-[11px] sm:text-xs tabular-nums shrink-0 ${
                          isActive ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Platform Filter Chip & Applied Link (only shown when active) */}
              {(selectedPlatform || Object.keys(appliedRecords).length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  {selectedPlatform ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform('')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-900/50 transition-colors"
                    >
                      <span>Platform: {selectedPlatform}</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span />
                  )}
                  {Object.keys(appliedRecords).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('saved');
                        setSavedSubTab('applied');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {Object.keys(appliedRecords).length} tracked in Applied
                      </span>
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Main Job Cards Grid: First 3 Cards Immediately Below Top Controls */}
            {filteredJobs.length > 0 ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {firstThreeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSaved={savedIds.includes(job.id)}
                      appliedStatus={appliedRecords[job.id]?.status}
                      skillMatch={computeSkillMatch(job, userSkills)}
                      onToggleSave={toggleSaveJob}
                      onOpenDetails={setInspectedJob}
                    />
                  ))}
                </div>

                {/* Curated platform guide spotlight */}
                {isDefaultUnfiltered && spotlightJobs.length > 0 && (
                  <section
                    aria-label="Curated platform opportunity guides"
                    className="rounded-2xl border border-slate-800/90 bg-[#0D1320] p-3 sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2.5 sm:mb-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-cyan-300">
                        <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>Platform Opportunity Guides</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Curated guides · verify current openings
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {spotlightJobs.map((job) => (
                        <div
                          key={`spot-${job.id}`}
                          onClick={() => setInspectedJob(job)}
                          className="w-full cursor-pointer rounded-xl border border-slate-800 bg-[#111827] p-3 hover:border-cyan-500/45 transition-colors flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <CompanyLogo
                                  company={job.company}
                                  short={job.companyShort}
                                  explicitLogoUrl={job.companyLogoUrl}
                                  websiteOrApplyUrl={
                                    job.companyWebsite || job.applyUrl
                                  }
                                  size="sm"
                                />
                                <span className="font-bold text-slate-100 truncate">
                                  {job.company}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 shrink-0">
                                Check employer for pay
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-snug">
                              {job.title}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-0.5 sm:pt-1">
                            <span className="text-[11px] text-slate-500">
                              {job.category}
                            </span>
                            <a
                              href={resolveApplyUrl(job.company, job.applyUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                            >
                              <span>Explore guide</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Zero-Login Local Instant Skill Match % Bar (Moved after the first 3 job cards) */}
                <div className="rounded-xl border border-slate-800/90 bg-[#0D1320] px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      {parseUserSkills(userSkills).length > 0 ? (
                        <span className="truncate">
                          <strong className="text-cyan-300">
                            Skill Match % Active:
                          </strong>{' '}
                          {parseUserSkills(userSkills).join(', ')}
                        </span>
                      ) : (
                        <span>
                          <strong className="text-slate-100">
                            Instant Skill Match %:
                          </strong>{' '}
                          Add your skills locally (zero signup) to score every role.
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {parseUserSkills(userSkills).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setUserSkills('')}
                          className="text-xs text-slate-400 hover:text-rose-300 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSkillsEditorOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:border-cyan-500/50 transition-colors"
                      >
                        <span>
                          {isSkillsEditorOpen
                            ? 'Done'
                            : parseUserSkills(userSkills).length > 0
                              ? 'Edit Skills'
                              : 'Match My Skills'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isSkillsEditorOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
                      <input
                        type="text"
                        value={userSkills}
                        onChange={(e) =>
                          setUserSkills(sanitizeText(e.target.value, 200))
                        }
                        aria-label="Enter your skills separated by commas"
                        placeholder="e.g., Python, TypeScript, RLHF, Voiceover, Data Annotation"
                        className="w-full min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {QUICK_SKILL_SUGGESTIONS.map((skill) => {
                          const activeSkills = parseUserSkills(userSkills).map(
                            (s) => s.toLowerCase()
                          );
                          const isAdded = activeSkills.includes(
                            skill.toLowerCase()
                          );
                          return (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => {
                                const current = parseUserSkills(userSkills);
                                if (isAdded) {
                                  setUserSkills(
                                    current
                                      .filter(
                                        (s) =>
                                          s.toLowerCase() !==
                                          skill.toLowerCase()
                                      )
                                      .join(', ')
                                  );
                                } else {
                                  setUserSkills([...current, skill].join(', '));
                                }
                              }}
                              className={`min-h-[30px] rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                                isAdded
                                  ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-200'
                                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                              }`}
                            >
                              {isAdded ? `✓ ${skill}` : `+ ${skill}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Remaining Job Cards with Inline AdBanner every 8th overall card */}
                {remainingJobs.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {remainingJobs.map((job, index) => {
                      return (
                        <JobCard
                          key={job.id}
                          job={job}
                          isSaved={savedIds.includes(job.id)}
                          appliedStatus={appliedRecords[job.id]?.status}
                          skillMatch={computeSkillMatch(job, userSkills)}
                          onToggleSave={toggleSaveJob}
                          onOpenDetails={setInspectedJob}
                        />
                      );
                    })}
                  </div>
                )}

                {visibleCount < filteredJobs.length && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-[#0D1320] px-5 py-4">
                    <p className="text-xs sm:text-sm text-slate-300">
                      Viewing{' '}
                      <strong className="font-mono tabular-nums text-slate-100">
                        {visibleJobs.length}
                      </strong>{' '}
                      of{' '}
                      <strong className="font-mono tabular-nums text-cyan-300">
                        {filteredJobs.length}
                      </strong>{' '}
                      curated opportunity guides and employer listings in standard USD ($)
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleCount((prev) =>
                            Math.min(prev + JOBS_PER_PAGE, filteredJobs.length)
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 transition-colors"
                      >
                        Load{' '}
                        {Math.min(
                          JOBS_PER_PAGE,
                          filteredJobs.length - visibleCount
                        )}{' '}
                        More Roles
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibleCount(filteredJobs.length)}
                        className="inline-flex items-center justify-center min-h-[42px] px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
                      >
                        Show All ({filteredJobs.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#111827] px-6 py-14 text-center">
                <p className="font-display text-lg font-bold text-slate-100">
                  No matching opportunities found
                </p>
                <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
                  Try clearing your search term or switching back to all categories.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai-tools' && (
          <AIToolsView
            tailoredDraft={tailoredDraft}
            requestedTool={requestedAITool}
          />
        )}

        {activeTab === 'news' && <NewsDevToolsView />}

        {activeTab === 'saved' && (
          <section aria-labelledby="saved-heading" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1
                  id="saved-heading"
                  className="font-display text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight"
                >
                  Saved & Applied Tracker
                </h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  Manage bookmarked roles and application progress locally on your device—zero account required.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  role="tablist"
                  aria-label="Saved and applied views"
                  className="inline-flex rounded-xl border border-slate-800 bg-[#111827] p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={savedSubTab === 'saved'}
                    onClick={() => setSavedSubTab('saved')}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      savedSubTab === 'saved'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Saved ({savedJobs.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={savedSubTab === 'applied'}
                    onClick={() => setSavedSubTab('applied')}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      savedSubTab === 'applied'
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Applied ({appliedJobsList.length})
                  </button>
                </div>

                {(savedJobs.length > 0 || appliedJobsList.length > 0) && (
                  <button
                    type="button"
                    onClick={handleExportTracker}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-100 hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export .JSON</span>
                  </button>
                )}
              </div>
            </div>

            {savedSubTab === 'saved' &&
              (savedJobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {savedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isSaved={true}
                      appliedStatus={appliedRecords[job.id]?.status}
                      onToggleSave={toggleSaveJob}
                      onOpenDetails={setInspectedJob}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#111827] px-6 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-slate-100">
                    No saved jobs yet
                  </p>
                  <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
                    Tap the bookmark icon on any listing to keep track of roles you want to apply to later.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('jobs')}
                    className="mt-5 inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors"
                  >
                    Browse Opportunities
                  </button>
                </div>
              ))}

            {savedSubTab === 'applied' &&
              (appliedJobsList.length > 0 ? (
                <div className="space-y-3">
                  {appliedJobsList.map(({job, record}) => (
                    <div
                      key={job.id}
                      onClick={() => setInspectedJob(job)}
                      className="cursor-pointer rounded-2xl border border-slate-800/90 bg-[#111827] p-5 hover:border-cyan-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-cyan-300">
                            {job.company}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono text-slate-300">
                            {job.isCustomEmployerPost
                              ? formatPayRate(job.payMinUsd, job.payMaxUsd, job.payUnit)
                              : 'Pay not listed'}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-slate-400">
                            Updated {record.updatedAt}
                          </span>
                        </div>
                        <h2 className="font-display text-base sm:text-lg font-bold text-slate-50 truncate">
                          {job.title}
                        </h2>
                        {record.note && (
                          <p className="text-xs sm:text-sm text-slate-300">
                            Note: {record.note}
                          </p>
                        )}
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-wrap items-center gap-2.5 shrink-0"
                      >
                        <select
                          aria-label={`Update status for ${job.title}`}
                          value={record.status}
                          onChange={(e) =>
                            handleUpsertApplied(
                              job.id,
                              e.target.value as ApplicationStatus,
                              record.note
                            )
                          }
                          className="min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-emerald-300 focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Assessment Pending">
                            Assessment Pending
                          </option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                        </select>

                        <a
                          href={resolveApplyUrl(job.company, job.applyUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                        >
                          <span>Portal</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#111827] px-6 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-slate-100">
                    No tracked applications yet
                  </p>
                  <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
                    Open any job card and tap &ldquo;Mark as Applied&rdquo; to track assessments, interviews, and personal notes locally.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('jobs')}
                    className="mt-5 inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold hover:bg-cyan-400 transition-colors"
                  >
                    Browse Opportunities
                  </button>
                </div>
              ))}
          </section>
        )}

        {activeTab === 'platforms' && (
          <PlatformsView
            jobs={allJobs}
            onFilterByPlatform={handleSelectPlatformFromTicker}
            onOpenAddJob={() => setIsAddJobOpen(true)}
          />
        )}

        {activeTab === 'app' && (
          <AppReadinessView onShareApp={handleShareApp}/>
        )}
      </main>

      {/* Quiet Editorial Footer with Privacy Policy & Terms */}
      <footer className="border-t border-slate-800/80 bg-[#090D16] py-6 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            PlanetAI — Global Remote AI & Tech Job Aggregator (USD) · 100% Free, No Registration Required
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('platforms')}
              className="hover:text-slate-300 transition-colors"
            >
              Platforms
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-tools')}
              className="hover:text-slate-300 transition-colors"
            >
              AI Tools
            </button>
            <a
              href="?experience=toolkit"
              className="hover:text-slate-300 transition-colors"
            >
              Focus Toolkit
            </a>
            <button
              type="button"
              onClick={() => setActiveTab('app')}
              className="hover:text-slate-300 transition-colors"
            >
              PWA & APK
            </button>
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="font-medium text-slate-300 hover:text-cyan-300 transition-colors underline underline-offset-4"
            >
              Privacy Policy & Terms
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Thumb-Zone Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        savedCount={savedJobs.length}
      />

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-[#0D1A18]/95 backdrop-blur-md px-4 py-3 text-xs sm:text-sm font-medium text-emerald-200 shadow-2xl"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <JobDetailModal
        job={inspectedJob}
        isSaved={inspectedJob ? savedIds.includes(inspectedJob.id) : false}
        appliedRecord={
          inspectedJob ? appliedRecords[inspectedJob.id] : undefined
        }
        userSkills={userSkills}
        onToggleSave={toggleSaveJob}
        onUpsertApplied={handleUpsertApplied}
        onRemoveApplied={handleRemoveApplied}
        onTailorResume={handleTailorResumeForJob}
        onLaunchPrepTool={handleLaunchPrepTool}
        onClose={() => setInspectedJob(null)}
      />

      <>
        <EmployerEntryModal
          isOpen={isEmployerEntryOpen}
          onClose={() => setIsEmployerEntryOpen(false)}
        />
        <AddJobModal
          isOpen={isAddJobOpen}
          onClose={() => setIsAddJobOpen(false)}
          onOpenPrivacyPolicy={() => setIsPrivacyOpen(true)}
          onPreviewLocalJob={handlePreviewLocalJob}
          localPreviewJobs={customJobs}
          onDeleteLocalPreview={handleDeleteCustomJob}
        />
      </>

      <PrivacyTermsModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <PWAInstallProvider>
      <AppContent />
    </PWAInstallProvider>
  );
}
