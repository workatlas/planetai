/**
 * Strips HTML/script tags, control characters, and trims length
 * to prevent XSS or malformed text injection across client-side inputs.
 */
export function sanitizeText(value: string, maxLength = 500): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

const PLACEHOLDER_HOSTS = ['test.com', 'example.com', 'example.org', 'example.net', 'localhost'];

const URL_SHORTENER_HOSTS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rb.gy',
  'shorturl.at',
  'cutt.ly',
  'tiny.cc',
  'rebrand.ly',
];

const BLOCKED_SCAM_PHRASES = [
  'whatsapp',
  'telegram',
  'pay to apply',
  'upfront fee',
  'registration fee',
  'training fee',
  'processing fee',
  'wire transfer',
  'western union',
  'moneygram',
  'crypto deposit',
  'send money',
  'gift card',
  'dm on tg',
];

const BLOCKED_PROFANITY_PATTERNS = [
  /\bfuck(?:ing|ed|er|s)?\b/i,
  /\bshit(?:ty|ting|s)?\b/i,
  /\bbitch(?:es)?\b/i,
  /\basshole(?:s)?\b/i,
  /\bbastard(?:s)?\b/i,
  /\bdickhead(?:s)?\b/i,
  /\bcunt(?:s)?\b/i,
  /\bslut(?:s)?\b/i,
  /\bwhore(?:s)?\b/i,
];

/**
 * Checks whether a hostname belongs to a disallowed URL shortener.
 */
export function isShortenerHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return URL_SHORTENER_HOSTS.some(
    (shortHost) => lower === shortHost || lower.endsWith(`.${shortHost}`)
  );
}

/**
 * Validates that a user-submitted external URL strictly uses https://,
 * has a valid hostname, and is not a URL shortener.
 */
export function validateHttpsUrl(rawUrl: string): string | null {
  const trimmed = sanitizeText(rawUrl, 300);
  if (!trimmed.toLowerCase().startsWith('https://')) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (parsed.protocol !== 'https:' || !hostname.includes('.') || PLACEHOLDER_HOSTS.includes(hostname) || hostname.endsWith('.invalid') || hostname.endsWith('.example')) {
      return null;
    }
    if (isShortenerHost(hostname)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Scans employer-submitted text fields for blocked scam keywords, profanity,
 * insecure http:// links, or URL shorteners. Returns an error message or null.
 */
export function checkModerationViolations(textFields: string[]): string | null {
  const combined = textFields.join(' ');
  const lower = combined.toLowerCase();

  if (/\bhttp:\/\//i.test(combined)) {
    return 'Insecure http:// links are not allowed. Use https:// links only.';
  }

  for (const shortener of URL_SHORTENER_HOSTS) {
    const pattern = new RegExp(`(?:^|[\\s/@.])${shortener.replace('.', '\\.')}(?:[\\s/]|$)`, 'i');
    if (pattern.test(lower)) {
      return `URL shorteners (${shortener}) are not permitted for safety reasons.`;
    }
  }

  for (const phrase of BLOCKED_SCAM_PHRASES) {
    if (lower.includes(phrase)) {
      return `Blocked keyword detected ("${phrase}"). Off-platform chat apps and applicant fee requests are not permitted.`;
    }
  }

  for (const regex of BLOCKED_PROFANITY_PATTERNS) {
    if (regex.test(combined)) {
      return 'Please remove inappropriate or profane language before submitting.';
    }
  }

  return null;
}
