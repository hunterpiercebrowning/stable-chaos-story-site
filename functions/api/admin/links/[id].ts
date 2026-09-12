import { getLinkById, sessionToJson, type SessionRow } from '../../../_lib/db';
import { type Fn } from '../../../_lib/env';
import { error, json, readJson } from '../../../_lib/http';
import { aggToJson, LINK_AGGREGATE_SQL, parseExpiresAt } from './index';

type AggRow = Parameters<typeof aggToJson>[0];

interface TopNodeRow {
  node_id: string;
  layer_id: string | null;
  focus_count: number;
  dwell_ms: number;
}
interface VideoRow {
  node_id: string;
  plays: number;
  max_pct: number;
}

function idParam(v: unknown): string | null {
  return typeof v === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(v) ? v : null;
}

/**
 * `GET /api/admin/links/:id` →
 * `{ link: LinkWithStats, sessions: (SessionJson & { eventCount })[], summary: { totalEvents, topNodes, videos } }`
 */
export const onRequestGet: Fn<'id'> = async ({ request, env, params }) => {
  const id = idParam(params.id);
  if (!id) return error(400, 'bad id');
  const origin = new URL(request.url).origin;

  const [linkRes, sessionsRes, totalRes, topRes, videoRes] = await env.DB.batch([
    env.DB.prepare(`${LINK_AGGREGATE_SQL} WHERE l.id = ?1`).bind(id),
    env.DB.prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id) AS event_count
       FROM sessions s WHERE s.link_id = ?1 ORDER BY s.started_at DESC LIMIT 500`,
    ).bind(id),
    env.DB.prepare('SELECT COUNT(*) AS n FROM events WHERE link_id = ?1').bind(id),
    env.DB.prepare(
      `SELECT node_id,
              MAX(layer_id) AS layer_id,
              SUM(CASE WHEN type = 'node_focus' THEN 1 ELSE 0 END) AS focus_count,
              COALESCE(SUM(CASE WHEN type = 'node_blur' THEN CAST(json_extract(props, '$.dwellMs') AS INTEGER) ELSE 0 END), 0) AS dwell_ms
       FROM events WHERE link_id = ?1 AND node_id IS NOT NULL AND type IN ('node_focus', 'node_blur')
       GROUP BY node_id HAVING focus_count > 0
       ORDER BY focus_count DESC, dwell_ms DESC LIMIT 25`,
    ).bind(id),
    env.DB.prepare(
      `SELECT node_id,
              SUM(CASE WHEN type = 'video_play' THEN 1 ELSE 0 END) AS plays,
              COALESCE(MAX(CASE WHEN type = 'video_complete' THEN 100 ELSE CAST(json_extract(props, '$.pct') AS INTEGER) END), 0) AS max_pct
       FROM events WHERE link_id = ?1 AND node_id IS NOT NULL
         AND type IN ('video_play', 'video_progress', 'video_complete')
       GROUP BY node_id ORDER BY max_pct DESC, plays DESC LIMIT 50`,
    ).bind(id),
  ]);

  const linkRow = linkRes.results[0] as AggRow | undefined;
  if (!linkRow) return error(404, 'link not found');

  const sessions = (sessionsRes.results as (SessionRow & { event_count: number })[]).map((s) => ({
    ...sessionToJson(s),
    eventCount: s.event_count ?? 0,
  }));
  const totalEvents = (totalRes.results[0] as { n: number } | undefined)?.n ?? 0;
  const topNodes = (topRes.results as TopNodeRow[]).map((r) => ({
    nodeId: r.node_id,
    layerId: r.layer_id,
    focusCount: r.focus_count,
    dwellMs: r.dwell_ms,
  }));
  const videos = (videoRes.results as VideoRow[]).map((r) => ({ nodeId: r.node_id, plays: r.plays, maxPct: r.max_pct }));

  return json({ link: aggToJson(linkRow, origin), sessions, summary: { totalEvents, topNodes, videos } });
};

/**
 * `PATCH /api/admin/links/:id` `{ revoke?: true, reactivate?: true, expiresAt?, label?, notes? }`
 * → `{ link: LinkWithStats }`. `expiresAt: null` clears the expiry.
 */
export const onRequestPatch: Fn<'id'> = async ({ request, env, params }) => {
  const id = idParam(params.id);
  if (!id) return error(400, 'bad id');
  const existing = await getLinkById(env.DB, id);
  if (!existing) return error(404, 'link not found');

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error(400, 'invalid JSON');
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (col: string, v: unknown) => {
    sets.push(`${col} = ?${binds.length + 2}`);
    binds.push(v);
  };

  if (b.revoke === true && b.reactivate === true) return error(400, 'revoke and reactivate are exclusive');
  if (b.revoke === true) set('revoked_at', Date.now());
  if (b.reactivate === true) set('revoked_at', null);
  try {
    const expiresAt = parseExpiresAt(b.expiresAt);
    if (expiresAt !== undefined) set('expires_at', expiresAt);
  } catch (e) {
    return error(400, e instanceof Error ? e.message : 'bad request');
  }
  if (b.label !== undefined) {
    if (b.label !== null && typeof b.label !== 'string') return error(400, 'label must be a string');
    set('label', b.label ? String(b.label).trim().slice(0, 200) || null : null);
  }
  if (b.notes !== undefined) {
    if (b.notes !== null && typeof b.notes !== 'string') return error(400, 'notes must be a string');
    set('notes', b.notes ? String(b.notes).trim().slice(0, 2000) || null : null);
  }
  if (b.isInternal !== undefined) set('is_internal', b.isInternal === true ? 1 : 0);
  if (sets.length === 0) return error(400, 'nothing to update');

  await env.DB.prepare(`UPDATE links SET ${sets.join(', ')} WHERE id = ?1`).bind(id, ...binds).run();

  const origin = new URL(request.url).origin;
  const row = await env.DB.prepare(`${LINK_AGGREGATE_SQL} WHERE l.id = ?1`).bind(id).first<AggRow>();
  if (!row) return error(404, 'link not found');
  return json({ link: aggToJson(row, origin) });
};
