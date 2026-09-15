/**
 * In-memory stand-in for the admin API, used when `VITE_ADMIN_MOCK=1`.
 *
 * Fixtures: 3 links (one forward-suspect, one internal, one revoked), 8
 * sessions and ~200 events spanning every §6 event type. Mutations (create,
 * patch, login) persist for the lifetime of the page. Generation is seeded so
 * the data is identical on every load.
 *
 * Responses use the **backend's wire shapes** (`functions/api/admin/**`), not
 * the UI's view shapes, so `api.ts` runs the same normalization against the
 * mock as against production.
 *
 * Only ever imported dynamically from `api.ts` behind the MOCK constant.
 */
import type {
  AdminEvent,
  AdminSession,
  RawResponse,
  WireEvent,
  WireLink,
  WireLinkDetail,
} from './api';

export const MOCK_PASSWORD = 'admin';

/* ── seeded PRNG (mulberry32) ─────────────────────────── */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260912);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/* ── content vocab (real node ids from content/*.json) ── */

const NODES: Record<string, string[]> = {
  who: ['hunter-browning', 'ben-schultz', 'jared-schnefke', 'trace-williams'],
  beliefs: ['trusted-access', 'consilience', 'nth-specificity', 'compute', 'china'],
  sectors: ['synbio', 'security', 'biosecurity', 'cloud-lab', 'cyber', 'signals-and-spectrum'],
  services: ['starling-intel', 'red-teaming', 'growth-curve-bio', 'biomolecule-rapid-prototyping'],
  products: ['conus-coat', 'conformal-tactical-antennas', 'starling-os', 'private-pear', 'operatoriq'],
};
const LAYERS = Object.keys(NODES);
const VIDEO_NODES = ['red-teaming', 'starling-intel', 'conus-coat', 'conformal-tactical-antennas'];
const QUERIES = ['antenna', 'bio', 'red team', 'china', 'starling', 'plasma'];
const CONTEXT_ITEMS = [
  { title: 'CSIS article', itemType: 'article', url: 'https://www.csis.org/analysis/biosecurity' },
  { title: 'Nature paper', itemType: 'pdf', url: 'https://www.nature.com/articles/s41586' },
  { title: 'Economist piece', itemType: 'article', url: 'https://www.economist.com/science' },
  { title: 'Founder interview', itemType: 'video', url: 'https://youtube.com/watch?v=x' },
];

/* ── fixtures ─────────────────────────────────────────── */

const NOW = Date.now();
const H = 3_600_000;
const D = 24 * H;
const ORIGIN = 'https://context.stablechaos.com';

interface Row extends Omit<WireLink, 'stats' | 'url' | 'status' | 'label' | 'notes'> {
  label: string;
  notes: string;
}

let nextLinkN = 4;
let nextEventId = 1;

const links: Row[] = [
  {
    id: 'lnk_7f3a2c',
    token: 'q8Zr4wT2mNp9LxK1sVb6',
    label: 'Sequoia: Partner meeting',
    notes: 'Sent to Alfred 9/3 after the intro call. Follow-up scheduled 9/16.',
    createdAt: NOW - 9 * D,
    expiresAt: NOW + 21 * D,
    revokedAt: null,
    isInternal: false,
  },
  {
    id: 'lnk_b19e04',
    token: 'H2kd8Fq3Wm7XcP5nRt0y',
    label: 'Internal: Hunter',
    notes: 'For rehearsals and screenshots. Never share.',
    createdAt: NOW - 14 * D,
    expiresAt: null,
    revokedAt: null,
    isInternal: true,
  },
  {
    id: 'lnk_c44d10',
    token: 'Vg6Ls1Rn3Zq9Tk8Mw2Bx',
    label: 'a16z Bio + Health',
    notes: 'Cold intro via Jared. Revoked after the deck leaked to a portfolio company.',
    createdAt: NOW - 20 * D,
    expiresAt: NOW - 2 * D,
    revokedAt: NOW - 5 * D,
    isInternal: false,
  },
];

interface SessionSeed {
  linkId: string;
  startedAt: number;
  minutes: number;
  country: string;
  region: string;
  city: string;
  ua: string;
  deviceClass: string;
  viewport: string;
  fingerprint: string;
  ipHash: string;
  intensity: number;
}

