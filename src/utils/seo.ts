import {JobListing} from '../data/jobs';
import {getCompanyLogoUrl} from './companyLogos';

const DEFAULT_TITLE = 'PlanetAI — AI & Remote Job Aggregator';
const DEFAULT_DESC =
  'Browse 200+ vetted remote AI training, coding, audio/voice, and data annotation jobs in global USD rates with zero-login AI career prep tools.';

function toEmploymentType(workType: JobListing['workType']): string {
  if (workType === 'Full-Time Remote') return 'FULL_TIME';
  if (workType === 'Part-Time Flexible') return 'PART_TIME';
  return 'CONTRACTOR';
}

function toUnitText(unit: JobListing['payUnit']): string {
  if (unit === 'hr') return 'HOUR';
  if (unit === 'yr') return 'YEAR';
  return 'OTHER';
}

export function buildJobPostingJsonLd(
  job: JobListing,
  pageUrl: string
): Record<string, unknown> {
  const now = new Date();
  const datePosted = now.toISOString().split('T')[0];
  const validThroughDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const validThrough = validThroughDate.toISOString().split('T')[0];

  const resolvedLogo = getCompanyLogoUrl(
    job.company,
    job.companyLogoUrl,
    job.companyWebsite || job.applyUrl
  );

  const hiringOrg: Record<string, unknown> = {
    '@type': 'Organization',
    name: job.company,
    sameAs: job.companyWebsite || job.applyUrl,
  };
  if (resolvedLogo) {
    hiringOrg.logo = resolvedLogo;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: `${job.description} Qualifications: ${job.requirements.join('; ')}`,
    identifier: {
      '@type': 'PropertyValue',
      name: job.company,
      value: job.id,
    },
    datePosted,
    validThrough,
    employmentType: toEmploymentType(job.workType),
    hiringOrganization: hiringOrg,
    jobLocationType: 'TELECOMMUTE',
    applicantLocationRequirements: {
      '@type': 'Country',
      name: job.location || 'Worldwide',
    },
    url: pageUrl,
    directApply: false,
    baseSalary: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.payMinUsd,
        maxValue: job.payMaxUsd,
        unitText: toUnitText(job.payUnit),
      },
    },
  };
}

function upsertMetaTag(
  attr: 'name' | 'property',
  key: string,
  content: string
) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function syncSeoMetadata(
  jobs: JobListing[],
  inspectedJob: JobListing | null
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const canonicalUrl = inspectedJob
    ? `${baseUrl}?job=${encodeURIComponent(inspectedJob.id)}`
    : baseUrl;

  const pageTitle = inspectedJob
    ? `${inspectedJob.title} at ${inspectedJob.company} | PlanetAI`
    : DEFAULT_TITLE;
  const pageDesc = inspectedJob
    ? `${inspectedJob.title} (${inspectedJob.location}) at ${inspectedJob.company}. ${inspectedJob.description}`.slice(
        0,
        160
      )
    : DEFAULT_DESC;

  document.title = pageTitle;
  upsertCanonical(canonicalUrl);
  upsertMetaTag('name', 'description', pageDesc);
  upsertMetaTag('property', 'og:title', pageTitle);
  upsertMetaTag('property', 'og:description', pageDesc);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('name', 'twitter:title', pageTitle);
  upsertMetaTag('name', 'twitter:description', pageDesc);

  const scriptId = 'planetai-jobposting-schema';
  let scriptEl = document.getElementById(
    scriptId
  ) as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = scriptId;
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const schemaPayload = inspectedJob
    ? buildJobPostingJsonLd(inspectedJob, canonicalUrl)
    : {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'PlanetAI Curated AI & Remote Job Listings',
        numberOfItems: jobs.length,
        itemListElement: jobs.slice(0, 25).map((job, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `${baseUrl}?job=${encodeURIComponent(job.id)}`,
          item: buildJobPostingJsonLd(
            job,
            `${baseUrl}?job=${encodeURIComponent(job.id)}`
          ),
        })),
      };

  scriptEl.textContent = JSON.stringify(schemaPayload);
}
