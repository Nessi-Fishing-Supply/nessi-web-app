// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { SYSTEM_ROLE_IDS, SYSTEM_ROLE_SLUGS, DEFAULT_ROLE_ID } from '../roles';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('SYSTEM_ROLE_IDS', () => {
  it('OWNER has the correct UUID', () => {
    expect(SYSTEM_ROLE_IDS.OWNER).toBe('11111111-1111-1111-1111-111111111101');
  });

  it('MANAGER has the correct UUID', () => {
    expect(SYSTEM_ROLE_IDS.MANAGER).toBe('11111111-1111-1111-1111-111111111102');
  });

  it('CONTRIBUTOR has the correct UUID', () => {
    expect(SYSTEM_ROLE_IDS.CONTRIBUTOR).toBe('11111111-1111-1111-1111-111111111103');
  });

  it('all UUIDs match UUID format', () => {
    expect(SYSTEM_ROLE_IDS.OWNER).toMatch(UUID_REGEX);
    expect(SYSTEM_ROLE_IDS.MANAGER).toMatch(UUID_REGEX);
    expect(SYSTEM_ROLE_IDS.CONTRIBUTOR).toMatch(UUID_REGEX);
  });
});

describe('SYSTEM_ROLE_SLUGS', () => {
  it('owner slug is "owner"', () => {
    expect(SYSTEM_ROLE_SLUGS.owner).toBe('owner');
  });

  it('manager slug is "manager"', () => {
    expect(SYSTEM_ROLE_SLUGS.manager).toBe('manager');
  });

  it('contributor slug is "contributor"', () => {
    expect(SYSTEM_ROLE_SLUGS.contributor).toBe('contributor');
  });
});

describe('DEFAULT_ROLE_ID', () => {
  it('equals SYSTEM_ROLE_IDS.CONTRIBUTOR', () => {
    expect(DEFAULT_ROLE_ID).toBe(SYSTEM_ROLE_IDS.CONTRIBUTOR);
  });
});
