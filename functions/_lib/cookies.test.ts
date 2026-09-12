import { describe, expect, it } from 'vitest';
import {
  parseCookies,
  serializeCookie,
  signAdmin,
  signSession,
  signVerify,
  verifyAdmin,
  verifySession,
  verifyVerify,
} from './cookies';

const SECRET = 'test-secret';

describe('sc_s session cookie', () => {
  it('round-trips linkId / sessionId / iat', async () => {
    const iat = Date.now();
    const value = await signSession(SECRET, { linkId: 'link-1', sessionId: 'sess-1', iat });
    expect(value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(await verifySession(SECRET, value)).toEqual({ linkId: 'link-1', sessionId: 'sess-1', iat });
  });

  it('rejects a tampered payload, a wrong secret and garbage', async () => {
    const iat = Date.now();
    const value = await signSession(SECRET, { linkId: 'link-1', sessionId: 'sess-1', iat });
    const [body, sig] = value.split('.');
    const other = await signSession(SECRET, { linkId: 'link-2', sessionId: 'sess-1', iat });
    expect(await verifySession(SECRET, `${other.split('.')[0]}.${sig}`)).toBeNull();
    expect(await verifySession('another-secret', value)).toBeNull();
    expect(await verifySession(SECRET, body)).toBeNull();
    expect(await verifySession(SECRET, '')).toBeNull();
    expect(await verifySession(SECRET, undefined)).toBeNull();
    expect(await verifySession(SECRET, 'not.base64!.x')).toBeNull();
  });

  it('expires after 30 days', async () => {
    const iat = Date.now() - 31 * 24 * 3600 * 1000;
    const value = await signSession(SECRET, { linkId: 'l', sessionId: 's', iat });
    expect(await verifySession(SECRET, value)).toBeNull();
    expect(await verifySession(SECRET, value, iat + 1000)).not.toBeNull();
  });
});

describe('sc_v verification cookie', () => {
  it('is bound to the session id', async () => {
    const at = 1_700_000_000_000;
    const value = await signVerify(SECRET, 'sess-1', at);
    expect(await verifyVerify(SECRET, value, 'sess-1')).toBe(at);
    expect(await verifyVerify(SECRET, value, 'sess-2')).toBeNull();
  });
});

describe('sc_admin cookie', () => {
  it('is valid for 12 hours', async () => {
    const iat = Date.now();
    const value = await signAdmin(SECRET, iat);
    expect(await verifyAdmin(SECRET, value, iat + 11 * 3600 * 1000)).toBe(true);
    expect(await verifyAdmin(SECRET, value, iat + 13 * 3600 * 1000)).toBe(false);
    expect(await verifyAdmin('other', value, iat)).toBe(false);
    // a session cookie is not an admin cookie
    const s = await signSession(SECRET, { linkId: 'admin', sessionId: String(iat), iat });
    expect(await verifyAdmin(SECRET, s, iat)).toBe(false);
  });
});

describe('cookie parsing / serializing', () => {
  it('parses a header with spaces and stray parts', () => {
    expect(parseCookies('a=1; sc_s=abc.def ; junk; =x')).toEqual({ a: '1', sc_s: 'abc.def' });
    expect(parseCookies(null)).toEqual({});
  });

  it('serializes with the gate defaults', () => {
    expect(serializeCookie('sc_s', 'v', { maxAgeSeconds: 60 })).toBe('sc_s=v; Path=/; Max-Age=60; HttpOnly; Secure; SameSite=Lax');
    expect(serializeCookie('sc_s', 'v', { secure: false })).toBe('sc_s=v; Path=/; HttpOnly; SameSite=Lax');
  });
});
