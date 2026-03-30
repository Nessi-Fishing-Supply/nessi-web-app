import { describe, it, expect } from 'vitest';
import {
  filterMessageContent,
  NUDGE_OFF_PLATFORM,
  NUDGE_NEGOTIATION,
  EXPLICIT_BLOCKLIST,
} from '../safety-filter';

describe('filterMessageContent', () => {
  describe('explicit language blocking', () => {
    it('blocks a message containing a term from the explicit blocklist', () => {
      const term = EXPLICIT_BLOCKLIST[0];
      const result = filterMessageContent(`you are a ${term}`);
      expect(result.action).toBe('block');
      expect(result.filteredContent).toBeNull();
      expect(result.isFiltered).toBe(true);
      expect(result.originalContent).toBe(`you are a ${term}`);
    });

    it('blocks a message with an uppercase explicit term (case insensitive)', () => {
      const term = EXPLICIT_BLOCKLIST[0].toUpperCase();
      const result = filterMessageContent(`stop calling me a ${term}`);
      expect(result.action).toBe('block');
      expect(result.filteredContent).toBeNull();
    });

    it('does not block a word that merely contains a blocklist term as a substring', () => {
      // "cracker" is in the list — "firecracker" should NOT be blocked because
      // the word boundary \b prevents substring matches
      const result = filterMessageContent('we used to light firecrackers on the fourth');
      expect(result.action).not.toBe('block');
    });
  });

  describe('PII redaction', () => {
    it('redacts a phone number', () => {
      const result = filterMessageContent('my number is 555-123-4567');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('555-123-4567');
      expect(result.filteredContent).toContain('[removed]');
      expect(result.isFiltered).toBe(true);
    });

    it('redacts an email address', () => {
      const result = filterMessageContent('email me at test@gmail.com');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('test@gmail.com');
      expect(result.filteredContent).toContain('[removed]');
    });

    it('redacts a street address', () => {
      const result = filterMessageContent('I live at 123 Main Street');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('123 Main Street');
      expect(result.filteredContent).toContain('[removed]');
    });

    it('redacts a credit card number that passes Luhn validation', () => {
      // 4111 1111 1111 1111 is a standard Luhn-valid test card number
      const result = filterMessageContent('my card is 4111 1111 1111 1111');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('4111 1111 1111 1111');
      expect(result.filteredContent).toContain('[removed]');
    });

    it('does not redact a 16-digit number that fails Luhn validation', () => {
      // 1234 5678 9012 3456 does not pass Luhn — likely a tracking number
      const result = filterMessageContent('tracking number 1234 5678 9012 3456');
      expect(result.action).not.toBe('redact');
    });

    it('redacts multiple PII instances in the same message', () => {
      const result = filterMessageContent('call me at 555-123-4567 or email john@example.com');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('555-123-4567');
      expect(result.filteredContent).not.toContain('john@example.com');
      const matches = result.filteredContent?.match(/\[removed\]/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('redacts an address with mixed-case street suffix', () => {
      const result = filterMessageContent('come by 123 Oak Ave sometime');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('123 Oak Ave');
      expect(result.filteredContent).toContain('[removed]');
    });
  });

  describe('off-platform detection', () => {
    it('nudges when message contains "text me"', () => {
      const result = filterMessageContent('text me at my number');
      expect(result.action).toBe('nudge_off_platform');
      expect(result.nudgeType).toBe('off_platform');
      expect(result.isFiltered).toBe(false);
    });

    it('nudges when message mentions venmo', () => {
      const result = filterMessageContent('just venmo me the money');
      expect(result.action).toBe('nudge_off_platform');
      expect(result.nudgeType).toBe('off_platform');
    });

    it('nudges when message says "meet in person"', () => {
      const result = filterMessageContent("let's meet in person to hand it off");
      expect(result.action).toBe('nudge_off_platform');
      expect(result.nudgeType).toBe('off_platform');
    });

    it('exports NUDGE_OFF_PLATFORM as a non-empty string', () => {
      expect(typeof NUDGE_OFF_PLATFORM).toBe('string');
      expect(NUDGE_OFF_PLATFORM.length).toBeGreaterThan(0);
    });
  });

  describe('price negotiation detection', () => {
    it('nudges when message says "would you take"', () => {
      const result = filterMessageContent('would you take $50 for it?');
      expect(result.action).toBe('nudge_negotiation');
      expect(result.nudgeType).toBe('negotiation');
      expect(result.isFiltered).toBe(false);
    });

    it('nudges when message asks for "best price"', () => {
      const result = filterMessageContent("what's your best price?");
      expect(result.action).toBe('nudge_negotiation');
      expect(result.nudgeType).toBe('negotiation');
    });

    it('nudges when message says "i can do $X"', () => {
      const result = filterMessageContent('I can do $35 for it');
      expect(result.action).toBe('nudge_negotiation');
      expect(result.nudgeType).toBe('negotiation');
    });

    it('does not nudge on a standalone dollar amount without negotiation phrasing', () => {
      const result = filterMessageContent('the listing is $200');
      expect(result.action).toBe('pass');
    });

    it('does not nudge on casual "how about" without a dollar amount', () => {
      const result = filterMessageContent('how about the condition of the reel?');
      expect(result.action).toBe('pass');
    });

    it('exports NUDGE_NEGOTIATION as a non-empty string', () => {
      expect(typeof NUDGE_NEGOTIATION).toBe('string');
      expect(NUDGE_NEGOTIATION.length).toBeGreaterThan(0);
    });
  });

  describe('clean messages', () => {
    it('passes a neutral inquiry without modification', () => {
      const input = 'hey, is this rod still available?';
      const result = filterMessageContent(input);
      expect(result.action).toBe('pass');
      expect(result.isFiltered).toBe(false);
      expect(result.filteredContent).toBe(input);
      expect(result.originalContent).toBe(input);
    });

    it('passes a general question about condition', () => {
      const input = 'Great condition! When was this last used?';
      const result = filterMessageContent(input);
      expect(result.action).toBe('pass');
      expect(result.isFiltered).toBe(false);
      expect(result.filteredContent).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('passes an empty string', () => {
      const result = filterMessageContent('');
      expect(result.action).toBe('pass');
      expect(result.filteredContent).toBe('');
    });

    it('passes a whitespace-only string', () => {
      const result = filterMessageContent('   ');
      expect(result.action).toBe('pass');
    });

    it('handles repeated calls with the same PII type (stateful regex regression)', () => {
      const r1 = filterMessageContent('call 555-111-2222');
      const r2 = filterMessageContent('call 555-333-4444');
      expect(r1.action).toBe('redact');
      expect(r2.action).toBe('redact');
      expect(r2.filteredContent).not.toContain('555-333-4444');
    });
  });

  describe('priority ordering', () => {
    it('returns block when message has both explicit language and PII', () => {
      const term = EXPLICIT_BLOCKLIST[0];
      const result = filterMessageContent(`call ${term} at 555-123-4567`);
      expect(result.action).toBe('block');
      expect(result.filteredContent).toBeNull();
    });

    it('returns redact when message has both PII and an off-platform phrase', () => {
      // "my number is" triggers off-platform AND the phone number triggers PII
      // PII check runs before off-platform, so redact should win
      const result = filterMessageContent('my number is 555-123-4567, just venmo me');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).toContain('[removed]');
    });
  });
});
