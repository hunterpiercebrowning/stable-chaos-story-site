import { describe, expect, it } from 'vitest';
import {
  linkStatus,
  normalizeEvent,
  normalizeLink,
  normalizeLinkDetail,
  toMs,
  toWirePatch,
  type AdminEvent,
  type AdminLink,
  type WireEvent,
  type WireLink,
} from './api';
import { resolveExpiry } from './expiry';
import { describeEvent, fmtDuration, shortUa } from './format';
import { mockCounts, mockRequest } from './mock';

const ev = (type: string, props: Record<string, unknown>, nodeId: string | null = null): AdminEvent => ({
  id: 1,
  sessionId: 's',
  ts: 0,
  type,
  layerId: null,
  nodeId,
  props,
});

describe('describeEvent', () => {
  it('resolves node ids to titles', () => {
    expect(describeEvent(ev('node_blur', { nodeId: 'biosecurity', dwellMs: 42_000 })).text).toBe('Left Biosecurity');
    expect(describeEvent(ev('node_blur', { nodeId: 'biosecurity', dwellMs: 42_000 })).detail).toBe('after 42s');
    expect(describeEvent(ev('node_focus', { nodeId: 'red-teaming', via: 'nav' })).text).toBe('Focused Red Teaming');
  });
  it('renders video, search, emphasis and context events', () => {
    const play = describeEvent(ev('video_play', { nodeId: 'red-teaming', pct: 80 }));
    expect(`${play.text} · ${play.detail}`).toBe('Played Red Teaming video · 80%');
    const s = describeEvent(ev('search', { q: 'antenna', resultCount: 3 }));
    expect(`${s.text} · ${s.detail}`).toBe("Searched 'antenna' · 3 results");
    expect(describeEvent(ev('emphasis_change', { value: 'security' })).text).toBe('Emphasis → Security');
    expect(describeEvent(ev('context_item_open', { nodeId: 'synbio', title: 'CSIS article', itemType: 'article' })).text).toBe(
      'Opened context item: CSIS article',
    );
    expect(describeEvent(ev('context_item_open', { itemType: 'pdf', url: 'https://www.nature.com/x' })).text).toBe(
      'Opened context item: pdf · nature.com',
    );
  });
  it('falls back to the raw id and type', () => {
    expect(describeEvent(ev('node_focus', { nodeId: 'not-a-node' })).text).toBe('Focused not-a-node');
    expect(describeEvent(ev('something_new', { a: 1 })).text).toBe('something_new');
  });
});

