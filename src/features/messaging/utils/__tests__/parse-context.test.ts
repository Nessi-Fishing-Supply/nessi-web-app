import { describe, it, expect } from 'vitest';
import { parseMessageContext } from '../parse-context';

describe('parseMessageContext', () => {
  it('returns member context when no header is present', () => {
    const request = new Request('http://localhost');
    expect(parseMessageContext(request)).toEqual({ type: 'member' });
  });

  it('returns member context for "member" header value', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Nessi-Context': 'member' },
    });
    expect(parseMessageContext(request)).toEqual({ type: 'member' });
  });

  it('returns shop context with shopId for "shop:" header value', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Nessi-Context': 'shop:abc-123-def' },
    });
    expect(parseMessageContext(request)).toEqual({ type: 'shop', shopId: 'abc-123-def' });
  });

  it('returns member context for empty header', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Nessi-Context': '' },
    });
    expect(parseMessageContext(request)).toEqual({ type: 'member' });
  });

  it('returns member context for invalid header format', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Nessi-Context': 'invalid' },
    });
    expect(parseMessageContext(request)).toEqual({ type: 'member' });
  });
});
