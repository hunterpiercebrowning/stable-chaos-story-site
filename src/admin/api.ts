/**
 * Typed client for the admin API (build plan §5.8).
 *
 * Every route `functions/api/admin/**` exposes has one function here. The
 * backend is the source of truth for the wire shapes (see the WS8 table in
 * build-plans/03-progress.md); this module maps them onto the view shapes the
 * UI was built against, so the pages never see the difference:
 *
 *   - `stats.distinctFingerprints` → `distinctDevices`, `distinctCountries` →
 *     `distinctLocations` (`distinctIps` is kept as is)
 *   - detail `{ link, sessions, summary: { totalEvents, topNodes, videos } }` →
 *     `{ link, sessions, topNodes, videos, forwarding, totalEvents }` with
 *     `forwarding` derived from `link.stats` + the session rows
 *   - `PATCH { revoked: boolean }` → `{ revoke: true }` / `{ reactivate: true }`
 *   - events carry `session: { id, … }`; the UI reads `sessionId`
 *   - timestamps are epoch milliseconds (seconds tolerated by `toMs`)
 *
 * `VITE_ADMIN_MOCK=1` swaps the transport for the in-memory fixtures in
 * `./mock.ts`, which speak the backend's wire shapes so the same mapping runs.
 * The check is a build-time constant, so the mock module (and its fixtures)
 * never reaches a production bundle.
 */

/* ── shapes ───────────────────────────────────────────── */

export type LinkStatus = 'active' | 'revoked' | 'expired';

export interface LinkStats {
  /** Rows in `sessions` for this link. */
  sessions: number;
  /** `session_start` events (one per page load; may exceed sessions if a cookie is reused). */
  opens: number;
  lastSeenAt: number | null;
  /** Distinct `fingerprint` values across sessions (wire: `distinctFingerprints`). */
  distinctDevices: number;
  /** Distinct countries across sessions (wire: `distinctCountries`). */
  distinctLocations: number;
  /** Distinct hashed IPs across sessions. */
  distinctIps: number;
  /** Server's forwarding heuristic: >1 fingerprint or >1 country. */
  forwardSuspect: boolean;
}

/** `stats` exactly as `GET /api/admin/links` emits it. */
export interface WireLinkStats {
  sessions?: number;
  opens?: number;
  lastSeenAt?: number | null;
  distinctIps?: number;
  distinctFingerprints?: number;
  distinctCountries?: number;
  forwardSuspect?: boolean;
}

export interface AdminLink {
  id: string;
  token: string;
  label: string;
  notes: string;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  isInternal: boolean;
  /** Absolute invitation URL, e.g. `https://context.stablechaos.com/i/<token>`. */
  url: string;
  /** Server-derived at response time; `linkStatus()` recomputes it against the local clock. */
  status?: LinkStatus;
  stats: LinkStats;
}

/** A link as the wire carries it (before `normalizeLink`). */
export type WireLink = Omit<AdminLink, 'stats' | 'label' | 'notes'> & {
  label: string | null;
  notes: string | null;
  stats?: WireLinkStats | LinkStats;
};

export interface AdminSession {
  id: string;
  linkId: string;
  startedAt: number;
  lastSeenAt: number;
  country: string | null;
  region: string | null;
  city: string | null;
  ua: string;
  deviceClass: string;
  viewport: string;
  fingerprint: string | null;
  eventCount: number;
}

export interface TopNode {
  nodeId: string;
  layerId?: string | null;
  focusCount: number;
  /** Sum of `node_blur.dwellMs`. */
  dwellMs: number;
}

export interface VideoStat {
  nodeId: string;
  plays: number;
  /** Highest `pct` seen across play/progress/complete events. */
  maxPct: number;
}

export interface ForwardingFlags {
  distinctIpHashes: number;
  distinctFingerprints: number;
  /** Sessions per country code (`??` when the edge sent no geo). */
  countries: Record<string, number>;
}

export interface LinkDetail {
  link: AdminLink;
  sessions: AdminSession[];
  topNodes: TopNode[];
  videos: VideoStat[];
  forwarding: ForwardingFlags;
  totalEvents: number;
}

/** `GET /api/admin/links/:id` as the wire carries it. */
export interface WireLinkDetail {
  link: WireLink;
  sessions?: AdminSession[];
  summary?: { totalEvents?: number; topNodes?: TopNode[]; videos?: VideoStat[] };
}