const UA_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const UA_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0';
const UA_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const sessionSeeds: SessionSeed[] = [
  // Sequoia: three devices, three locations → forward suspect.
  { linkId: 'lnk_7f3a2c', startedAt: NOW - 8 * D - 3 * H, minutes: 34, country: 'US', region: 'CA', city: 'Menlo Park', ua: UA_MAC, deviceClass: 'desktop', viewport: '1728x1117', fingerprint: 'fp_a1', ipHash: 'ip_01', intensity: 1.2 },
  { linkId: 'lnk_7f3a2c', startedAt: NOW - 6 * D - 5 * H, minutes: 12, country: 'US', region: 'CA', city: 'Menlo Park', ua: UA_MAC, deviceClass: 'desktop', viewport: '1728x1117', fingerprint: 'fp_a1', ipHash: 'ip_01', intensity: 0.7 },
  { linkId: 'lnk_7f3a2c', startedAt: NOW - 3 * D - 2 * H, minutes: 41, country: 'US', region: 'NY', city: 'New York', ua: UA_WIN, deviceClass: 'desktop', viewport: '1920x1080', fingerprint: 'fp_b7', ipHash: 'ip_22', intensity: 1.4 },
  { linkId: 'lnk_7f3a2c', startedAt: NOW - 1 * D - 7 * H, minutes: 18, country: 'GB', region: 'ENG', city: 'London', ua: UA_SAFARI, deviceClass: 'desktop', viewport: '1440x900', fingerprint: 'fp_c3', ipHash: 'ip_40', intensity: 0.9 },
  { linkId: 'lnk_7f3a2c', startedAt: NOW - 5 * H, minutes: 2, country: 'GB', region: 'ENG', city: 'London', ua: UA_IPHONE, deviceClass: 'mobile', viewport: '390x844', fingerprint: 'fp_c9', ipHash: 'ip_41', intensity: 0 },
  // Internal: Hunter rehearsing.
  { linkId: 'lnk_b19e04', startedAt: NOW - 2 * D - 4 * H, minutes: 55, country: 'US', region: 'MO', city: 'Kansas City', ua: UA_MAC, deviceClass: 'desktop', viewport: '1440x900', fingerprint: 'fp_h1', ipHash: 'ip_77', intensity: 1.6 },
  { linkId: 'lnk_b19e04', startedAt: NOW - 3 * H, minutes: 9, country: 'US', region: 'MO', city: 'Kansas City', ua: UA_MAC, deviceClass: 'desktop', viewport: '1440x900', fingerprint: 'fp_h1', ipHash: 'ip_77', intensity: 0.5 },
  // a16z: one visit before revoke.
  { linkId: 'lnk_c44d10', startedAt: NOW - 12 * D - 1 * H, minutes: 22, country: 'US', region: 'CA', city: 'San Francisco', ua: UA_WIN, deviceClass: 'desktop', viewport: '2560x1440', fingerprint: 'fp_z2', ipHash: 'ip_90', intensity: 1.0 },
];

interface SessionRow extends AdminSession {
  ipHash: string;
}

const sessions: SessionRow[] = [];
const events: AdminEvent[] = [];

function push(
  s: SessionRow,
  ts: number,
  type: string,
  layerId: string | null,
  nodeId: string | null,
  props: Record<string, unknown> = {},
) {
  events.push({ id: nextEventId++, sessionId: s.id, ts, type, layerId, nodeId, props });
}