describe('format helpers', () => {
  it('formats durations', () => {
    expect(fmtDuration(500)).toBe('0s');
    expect(fmtDuration(42_000)).toBe('42s');
    expect(fmtDuration(190_000)).toBe('3m 10s');
    expect(fmtDuration(3_840_000)).toBe('1h 04m');
  });
  it('shortens user agents', () => {
    expect(shortUa('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36')).toBe(
      'Chrome 128 · macOS',
    );
    expect(shortUa('Mozilla/5.0 (Windows NT 10.0) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0')).toBe('Edge 127 · Windows');
    expect(shortUa('')).toBe('Unknown browser');
  });
  it('accepts second or millisecond timestamps', () => {
    expect(toMs(1_700_000_000)).toBe(1_700_000_000_000);
    expect(toMs(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(toMs(null)).toBeNull();
  });
  it('resolves expiry presets', () => {
    expect(resolveExpiry('none', '')).toBeNull();
    expect(resolveExpiry('7d', '', 0)).toBe(7 * 86_400_000);
    expect(resolveExpiry('custom', '')).toBeNull();
  });
  it('derives link status', () => {
    const base: AdminLink = {
      id: 'x',
      token: 't',
      label: '',
      notes: '',
      createdAt: 0,
      expiresAt: null,
      revokedAt: null,
      isInternal: false,
      url: '',
      stats: {
        sessions: 0,
        opens: 0,
        lastSeenAt: null,
        distinctDevices: 0,
        distinctLocations: 0,
        distinctIps: 0,
        forwardSuspect: false,
      },
    };
    expect(linkStatus(base, 100)).toBe('active');
    expect(linkStatus({ ...base, expiresAt: 50 }, 100)).toBe('expired');
    expect(linkStatus({ ...base, expiresAt: 50, revokedAt: 10 }, 100)).toBe('revoked');
  });
});

describe('wire ↔ view mapping (backend is the source of truth)', () => {
  const wire: WireLink = {
    id: 'lnk',
    token: 'tok',
    url: 'https://context.stablechaos.com/i/tok',
    label: null,
    notes: null,
    createdAt: 1_700_000_000_000,
    expiresAt: null,
    revokedAt: null,
    isInternal: false,
    status: 'active',
    stats: {
      sessions: 3,
      opens: 4,
      lastSeenAt: 1_700_000_500_000,
      distinctIps: 2,
      distinctFingerprints: 2,
      distinctCountries: 1,
      forwardSuspect: true,
    },
  };
  it('maps fingerprints → devices and countries → locations, keeps distinctIps', () => {
    const link = normalizeLink(wire);
    expect(link.label).toBe('');
    expect(link.notes).toBe('');
    expect(link.stats).toEqual({
      sessions: 3,
      opens: 4,
      lastSeenAt: 1_700_000_500_000,
      distinctDevices: 2,
      distinctLocations: 1,
      distinctIps: 2,
      forwardSuspect: true,
    });
  });
  it('lifts the detail summary and derives forwarding from stats + sessions', () => {
    const session = (id: string, country: string | null) => ({
      id,
      linkId: 'lnk',
      startedAt: 1,
      lastSeenAt: 2,
      country,
      region: null,
      city: null,
      ua: '',
      deviceClass: 'desktop',
      viewport: '',
      fingerprint: null,
      eventCount: 1,
    });
    const detail = normalizeLinkDetail({
      link: wire,
      sessions: [session('a', 'US'), session('b', 'US'), session('c', null)],
      summary: {
        totalEvents: 9,
        topNodes: [{ nodeId: 'biosecurity', layerId: 'sectors', focusCount: 2, dwellMs: 42_000 }],
        videos: [{ nodeId: 'red-teaming', plays: 1, maxPct: 75 }],
      },
    });
    expect(detail.totalEvents).toBe(9);
    expect(detail.topNodes[0].nodeId).toBe('biosecurity');
    expect(detail.videos[0].maxPct).toBe(75);
    expect(detail.forwarding).toEqual({ distinctIpHashes: 2, distinctFingerprints: 2, countries: { US: 2, '??': 1 } });
    expect(normalizeLinkDetail({ link: wire }).forwarding.countries).toEqual({});
  });
  it('translates { revoked } into revoke / reactivate', () => {
    expect(toWirePatch({ revoked: true })).toEqual({ revoke: true });
    expect(toWirePatch({ revoked: false, label: 'x' })).toEqual({ reactivate: true, label: 'x' });
    expect(toWirePatch({ expiresAt: null })).toEqual({ expiresAt: null });
  });
  it('reads the nested session id and string props off event rows', () => {
    const row: WireEvent = {
      id: 7,
      ts: 1_700_000_000,
      type: 'node_focus',
      layerId: 'sectors',
      nodeId: 'biosecurity',
      props: '{"via":"nav"}',
      session: { id: 'ses_1', deviceClass: 'desktop', country: 'US' },
    };
    const e = normalizeEvent(row);
    expect(e.sessionId).toBe('ses_1');
    expect(e.ts).toBe(1_700_000_000_000);
    expect(e.props).toEqual({ via: 'nav' });
    expect('session' in e).toBe(false);
  });
});

describe('mock API (speaks the backend wire shapes)', () => {
  it('gates everything behind login and answers GET /login with { ok }', async () => {
    expect((await mockRequest('GET', '/api/admin/links')).status).toBe(401);
    expect((await mockRequest('GET', '/api/admin/login')).body).toEqual({ ok: false });
    expect((await mockRequest('POST', '/api/admin/login', { password: 'nope' })).status).toBe(401);
    expect((await mockRequest('POST', '/api/admin/login', { password: 'admin' })).status).toBe(200);
    expect((await mockRequest('GET', '/api/admin/login')).body).toEqual({ ok: true });
  });
  it('serves the fixture set', async () => {
    const counts = mockCounts();
    expect(counts.links).toBe(3);
    expect(counts.sessions).toBe(8);
    expect(counts.events).toBeGreaterThan(150);
    const res = await mockRequest('GET', '/api/admin/links');
    const links = (res.body as { links: WireLink[] }).links;
    expect(links.some((l) => l.stats?.forwardSuspect)).toBe(true);
    expect(links.some((l) => l.isInternal)).toBe(true);
    expect(links.some((l) => l.status === 'revoked')).toBe(true);
    expect(links[0].stats && 'distinctFingerprints' in links[0].stats).toBe(true);
    const types = new Set<string>();
    let cursor: string | null = null;
    do {
      const page = (await mockRequest('GET', `/api/admin/links/lnk_b19e04/events?limit=50${cursor ? `&cursor=${cursor}` : ''}`))
        .body as { events: WireEvent[]; nextCursor: string | null };
      page.events.forEach((e) => {
        types.add(e.type);
        expect(typeof e.session?.id).toBe('string');
      });
      cursor = page.nextCursor;
    } while (cursor);
    for (const t of ['session_start', 'heartbeat', 'layer_view', 'node_focus', 'node_blur', 'search']) expect(types.has(t)).toBe(true);
  });
  it('pages events without gaps or duplicates', async () => {
    const seen = new Set<number>();
    let cursor: string | null = null;
    let pages = 0;
    let lastTs = Number.POSITIVE_INFINITY;
    do {
      const page = (await mockRequest('GET', `/api/admin/links/lnk_7f3a2c/events?limit=40${cursor ? `&cursor=${cursor}` : ''}`))
        .body as { events: AdminEvent[]; nextCursor: string | null };
      for (const e of page.events) {
        expect(seen.has(e.id)).toBe(false);
        seen.add(e.id);
        expect(e.ts <= lastTs).toBe(true);
        lastTs = e.ts;
      }
      cursor = page.nextCursor;
      pages++;
    } while (cursor);
    expect(pages).toBeGreaterThan(1);
    const detail = (await mockRequest('GET', '/api/admin/links/lnk_7f3a2c')).body as {
      sessions: { eventCount: number }[];
      summary: { totalEvents: number };
    };
    expect(seen.size).toBe(detail.sessions.reduce((n, s) => n + s.eventCount, 0));
    expect(detail.summary.totalEvents).toBe(seen.size);
  });
  it('creates, revokes and reactivates links with the backend flags', async () => {
    const created = await mockRequest('POST', '/api/admin/links', { label: 'Test', expiresAt: 123, isInternal: true });
    expect(created.status).toBe(201);
    const body = created.body as { id: string; token: string; url: string; link: WireLink };
    expect(body.url).toBe(`${body.link.url}`);
    expect(body.link.url).toContain(`/i/${body.token}`);
    const revoked = (await mockRequest('PATCH', `/api/admin/links/${body.id}`, { revoke: true })).body as { link: WireLink };
    expect(revoked.link.revokedAt).not.toBeNull();
    expect(revoked.link.status).toBe('revoked');
    const back = (await mockRequest('PATCH', `/api/admin/links/${body.id}`, { reactivate: true, label: 'Renamed' })).body as {
      link: WireLink;
    };
    expect(back.link.revokedAt).toBeNull();
    expect(back.link.label).toBe('Renamed');
    expect((await mockRequest('PATCH', `/api/admin/links/${body.id}`, { revoke: true, reactivate: true })).status).toBe(400);
    expect((await mockRequest('PATCH', `/api/admin/links/${body.id}`, {})).status).toBe(400);
    expect((await mockRequest('PATCH', `/api/admin/links/${body.id}`, { revoked: true })).status).toBe(400);
  });
});
