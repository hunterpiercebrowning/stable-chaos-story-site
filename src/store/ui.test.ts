import { describe, expect, it } from 'vitest';
import { NAV_INTENT_TTL_MS, navVia, useUi, viaFor } from './ui';

describe('navigation intent → via', () => {
  const at = 1_000_000;
  it('reads url when nothing was recorded or the intent is stale', () => {
    expect(viaFor(null, '/sectors', at)).toBe('url');
    expect(viaFor({ via: 'nav', path: '/sectors', at }, '/sectors', at + NAV_INTENT_TTL_MS + 1)).toBe('url');
  });
  it('matches the exact path and a node path under a layer path', () => {
    const intent = { via: 'nav' as const, path: '/sectors/biosecurity', at };
    expect(viaFor(intent, '/sectors/biosecurity', at + 10)).toBe('nav');
    expect(viaFor(intent, '/sectors', at + 10)).toBe('nav');
    expect(viaFor(intent, '/services', at + 10)).toBe('url');
    expect(viaFor(intent, '/sectors/cyber', at + 10)).toBe('url');
  });
  it('treats the welcome path as its own target only', () => {
    expect(viaFor({ via: 'arrow', path: '/', at }, '/', at)).toBe('arrow');
    expect(viaFor({ via: 'arrow', path: '/who', at }, '/', at)).toBe('url');
  });
  it('is written by the store action and read back live', () => {
    useUi.getState().setNavIntent('keyboard', '/products/private-pear');
    expect(navVia('/products/private-pear')).toBe('keyboard');
    expect(navVia('/products')).toBe('keyboard');
    expect(navVia('/who')).toBe('url');
  });
});
