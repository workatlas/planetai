import {JobListing} from '../data/jobs';

const DEFAULT_TITLE = 'PLANETAI — AI Career & Opportunity Platform';
const DEFAULT_DESC =
  'Explore curated AI and remote-work opportunity guides, compare career platforms, and use free AI career tools. Confirm current vacancies and terms directly with each employer.';

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

/**
 * Curated opportunity guides are not verified vacancies. Do not emit JobPosting
 * structured data or invented posting/expiry dates for them. Add JobPosting
 * markup only after a source-backed vacancy record contains verified dates,
 * employer identity, location, and current application details.
 */
export function syncSeoMetadata(
  _jobs: JobListing[],
  inspectedJob: JobListing | null
) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const canonicalUrl = inspectedJob
    ? `${baseUrl}?job=${encodeURIComponent(inspectedJob.id)}`
    : baseUrl;

  const pageTitle = inspectedJob
    ? `${inspectedJob.title} — Opportunity Guide | PLANETAI`
    : DEFAULT_TITLE;
  const pageDesc = inspectedJob
    ? `Opportunity guide for ${inspectedJob.title} at ${inspectedJob.company}. This is not a confirmed vacancy; check the employer's official site for current openings and terms.`.slice(
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

  // Remove legacy JobPosting/ItemList markup that incorrectly described
  // curated guides as current vacancies with newly invented dates.
  document.getElementById('planetai-jobposting-schema')?.remove();
}
