/// <reference types="@cloudflare/workers-types" />

export interface LinkRow {
  id: string;
  token: string;
  label: string | null;
  notes: string | null;
  created_at: number;
  expires_at: number | null;
  revoked_at: number | null;
  is_internal: number;
}

export interface SessionRow {
  id: string;
  link_id: string;
  started_at: number;
  last_seen_at: number;
  ip_hash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ua: string | null;
  device_class: string | null;
  viewport: string | null;
  fingerprint: string | null;
}

export type LinkStatus = 'active' | 'revoked' | 'expired';

export function linkStatus(link: Pick<LinkRow, 'revoked_at' | 'expires_at'>, now = Date.now()): LinkStatus {
  if (link.revoked_at) return 'revoked';
  if (link.expires_at && link.expires_at <= now) return 'expired';
  return 'active';
}

export async function getLinkByToken(db: D1Database, token: string): Promise<LinkRow | null> {
  return db.prepare('SELECT * FROM links WHERE token = ?1').bind(token).first<LinkRow>();
}

export async function getLinkById(db: D1Database, id: string): Promise<LinkRow | null> {
  return db.prepare('SELECT * FROM links WHERE id = ?1').bind(id).first<LinkRow>();
}

/** Only what the gate needs: nothing → link vanished (treated as invalid). */
export async function getLinkStatus(db: D1Database, id: string): Promise<LinkStatus | null> {
  const row = await db
    .prepare('SELECT revoked_at, expires_at FROM links WHERE id = ?1')
    .bind(id)
    .first<Pick<LinkRow, 'revoked_at' | 'expires_at'>>();
  return row ? linkStatus(row) : null;
}

/** Public JSON shape of a link (camelCase, plus a derived status and shareable URL). */
export interface LinkJson {
  id: string;
  token: string;
  url: string;
  label: string | null;
  notes: string | null;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  isInternal: boolean;
  status: LinkStatus;
}

export function linkToJson(row: LinkRow, origin: string): LinkJson {
  return {
    id: row.id,
    token: row.token,
    url: `${origin}/i/${row.token}`,
    label: row.label,
    notes: row.notes,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    isInternal: row.is_internal === 1,
    status: linkStatus(row),
  };
}

export interface SessionJson {
  id: string;
  linkId: string;
  startedAt: number;
  lastSeenAt: number;
  ipHash: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  ua: string | null;
  deviceClass: string | null;
  viewport: string | null;
  fingerprint: string | null;
}

export function sessionToJson(row: SessionRow): SessionJson {
  return {
    id: row.id,
    linkId: row.link_id,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
    ipHash: row.ip_hash,
    country: row.country,
    region: row.region,
    city: row.city,
    ua: row.ua,
    deviceClass: row.device_class,
    viewport: row.viewport,
    fingerprint: row.fingerprint,
  };
}

export function parseProps(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
