import { randomId, randomToken } from '../../../_lib/crypto';
import { linkToJson, type LinkJson, type LinkRow } from '../../../_lib/db';
import { type Fn } from '../../../_lib/env';
import { error, json, readJson } from '../../../_lib/http';

export interface LinkStats {
  sessions: number;
  /** `session_start` events (one per page load). */
  opens: number;
  lastSeenAt: number | null;
  distinctIps: number;
  distinctFingerprints: number;
  distinctCountries: number;
  /** More than one fingerprint or country seen on this link. */
  forwardSuspect: boolean;
}

export type LinkWithStats = LinkJson & { stats: LinkStats };

type AggRow = LinkRow & {
  sessions: number;
  opens: number;
  last_seen: number | null;
  distinct_ips: number;
  distinct_fps: number;
  distinct_countries: number;
};

export const LINK_AGGREGATE_SQL = `
  SELECT l.*,
    (SELECT COUNT(*) FROM sessions s WHERE s.link_id = l.id) AS sessions,
    (SELECT COUNT(*) FROM events e WHERE e.link_id = l.id AND e.type = 'session_start') AS opens,
    (SELECT MAX(s.last_seen_at) FROM sessions s WHERE s.link_id = l.id) AS last_seen,
    (SELECT COUNT(DISTINCT s.ip_hash) FROM sessions s WHERE s.link_id = l.id AND s.ip_hash IS NOT NULL) AS distinct_ips,
    (SELECT COUNT(DISTINCT s.fingerprint) FROM sessions s WHERE s.link_id = l.id AND s.fingerprint IS NOT NULL) AS distinct_fps,
    (SELECT COUNT(DISTINCT s.country) FROM sessions s WHERE s.link_id = l.id AND s.country IS NOT NULL) AS distinct_countries
  FROM links l`;

export function aggToJson(row: AggRow, origin: string): LinkWithStats {
  return {
    ...linkToJson(row, origin),
    stats: {
      sessions: row.sessions ?? 0,
      opens: row.opens ?? 0,
      lastSeenAt: row.last_seen ?? null,
      distinctIps: row.distinct_ips ?? 0,
      distinctFingerprints: row.distinct_fps ?? 0,
      distinctCountries: row.distinct_countries ?? 0,
      forwardSuspect: (row.distinct_fps ?? 0) > 1 || (row.distinct_countries ?? 0) > 1,
    },
  };
}

/** `GET /api/admin/links` → `{ links: LinkWithStats[] }`, newest first. */
export const onRequestGet: Fn = async ({ request, env }) => {
  const origin = new URL(request.url).origin;
  const { results } = await env.DB.prepare(`${LINK_AGGREGATE_SQL} ORDER BY l.created_at DESC`).all<AggRow>();
  return json({ links: results.map((r) => aggToJson(r, origin)) });
};

/** Accepts epoch ms, an ISO string, or null. Undefined → not provided. */
export function parseExpiresAt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === 'string') {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
  }
  throw new Error('expiresAt must be epoch milliseconds, an ISO date string, or null');
}

function optionalText(v: unknown, field: string, max = 500): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') throw new Error(`${field} must be a string`);
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * `POST /api/admin/links` `{ label?, notes?, expiresAt?, isInternal? }`
 * → `{ id, token, url, link: LinkWithStats }` (201). `url` uses the request origin.
 */
export const onRequestPost: Fn = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error(400, 'invalid JSON');
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  let label: string | null | undefined;
  let notes: string | null | undefined;
  let expiresAt: number | null | undefined;
  try {
    label = optionalText(b.label, 'label', 200);
    notes = optionalText(b.notes, 'notes', 2000);
    expiresAt = parseExpiresAt(b.expiresAt);
  } catch (e) {
    return error(400, e instanceof Error ? e.message : 'bad request');
  }
  const isInternal = b.isInternal === true ? 1 : 0;
  const now = Date.now();
  const id = randomId();
  const token = randomToken(24);

  await env.DB.prepare(
    'INSERT INTO links (id, token, label, notes, created_at, expires_at, revoked_at, is_internal) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7)',
  )
    .bind(id, token, label ?? null, notes ?? null, now, expiresAt ?? null, isInternal)
    .run();

  const origin = new URL(request.url).origin;
  const row = await env.DB.prepare(`${LINK_AGGREGATE_SQL} WHERE l.id = ?1`).bind(id).first<AggRow>();
  const link = row ? aggToJson(row, origin) : null;
  return json({ id, token, url: `${origin}/i/${token}`, link }, 201);
};