/** Simulates one visit: layers → focus/blur → video/search/context, with heartbeats. */
function simulate(s: SessionRow, seed: SessionSeed) {
  let t = s.startedAt;
  const end = s.startedAt + seed.minutes * 60_000;
  push(s, t, 'session_start', null, null, {
    deviceClass: seed.deviceClass,
    viewport: seed.viewport,
    fingerprint: seed.fingerprint,
    tz: seed.country === 'GB' ? 'Europe/London' : 'America/Chicago',
    lang: 'en-US',
    referrer: '',
  });
  if (seed.intensity === 0) {
    // Mobile blocker: tracked as an open, nothing else.
    s.lastSeenAt = t + 20_000;
    return;
  }
  let lastHeartbeat = t;
  let layer = 'who';
  let node: string | null = null;
  const steps = Math.round(18 * seed.intensity);
  for (let i = 0; i < steps && t < end; i++) {
    t += between(4_000, 60_000);
    while (t - lastHeartbeat >= 30_000) {
      lastHeartbeat += 30_000;
      push(s, lastHeartbeat, 'heartbeat', layer, node, { layerId: layer, nodeId: node });
    }
    const roll = rand();
    if (roll < 0.22 || i === 0) {
      layer = i === 0 ? 'who' : pick(LAYERS);
      node = null;
      push(s, t, 'layer_view', layer, null, {
        layerId: layer,
        via: i === 0 ? 'url' : pick(['arrow', 'nav', 'keyboard', 'search']),
      });
    } else if (roll < 0.58) {
      const target = pick(NODES[layer]);
      const via = pick(['nav', 'click', 'keyboard', 'related', 'search']);
      push(s, t, 'node_focus', layer, target, { layerId: layer, nodeId: target, via });
      node = target;
      const dwell = between(6_000, 95_000);
      t += dwell;
      if (rand() < 0.35 && VIDEO_NODES.includes(target)) {
        const pct = pick([25, 50, 75, 100]);
        push(s, t - dwell + 2000, 'video_play', layer, target, { nodeId: target, source: 'stream', pct: 0 });
        for (const p of [25, 50, 75]) {
          if (p <= pct) push(s, t - dwell + 2000 + p * 200, 'video_progress', layer, target, { nodeId: target, source: 'stream', pct: p });
        }
        if (pct === 100) push(s, t - 1000, 'video_complete', layer, target, { nodeId: target, source: 'stream', pct: 100 });
        else push(s, t - 1000, 'video_pause', layer, target, { nodeId: target, source: 'stream', pct });
      } else if (rand() < 0.3) {
        const item = pick(CONTEXT_ITEMS);
        push(s, t - Math.floor(dwell / 2), 'context_item_open', layer, target, { nodeId: target, ...item });
      } else if (rand() < 0.2) {
        push(s, t - Math.floor(dwell / 3), 'external_link', layer, target, {
          nodeId: target,
          url: 'https://starlingintel.com',
        });
      }
      push(s, t, 'node_blur', layer, target, { layerId: layer, nodeId: target, dwellMs: dwell });
      if (rand() < 0.25) {
        const to = pick(NODES[pick(LAYERS)]);
        push(s, t + 500, 'related_click', layer, target, { fromNodeId: target, toNodeId: to });
      }
      node = null;
    } else if (roll < 0.7) {
      const q = pick(QUERIES);
      push(s, t, 'search', layer, node, { q, resultCount: between(0, 7) });
    } else if (roll < 0.86) {
      push(s, t, 'density_change', layer, node, { value: pick(['compressed', 'expanded']) });
    } else {
      push(s, t, 'presentation_toggle', layer, node, { on: rand() < 0.5 });
    }
  }
  s.lastSeenAt = Math.min(t, end);
}

sessionSeeds.forEach((seed, i) => {
  const s: SessionRow = {
    id: `ses_${(i + 1).toString(16).padStart(2, '0')}${seed.fingerprint.slice(3)}`,
    linkId: seed.linkId,
    startedAt: seed.startedAt,
    lastSeenAt: seed.startedAt,
    country: seed.country,
    region: seed.region,
    city: seed.city,
    ua: seed.ua,
    deviceClass: seed.deviceClass,
    viewport: seed.viewport,
    fingerprint: seed.fingerprint,
    ipHash: seed.ipHash,
    eventCount: 0,
  };
  sessions.push(s);
  simulate(s, seed);
});
for (const s of sessions) s.eventCount = events.filter((e) => e.sessionId === s.id).length;
events.sort((a, b) => b.ts - a.ts || b.id - a.id);

/* ── derived views ────────────────────────────────────── */

function status(row: Row): 'active' | 'revoked' | 'expired' {
  if (row.revokedAt) return 'revoked';
  if (row.expiresAt && row.expiresAt <= Date.now()) return 'expired';
  return 'active';
}

