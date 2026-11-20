import React, {useMemo, useState} from 'react';
import {ArrowUpRight, Filter, PlusCircle} from 'lucide-react';
import {
  JobListing,
  PlatformSummary,
  TOP_PLATFORMS,
} from '../data/jobs';
import {validateHttpsUrl} from '../utils/sanitize';

type ExtendedPlatform = PlatformSummary & {
  logoUrl?: string;
  isCustom?: boolean;
};

interface PlatformsViewProps {
  jobs: JobListing[];
  onFilterByPlatform: (platformName: string) => void;
  onOpenAddJob?: () => void;
}

export const PlatformsView: React.FC<PlatformsViewProps> = ({
  jobs,
  onFilterByPlatform,
  onOpenAddJob,
}) => {
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  const allPlatforms = useMemo<ExtendedPlatform[]>(() => {
    const knownNames = new Set(
      TOP_PLATFORMS.map((p) => p.name.toLowerCase())
    );
    const customMap = new Map<string, ExtendedPlatform>();

    for (const job of jobs) {
      if (!job.id.startsWith('custom-') && !job.isCustomEmployerPost) continue;
      const key = job.company.trim().toLowerCase();
      if (knownNames.has(key) || customMap.has(key)) continue;

      const hourlyMin =
        job.payUnit === 'yr' ? Math.round(job.payMinUsd / 2000) : job.payMinUsd;
      const hourlyMax =
        job.payUnit === 'yr' ? Math.round(job.payMaxUsd / 2000) : job.payMaxUsd;

      const safeLogo = job.companyLogoUrl
        ? validateHttpsUrl(job.companyLogoUrl) || undefined
        : undefined;
      const safePortal =
        (job.companyWebsite && validateHttpsUrl(job.companyWebsite)) ||
        job.applyUrl;

      customMap.set(key, {
        name: job.company,
        short: job.companyShort,
        tier: job.companyTier,
        focus: job.description,
        typicalMinUsd: hourlyMin,
        typicalMaxUsd: hourlyMax,
        payoutSchedule: job.workType,
        url: safePortal,
        logoUrl: safeLogo,
        isCustom: true,
      });
    }

    return [...Array.from(customMap.values()), ...TOP_PLATFORMS];
  }, [jobs]);

  return (
    <section aria-labelledby="platforms-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1
            id="platforms-heading"
            className="font-display text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight"
          >
            Top AI &amp; Remote Platforms
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">
            Explore established AI and remote-work platforms alongside employer-submitted companies. This directory is informational and does not imply a partnership or an active vacancy. Confirm openings, eligibility, compensation, and terms on each official site.
          </p>
        </div>

        {onOpenAddJob && (
          <button
            type="button"
            onClick={onOpenAddJob}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 active:scale-[0.98] transition-all shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Your Company</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {allPlatforms.map((platform) => {
          const openCount = jobs.filter(
            (j) => j.id.startsWith('database-') && j.company.toLowerCase() === platform.name.toLowerCase()
          ).length;
          const isEstablished = platform.tier === 'Established Leader';
          const isCustomPartner = platform.tier === 'Custom Partner';
          const showLogo = Boolean(
            platform.logoUrl && !failedLogos[platform.name]
          );

          return (
            <div
              key={platform.name}
              className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#111827] p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {showLogo && platform.logoUrl ? (
                      <img
                        src={platform.logoUrl}
                        alt={`${platform.name} logo`}
                        onError={() =>
                          setFailedLogos((prev) => ({
                            ...prev,
                            [platform.name]: true,
                          }))
                        }
                        className="h-11 w-11 shrink-0 rounded-xl border border-slate-700 bg-slate-900 object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 font-display text-sm font-bold text-cyan-300">
                        {platform.short}
                      </div>
                    )}
                    <div>
                      <h2 className="font-display text-lg font-bold text-slate-50">
                        {platform.name}
                      </h2>
                      <p className="font-mono text-xs text-emerald-400 tabular-nums">
                        {openCount} published employer {openCount === 1 ? 'listing' : 'listings'}
                      </p>
                    </div>
                  </div>
                </div>

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
                    {platform.tier}
                  </span>
                  {platform.isCustom && (
                    <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-950/40 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                      Employer-submitted listing
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {platform.focus}
                </p>

                <div className="mt-4 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-xs leading-relaxed text-slate-400">
                  Openings, eligibility, pay, and payout methods can change. Check the official platform site before relying on any details.
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onFilterByPlatform(platform.name)}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-900 text-xs sm:text-sm font-medium text-slate-100 hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View Guides</span>
                </button>

                <a
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs sm:text-sm font-bold hover:bg-cyan-400 transition-colors whitespace-nowrap"
                >
                  <span>Visit Portal</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
