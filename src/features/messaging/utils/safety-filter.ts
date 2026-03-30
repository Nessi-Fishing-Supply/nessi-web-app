export type FilterAction = 'pass' | 'redact' | 'block' | 'nudge_off_platform' | 'nudge_negotiation';

export type FilterResult = {
  action: FilterAction;
  filteredContent: string | null;
  originalContent: string;
  isFiltered: boolean;
  nudgeType?: 'off_platform' | 'negotiation';
};

export const NUDGE_OFF_PLATFORM =
  "It looks like you're trying to arrange payment outside Nessi. For your protection, all transactions should go through the platform.";

export const NUDGE_NEGOTIATION =
  'Want to make this official? Create an offer so the seller can accept, counter, or decline.';

export const EXPLICIT_BLOCKLIST: string[] = [
  'nigger',
  'nigga',
  'faggot',
  'kike',
  'spic',
  'chink',
  'wetback',
  'cunt',
  'whore',
  'retard',
  'tranny',
  'cracker',
  'gook',
  'towelhead',
  'beaner',
];

// PII patterns — compiled once at module level
const PHONE_RE = /\b(?:\+?1[-\s.]?)?\(?\d{3}\)?[-\s.]?\d{3}[-\s.]?\d{4}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const ADDRESS_RE =
  /\b\d{1,5}\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Rd|Road|Way|Ct|Court|Pl|Place)\b/gi;
const CREDIT_CARD_RE = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

const PII_PATTERNS: RegExp[] = [PHONE_RE, EMAIL_RE, ADDRESS_RE, CREDIT_CARD_RE];

/** Luhn algorithm — validates credit card numbers to reduce false positives on tracking numbers */
function passesLuhn(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

// Off-platform detection patterns — compiled once at module level
const OFF_PLATFORM_PATTERNS: RegExp[] = [
  /text me/i,
  /call me/i,
  /email me/i,
  /dm me on/i,
  /hit me up at/i,
  /paypal/i,
  /venmo/i,
  /cashapp/i,
  /cash app/i,
  /zelle/i,
  /meet up/i,
  /meet in person/i,
  /\bpick\s+(?:it\s+)?up\b/i,
  /come get it/i,
  /my number is/i,
  /my email is/i,
  /reach me at/i,
];

// Price negotiation detection patterns — compiled once at module level
const NEGOTIATION_PATTERNS: RegExp[] = [
  /would you take/i,
  /will you take/i,
  /would you accept/i,
  /i'll give you/i,
  /i can do \$\d+/i,
  /how about \$\d+/i,
  /lowest you'll go/i,
  /lowest price/i,
  /best price/i,
  /bottom dollar/i,
];

export function filterMessageContent(content: string): FilterResult {
  // 1. Explicit language check — whole-word boundary, case-insensitive
  for (const term of EXPLICIT_BLOCKLIST) {
    const pattern = new RegExp(`\\b${term}\\b`, 'i');
    if (pattern.test(content)) {
      return {
        action: 'block',
        filteredContent: null,
        originalContent: content,
        isFiltered: true,
      };
    }
  }

  // 2. PII detection — redact all instances of all PII types
  let redacted = content;

  for (const pattern of PII_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern === CREDIT_CARD_RE) {
      // Luhn-validate credit card matches to avoid false positives on tracking numbers
      redacted = redacted.replace(pattern, (match) => {
        const digits = match.replace(/[-\s]/g, '');
        return passesLuhn(digits) ? '[removed]' : match;
      });
    } else {
      redacted = redacted.replace(pattern, '[removed]');
    }
  }

  if (redacted !== content) {
    return {
      action: 'redact',
      filteredContent: redacted,
      originalContent: content,
      isFiltered: true,
    };
  }

  // 3. Off-platform dealing detection
  for (const pattern of OFF_PLATFORM_PATTERNS) {
    if (pattern.test(content)) {
      return {
        action: 'nudge_off_platform',
        filteredContent: content,
        originalContent: content,
        isFiltered: false,
        nudgeType: 'off_platform',
      };
    }
  }

  // 4. Price negotiation detection
  for (const pattern of NEGOTIATION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        action: 'nudge_negotiation',
        filteredContent: content,
        originalContent: content,
        isFiltered: false,
        nudgeType: 'negotiation',
      };
    }
  }

  // 5. No match — pass
  return {
    action: 'pass',
    filteredContent: content,
    originalContent: content,
    isFiltered: false,
  };
}