/** `LinkWithStats` as `functions/api/admin/links/index.ts` emits it. */
function withStats(row: Row): WireLink {
  const ss = sessions.filter((s) => s.linkId === row.id);
  const fingerprints = new Set(ss.map((s) => s.fingerprint));
  const countries = new Set(ss.map((s) => s.country));
  const ips = new Set(ss.map((s) => s.ipHash));
  return {
    ...row,
    url: `${ORIGIN}/i/${row.token}`,
    status: status(row),
    stats: {
      sessions: ss.length,
      opens: ss.length,
      lastSeenAt: ss.length ? Math.max(...ss.map((s) => s.lastSeenAt)) : null,
      distinctIps: ips.size,
      distinctFingerprints: fingerprints.size,
      distinctCountries: countries.size,
      forwardSuspect: fingerprints.size > 1 || countries.size > 1,
    },
  };
}

/** `GET /api/admin/links/:id` → `{ link, sessions, summary: { totalEvents, topNodes, videos } }`. */
function detail(row: Row): WireLinkDetail {
  const ss = sessions.filter((s) => s.linkId === row.id);
  const ids = new Set(ss.map((s) => s.id));
  const evs = events.filter((e) => ids.has(e.sessionId));
  const top = new Map<string, { layerId: string | null; focusCount: number; dwellMs: number }>();
  const vids = new Map<string, { plays: number; maxPct: number }>();
  for (const e of evs) {
    if (e.type === 'node_focus' && e.nodeId) {
      const t = top.get(e.nodeId) ?? { layerId: e.layerId, focusCount: 0, dwellMs: 0 };
      t.focusCount++;
      top.set(e.nodeId, t);
    }
    if (e.type === 'node_blur' && e.nodeId) {
      const t = top.get(e.nodeId) ?? { layerId: e.layerId, focusCount: 0, dwellMs: 0 };
      t.dwellMs += Number(e.props.dwellMs ?? 0);
      top.set(e.nodeId, t);
    }
    if (e.type.startsWith('video_') && e.nodeId) {
      const v = vids.get(e.nodeId) ?? { plays: 0, maxPct: 0 };
      if (e.type === 'video_play') v.plays++;
      v.maxPct = Math.max(v.maxPct, Number(e.props.pct ?? 0));
      vids.set(e.nodeId, v);
    }
  }
  return {
    link: withStats(row),
    // The backend returns ipHash too; the UI never shows it.
    sessions: ss.slice().sort((a, b) => b.startedAt - a.startedAt),
    summary: {
      totalEvents: evs.length,
      topNodes: [...top.entries()]
        .filter(([, t]) => t.focusCount > 0)
        .map(([nodeId, t]) => ({ nodeId, ...t }))
        .sort((a, b) => b.focusCount - a.focusCount || b.dwellMs - a.dwellMs),
      videos: [...vids.entries()]
        .map(([nodeId, v]) => ({ nodeId, ...v }))
        .sort((a, b) => b.maxPct - a.maxPct || b.plays - a.plays),
    },
  };
}

/** `GET …/events` rows carry the session nested, as the backend's LEFT JOIN does. */
function toWireEvent(e: AdminEvent): WireEvent {
  const { sessionId, ...rest } = e;
  const s = sessions.find((x) => x.id === sessionId);
  return {
    ...rest,
    session: {
      id: sessionId,
      deviceClass: s?.deviceClass ?? null,
      country: s?.country ?? null,
    },
  };
}

function eventsPage(row: Row, cursor: string | null, limit: number): { events: WireEvent[]; nextCursor: string | null } {
  const ids = new Set(sessions.filter((s) => s.linkId === row.id).map((s) => s.id));
  const all = events.filter((e) => ids.has(e.sessionId));
  const start = cursor ? all.findIndex((e) => String(e.id) === cursor) + 1 : 0;
  const page = all.slice(start, start + limit);
  const last = page[page.length - 1];
  return {
    events: page.map(toWireEvent),
    nextCursor: last && start + limit < all.length ? String(last.id) : null,
  };
}

