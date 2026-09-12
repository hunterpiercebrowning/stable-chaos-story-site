/**
 * Typed client for the admin API (build plan §5.8).
 *
 * Every route WS8 exposes under `/api/admin/*` has one function here. The
 * response shapes below are the contract the UI is built against; WS8 /
 * integration must confirm them (see the WS9 note in build-plans/03-progress.md).
 *
 * `VITE_ADMIN_MOCK=1` swaps the transport for the in-memory fixtures in
 * `./mock.ts`. The check is a build-time constant, so the mock module (and its
 * fixtures) never reaches a production bundle.
 */

/* ── shapes ───────────────────────────────────────────── */

export type LinkStatus = 'active' | 'revoked' | 'expired';

export interface LinkStats {
  /** Rows in `sessions` for this link. */
  sessions: number;
  /** Times `/i/<token>` was hit (may exceed sessions if a cookie is reused). */
  opens: number;
  lastSeenAt: number | null;
  /** Distinct `fingerprint` values across sessions. */
  distinctDevices: number;
  /** Distinct country/region/city tuples across sessions. */
  distinctLocations: number;
  /** Server's forwarding heuristic: >1 device or >1 location or >1 ip_hash. */
  forwardSuspect: boolean;
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
  stats: LinkStats;
}

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
  countries: Record<string, number>;
}

export interface LinkDetail {
  link: AdminLink;
  sessions: AdminSession[];
  topNodes: TopNode[];
  videos: VideoStat[];
  forwarding: ForwardingFlags;
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

function normalizeLink(raw: AdminLink): AdminLink {
  const stats = raw.stats ?? ({} as Partial<LinkStats>);
  return {
    ...raw,
    notes: raw.notes ?? '',
    label: raw.label ?? '',
    isInternal: Boolean(raw.isInternal),
    createdAt: toMs(raw.createdAt) ?? 0,
    expiresAt: toMs(raw.expiresAt),
    revokedAt: toMs(raw.revokedAt),
    url: raw.url ?? `${location.origin}/i/${raw.token}`,
    stats: {
      sessions: stats.sessions ?? 0,
      opens: stats.opens ?? 0,
      lastSeenAt: toMs(stats.lastSeenAt),
      distinctDevices: stats.distinctDevices ?? 0,
      distinctLocations: stats.distinctLocations ?? 0,
      forwardSuspect: Boolean(stats.forwardSuspect),
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

function normalizeEvent(raw: AdminEvent): AdminEvent {
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
  return {
    ...raw,
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

export async function logout(): Promise<void> {
  await request<unknown>('POST', '/api/admin/logout');
}

export async function listLinks(): Promise<AdminLink[]> {
  const data = await request<{ links: AdminLink[] } | AdminLink[]>('GET', '/api/admin/links');
  const arr = Array.isArray(data) ? data : data.links;
  return arr.map(normalizeLink);
}

export async function createLink(input: CreateLinkInput): Promise<AdminLink> {
  const data = await request<{ link: AdminLink } | AdminLink>('POST', '/api/admin/links', {
    label: input.label,
    notes: input.notes ?? '',
    expiresAt: input.expiresAt ?? null,
    isInternal: Boolean(input.isInternal),
  });
  return normalizeLink('link' in data ? data.link : data);
}

export async function patchLink(id: string, patch: PatchLinkInput): Promise<AdminLink> {
  const data = await request<{ link: AdminLink } | AdminLink>(
    'PATCH',
    `/api/admin/links/${encodeURIComponent(id)}`,
    patch,
  );
  return normalizeLink('link' in data ? data.link : data);
}

export async function getLink(id: string): Promise<LinkDetail> {
  const data = await request<LinkDetail>('GET', `/api/admin/links/${encodeURIComponent(id)}`);
  return {
    link: normalizeLink(data.link),
    sessions: (data.sessions ?? []).map(normalizeSession),
    topNodes: data.topNodes ?? [],
    videos: data.videos ?? [],
    forwarding: data.forwarding ?? { distinctIpHashes: 0, distinctFingerprints: 0, countries: {} },
  };
}

export async function getEvents(
  id: string,
  cursor: string | null,
  limit = 50,
): Promise<EventsPage> {
  const qs = new URLSearchParams();
  if (cursor) qs.set('cursor', cursor);
  qs.set('limit', String(limit));
  const data = await request<EventsPage>(
    'GET',
    `/api/admin/links/${encodeURIComponent(id)}/events?${qs.toString()}`,
  );
  return {
    events: (data.events ?? []).map(normalizeEvent),
    nextCursor: data.nextCursor ?? null,
  };
}
