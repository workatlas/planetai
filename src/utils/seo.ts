export interface SeoMetadataOptions {
  title?: string;
  description?: string;
  canonicalUrl?: string;
}

export function syncSeoMetadata(options: SeoMetadataOptions = {}): void {
  if (typeof document === 'undefined') return;

  if (options.title) {
    document.title = options.title;
  }

  if (options.description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', options.description);
  }

  if (options.canonicalUrl) {
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', options.canonicalUrl);
  }
}