/* ── request router ───────────────────────────────────── */

// Survives a dev-server reload so refreshing the page does not bounce to the login.
const AUTH_KEY = 'sc-admin-mock-authed';
let authed = (() => {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === '1';
  } catch {
    return false;
  }
})();
function setAuthed(v: boolean) {
  authed = v;
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (v) sessionStorage.setItem(AUTH_KEY, '1');
      else sessionStorage.removeItem(AUTH_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

const ok = (body: unknown): RawResponse => ({ status: 200, body });
const err = (status: number, error: string): RawResponse => ({ status, body: { error } });

const wait = (ms: number) =>
  import.meta.env?.MODE === 'test' ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, ms));

function token(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 20; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Like the backend's `parseExpiresAt`: epoch ms, ISO string, or null/empty. */
function parseExpires(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === 'string' && v) {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

export async function mockRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<RawResponse> {
  await wait(120 + Math.random() * 180);
  const url = new URL(path, 'http://mock');
  const parts = url.pathname.split('/').filter(Boolean); // ['api','admin',...]
  const rest = parts.slice(2);
  const input = (body ?? {}) as Record<string, unknown>;

  if (rest[0] === 'login') {
    // GET → { ok } (is the cookie valid); POST { password } → { ok: true } + cookie.
    if (method === 'GET') return ok({ ok: authed });
    if (input.password === MOCK_PASSWORD) {
      setAuthed(true);
      return ok({ ok: true });
    }
    return err(401, 'wrong password');
  }
  if (method === 'POST' && rest[0] === 'logout') {
    setAuthed(false);
    return ok({ ok: true });
  }
  if (!authed) return err(401, 'admin login required');

  if (rest[0] !== 'links') return err(404, 'Not found');

  if (rest.length === 1) {
    if (method === 'GET') return ok({ links: links.map(withStats) });
    if (method === 'POST') {
      const label = String(input.label ?? '').trim();
      const row: Row = {
        id: `lnk_${(nextLinkN++).toString(16).padStart(6, '0')}`,
        token: token(),
        label,
        notes: String(input.notes ?? ''),
        createdAt: Date.now(),
        expiresAt: parseExpires(input.expiresAt),
        revokedAt: null,
        isInternal: input.isInternal === true,
      };
      links.unshift(row);
      // 201 { id, token, url, link } — `url` from the request origin in production.
      return { status: 201, body: { id: row.id, token: row.token, url: `${ORIGIN}/i/${row.token}`, link: withStats(row) } };
    }
    return err(405, 'Method not allowed');
  }

  const row = links.find((l) => l.id === rest[1]);
  if (!row) return err(404, 'link not found');

  if (rest.length === 2) {
    if (method === 'GET') return ok(detail(row));
    if (method === 'PATCH') {
      // { revoke?: true, reactivate?: true, expiresAt?, label?, notes?, isInternal? }
      if (input.revoke === true && input.reactivate === true) return err(400, 'revoke and reactivate are exclusive');
      let touched = 0;
      if (input.revoke === true) {
        row.revokedAt = Date.now();
        touched++;
      }
      if (input.reactivate === true) {
        row.revokedAt = null;
        touched++;
      }
      if (typeof input.label === 'string' || input.label === null) {
        row.label = input.label ? input.label.trim() : '';
        touched++;
      }
      if (typeof input.notes === 'string' || input.notes === null) {
        row.notes = input.notes ?? '';
        touched++;
      }
      if ('expiresAt' in input) {
        row.expiresAt = parseExpires(input.expiresAt);
        touched++;
      }
      if ('isInternal' in input) {
        row.isInternal = input.isInternal === true;
        touched++;
      }
      if (touched === 0) return err(400, 'nothing to update');
      return ok({ link: withStats(row) });
    }
    return err(405, 'Method not allowed');
  }

  if (rest.length === 3 && rest[2] === 'events' && method === 'GET') {
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
    return ok(eventsPage(row, url.searchParams.get('cursor'), limit));
  }
  return err(404, 'Not found');
}

/** Test hook: totals for assertions. */
export function mockCounts() {
  return { links: links.length, sessions: sessions.length, events: events.length };
}
