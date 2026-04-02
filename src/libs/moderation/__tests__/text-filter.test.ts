import { describe, it, expect } from 'vitest';
import {
  scanText,
  EXPLICIT_BLOCKLIST,
  NUDGE_OFF_PLATFORM,
  NUDGE_NEGOTIATION,
} from '@/libs/moderation';

describe('scanText', () => {
  describe('explicit language blocking', () => {
    it('blocks content containing a term from the explicit blocklist', () => {
      const term = EXPLICIT_BLOCKLIST[0];
      const result = scanText(`you are a ${term}`, 'message');
      expect(result.action).toBe('block');
      expect(result.filteredContent).toBeNull();
      expect(result.isFiltered).toBe(true);
      expect(result.originalContent).toBe(`you are a ${term}`);
    });

    it('blocks with an uppercase explicit term (case insensitive)', () => {
      const term = EXPLICIT_BLOCKLIST[0].toUpperCase();
      const result = scanText(`stop calling me a ${term}`, 'listing');
      expect(result.action).toBe('block');
      expect(result.filteredContent).toBeNull();
    });

    it('does not block a word that contains a blocklist term as a substring', () => {
      const result = scanText('we used to light firecrackers on the fourth', 'member');
      expect(result.action).not.toBe('block');
    });
  });

  describe('PII redaction', () => {
    it('redacts a phone number', () => {
      const result = scanText('my number is 555-123-4567', 'listing');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('555-123-4567');
      expect(result.filteredContent).toContain('[removed]');
      expect(result.isFiltered).toBe(true);
    });

    it('redacts an email address', () => {
      const result = scanText('email me at test@gmail.com', 'shop');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('test@gmail.com');
      expect(result.filteredContent).toContain('[removed]');
    });

    it('redacts a street address', () => {
      const result = scanText('I live at 123 Main Street', 'member');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('123 Main Street');
      expect(result.filteredContent).toContain('[removed]');
    });

    it('redacts a credit card number that passes Luhn validation', () => {
      const result = scanText('my card is 4111 1111 1111 1111', 'message');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('4111 1111 1111 1111');
      expect(result.filteredContent).toContain('[removed]');
    });

    it('does not redact a 16-digit number that fails Luhn validation', () => {
      const result = scanText('tracking number 1234 5678 9012 3456', 'listing');
      expect(result.action).not.toBe('redact');
    });

    it('redacts multiple PII instances in the same content', () => {
      const result = scanText('call me at 555-123-4567 or email john@example.com', 'member');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('555-123-4567');
      expect(result.filteredContent).not.toContain('john@example.com');
      const matches = result.filteredContent?.match(/\[removed\]/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('redacts an address with mixed-case street suffix', () => {
      const result = scanText('come by 123 Oak Ave sometime', 'shop');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).not.toContain('123 Oak Ave');
      expect(result.filteredContent).toContain('[removed]');
    });
  });

  describe('off-platform detection', () => {
    it('nudges when content contains "text me"', () => {
      const result = scanText('text me at my number', 'message');
      expect(result.action).toBe('nudge_off_platform');
      expect(result.nudgeType).toBe('off_platform');
      expect(result.isFiltered).toBe(false);
    });

    it('nudges when content mentions venmo', () => {
      const result = scanText('just venmo me the money', 'message');
      expect(result.action).toBe('nudge_off_platform');
      expect(result.nudgeType).toBe('off_platform');
    });

    it('nudges when content says "meet in person"', () => {
      const result = scanText("let's meet in person to hand it off", 'message');
      expect(result.action).toBe('nudge_off_platform');
      expect(result.nudgeType).toBe('off_platform');
    });

    it('exports NUDGE_OFF_PLATFORM as a non-empty string', () => {
      expect(typeof NUDGE_OFF_PLATFORM).toBe('string');
      expect(NUDGE_OFF_PLATFORM.length).toBeGreaterThan(0);
    });
  });

  describe('price negotiation detection', () => {
    it('nudges when content says "would you take"', () => {
      const result = scanText('would you take $50 for it?', 'message');
      expect(result.action).toBe('nudge_negotiation');
      expect(result.nudgeType).toBe('negotiation');
      expect(result.isFiltered).toBe(false);
    });

    it('nudges when content asks for "best price"', () => {
      const result = scanText("what's your best price?", 'message');
      expect(result.action).toBe('nudge_negotiation');
      expect(result.nudgeType).toBe('negotiation');
    });

    it('nudges when content says "i can do $X"', () => {
      const result = scanText('I can do $35 for it', 'message');
      expect(result.action).toBe('nudge_negotiation');
      expect(result.nudgeType).toBe('negotiation');
    });

    it('does not nudge on a standalone dollar amount without negotiation phrasing', () => {
      const result = scanText('the listing is $200', 'listing');
      expect(result.action).toBe('pass');
    });

    it('does not nudge on casual "how about" without a dollar amount', () => {
      const result = scanText('how about the condition of the reel?', 'message');
      expect(result.action).toBe('pass');
    });

    it('exports NUDGE_NEGOTIATION as a non-empty string', () => {
      expect(typeof NUDGE_NEGOTIATION).toBe('string');
      expect(NUDGE_NEGOTIATION.length).toBeGreaterThan(0);
    });
  });

  describe('clean content', () => {
    it('passes neutral content without modification', () => {
      const input = 'hey, is this rod still available?';
      const result = scanText(input, 'listing');
      expect(result.action).toBe('pass');
      expect(result.isFiltered).toBe(false);
      expect(result.filteredContent).toBe(input);
      expect(result.originalContent).toBe(input);
    });

    it('passes a general question about condition', () => {
      const input = 'Great condition! When was this last used?';
      const result = scanText(input, 'message');
      expect(result.action).toBe('pass');
      expect(result.isFiltered).toBe(false);
      expect(result.filteredContent).toBe(input);
    });
  });

  describe('edge cases', () => {
    it('passes an empty string', () => {
      const result = scanText('', 'listing');
      expect(result.action).toBe('pass');
      expect(result.filteredContent).toBe('');
    });

    it('passes a whitespace-only string', () => {
      const result = scanText('   ', 'member');
      expect(result.action).toBe('pass');
    });

    it('handles repeated calls with the same PII type (stateful regex regression)', () => {
      const r1 = scanText('call 555-111-2222', 'message');
      const r2 = scanText('call 555-333-4444', 'message');
      expect(r1.action).toBe('redact');
      expect(r2.action).toBe('redact');
      expect(r2.filteredContent).not.toContain('555-333-4444');
    });
  });

  describe('priority ordering', () => {
    it('returns block when content has both explicit language and PII', () => {
      const term = EXPLICIT_BLOCKLIST[0];
      const result = scanText(`call ${term} at 555-123-4567`, 'message');
      expect(result.action).toBe('block');
      expect(result.filteredContent).toBeNull();
    });

    it('returns redact when content has both PII and an off-platform phrase', () => {
      const result = scanText('my number is 555-123-4567, just venmo me', 'message');
      expect(result.action).toBe('redact');
      expect(result.filteredContent).toContain('[removed]');
    });
  });

  describe('context passthrough', () => {
    it('includes context in the result for listing', () => {
      const result = scanText('clean text', 'listing');
      expect(result.context).toBe('listing');
    });

    it('includes context in the result for member', () => {
      const result = scanText('clean text', 'member');
      expect(result.context).toBe('member');
    });

    it('includes context in the result for shop', () => {
      const result = scanText('clean text', 'shop');
      expect(result.context).toBe('shop');
    });

    it('includes context in the result for message', () => {
      const result = scanText('clean text', 'message');
      expect(result.context).toBe('message');
    });

    it('preserves context on block action', () => {
      const term = EXPLICIT_BLOCKLIST[0];
      const result = scanText(term, 'listing');
      expect(result.context).toBe('listing');
      expect(result.action).toBe('block');
    });

    it('preserves context on redact action', () => {
      const result = scanText('call 555-123-4567', 'shop');
      expect(result.context).toBe('shop');
      expect(result.action).toBe('redact');
    });
  });
});