export interface AdminEvent {
  id: number;
  sessionId: string;
  ts: number;
  type: string;
  layerId: string | null;
  nodeId: string | null;
  props: Record<string, unknown>;
}

/** An event row as the wire carries it: the session comes nested. */
export type WireEvent = Omit<AdminEvent, 'sessionId' | 'props'> & {
  sessionId?: string;
  session?: { id: string; deviceClass?: string | null; country?: string | null };
  props?: Record<string, unknown> | string | null;
};

export interface EventsPage {
  /** Newest first. */
  events: AdminEvent[];
  /** Opaque; null when there are no older events. */
  nextCursor: string | null;
}

export interface CreateLinkInput {
  label: string;
  notes?: string;
  expiresAt?: number | null;
  isInternal?: boolean;
}

export interface PatchLinkInput {
  label?: string;
  notes?: string;
  expiresAt?: number | null;
  /** `true` revokes (sets `revoked_at` now), `false` reactivates (clears it). */
  revoked?: boolean;
}

/* ── errors ───────────────────────────────────────────── */

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof AdminApiError && err.status === 401;
}

/* ── transport ────────────────────────────────────────── */

export const MOCK = import.meta.env.VITE_ADMIN_MOCK === '1';

type Method = 'GET' | 'POST' | 'PATCH';

export interface RawResponse {
  status: number;
  body: unknown;
}

async function send(method: Method, path: string, body?: unknown): Promise<RawResponse> {
  if (MOCK) {
    // Dead code in production builds: Vite inlines VITE_* and the branch is dropped.
    const { mockRequest } = await import('./mock');
    return mockRequest(method, path, body);
  }
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed };
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const { status, body: data } = await send(method, path, body);
  if (status >= 200 && status < 300) return data as T;
  const message =
    (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error
      : null) ?? defaultMessage(status);
  throw new AdminApiError(status, message);
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Not signed in';
  if (status === 404) return 'Not found';
  if (status === 409) return 'Conflict';
  return `Request failed (${status})`;
}

/* ── normalization ────────────────────────────────────── */

/** D1 stores INT timestamps; accept seconds or milliseconds. */
export function toMs(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' ? Number(v) : (v as number);
  if (!Number.isFinite(n)) return null;
  return n < 1e11 ? n * 1000 : n;
}

function normalizeStats(raw: WireLinkStats | Partial<LinkStats> | undefined): LinkStats {
  const s = (raw ?? {}) as WireLinkStats & Partial<LinkStats>;
  return {
    sessions: s.sessions ?? 0,
    opens: s.opens ?? 0,
    lastSeenAt: toMs(s.lastSeenAt),
    distinctDevices: s.distinctFingerprints ?? s.distinctDevices ?? 0,
    distinctLocations: s.distinctCountries ?? s.distinctLocations ?? 0,
    distinctIps: s.distinctIps ?? 0,
    forwardSuspect: Boolean(s.forwardSuspect),
  };
}

export function normalizeLink(raw: WireLink): AdminLink {
  return {
    ...raw,
    notes: raw.notes ?? '',
    label: raw.label ?? '',
    isInternal: Boolean(raw.isInternal),
    createdAt: toMs(raw.createdAt) ?? 0,
    expiresAt: toMs(raw.expiresAt),
    revokedAt: toMs(raw.revokedAt),
    url: raw.url ?? `${location.origin}/i/${raw.token}`,
    stats: normalizeStats(raw.stats),
  };
}

/**
 * Detail: the backend nests the aggregates under `summary` and has no
 * `forwarding` object — derive it from the link's stats and the session rows.
 */
export function normalizeLinkDetail(raw: WireLinkDetail): LinkDetail {
  const link = normalizeLink(raw.link);
  const sessions = (raw.sessions ?? []).map(normalizeSession);
  const countries: Record<string, number> = {};
  for (const s of sessions) {
    const key = s.country ?? '??';
    countries[key] = (countries[key] ?? 0) + 1;
  }
  return {
    link,
    sessions,
    topNodes: raw.summary?.topNodes ?? [],
    videos: raw.summary?.videos ?? [],
    totalEvents: raw.summary?.totalEvents ?? 0,
    forwarding: {
      distinctIpHashes: link.stats.distinctIps,
      distinctFingerprints: link.stats.distinctDevices,
      countries,
    },
  };
}

function normalizeSession(raw: AdminSession): AdminSession {
  return {
    ...raw,
    startedAt: toMs(raw.startedAt) ?? 0,
    lastSeenAt: toMs(raw.lastSeenAt) ?? toMs(raw.startedAt) ?? 0,
    ua: raw.ua ?? '',
    deviceClass: raw.deviceClass ?? 'unknown',
    viewport: raw.viewport ?? '',
    eventCount: raw.eventCount ?? 0,
  };
}

export function normalizeEvent(raw: WireEvent): AdminEvent {
  let props: Record<string, unknown> = {};
  const p = raw.props as unknown;
  if (typeof p === 'string') {
    try {
      props = JSON.parse(p) as Record<string, unknown>;
    } catch {
      props = {};
    }
  } else if (p && typeof p === 'object') {
    props = p as Record<string, unknown>;
  }
  const { session: _session, ...rest } = raw;
  return {
    ...rest,
    sessionId: raw.sessionId ?? raw.session?.id ?? '',
    ts: toMs(raw.ts) ?? 0,
    layerId: raw.layerId ?? null,
    nodeId: raw.nodeId ?? null,
    props,
  };
}

/* ── status helper ────────────────────────────────────── */

export function linkStatus(link: AdminLink, now = Date.now()): LinkStatus {
  if (link.revokedAt) return 'revoked';
  if (link.expiresAt && link.expiresAt <= now) return 'expired';
  return 'active';
}

/* ── routes ───────────────────────────────────────────── */

export async function login(password: string): Promise<void> {
  await request<unknown>('POST', '/api/admin/login', { password });
}

/** `GET /api/admin/login` → is the current `sc_admin` cookie valid? Never throws. */
export async function checkLogin(): Promise<boolean> {
  try {
    const data = await request<{ ok?: boolean }>('GET', '/api/admin/login');
    return Boolean(data && data.ok);
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await request<unknown>('POST', '/api/admin/logout');
}

export async function listLinks(): Promise<AdminLink[]> {
  const data = await request<{ links: WireLink[] } | WireLink[]>('GET', '/api/admin/links');
  const arr = Array.isArray(data) ? data : data.links;
  return arr.map(normalizeLink);
}

/** `POST /api/admin/links` → `201 { id, token, url, link }`. */
export async function createLink(input: CreateLinkInput): Promise<AdminLink> {
  const data = await request<{ id: string; token: string; url: string; link: WireLink | null }>(
    'POST',
    '/api/admin/links',
    {
      label: input.label,
      notes: input.notes ?? '',
      expiresAt: input.expiresAt ?? null,
      isInternal: Boolean(input.isInternal),
    },
  );
  if (data.link) return normalizeLink(data.link);
  // The aggregate re-read failed server-side; build the row from what we do know.
  return normalizeLink({
    id: data.id,
    token: data.token,
    url: data.url,
    label: input.label,
    notes: input.notes ?? '',
    createdAt: Date.now(),
    expiresAt: input.expiresAt ?? null,
    revokedAt: null,
    isInternal: Boolean(input.isInternal),
  });
}

/** Translate the UI's `{ revoked: boolean }` into the backend's `revoke` / `reactivate` flags. */
export function toWirePatch(patch: PatchLinkInput): Record<string, unknown> {
  const { revoked, ...rest } = patch;
  const wire: Record<string, unknown> = { ...rest };
  if (revoked === true) wire.revoke = true;
  if (revoked === false) wire.reactivate = true;
  return wire;
}

export async function patchLink(id: string, patch: PatchLinkInput): Promise<AdminLink> {
  const data = await request<{ link: WireLink }>(
    'PATCH',
    `/api/admin/links/${encodeURIComponent(id)}`,
    toWirePatch(patch),
  );
  return normalizeLink(data.link);
}

export async function getLink(id: string): Promise<LinkDetail> {
  const data = await request<WireLinkDetail>('GET', `/api/admin/links/${encodeURIComponent(id)}`);
  return normalizeLinkDetail(data);
}

export async function getEvents(
  id: string,
  cursor: string | null,
  limit = 50,
): Promise<EventsPage> {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  qs.set('limit', String(limit));
  const data = await request<{ events?: WireEvent[]; nextCursor?: string | null }>(
    'GET',
    `/api/admin/links/${encodeURIComponent(id)}/events?${qs.toString()}`,
  );
  return {
    events: (data.events ?? []).map(normalizeEvent),
    nextCursor: data.nextCursor ?? null,
  };
}
