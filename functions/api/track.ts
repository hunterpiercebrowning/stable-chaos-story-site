import { type Fn } from '../_lib/env';
import { parseBatch } from '../_lib/events';
import { error, noContent, readJson } from '../_lib/http';
import { isDeviceClass } from '../_lib/ua';

/**
 * `POST /api/track` — a JSON array (≤50) of `{type, ts, layerId?, nodeId?, props?}`.
 * Accepts `text/plain` bodies (sendBeacon). Always 204 once the session is valid,
 * even if individual events were dropped, so the client never retries.
 */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  const session = data.session;
  if (!session) return error(401, 'no session');

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error(400, 'invalid JSON');
  }
  const batch = parseBatch(body);
  if (!batch) return error(400, 'expected an array of at most 50 events');

  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  const insert = env.DB.prepare(
    'INSERT INTO events (session_id, link_id, ts, type, layer_id, node_id, props) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
  );

  for (const ev of batch.events) {
    statements.push(
      insert.bind(session.sessionId, session.linkId, ev.ts, ev.type, ev.layerId, ev.nodeId, JSON.stringify(ev.props)),
    );
    if (ev.type === 'session_start') {
      const p = ev.props;
      const viewport = typeof p.viewport === 'string' ? p.viewport.slice(0, 32) : null;
      const fingerprint = typeof p.fingerprint === 'string' ? p.fingerprint.slice(0, 128) : null;
      const deviceClass = isDeviceClass(p.deviceClass) ? p.deviceClass : null;
      statements.push(
        env.DB.prepare(
          `UPDATE sessions SET viewport = COALESCE(?2, viewport), fingerprint = COALESCE(?3, fingerprint),
             device_class = COALESCE(?4, device_class) WHERE id = ?1`,
        ).bind(session.sessionId, viewport, fingerprint, deviceClass),
      );
    }
  }
  statements.push(env.DB.prepare('UPDATE sessions SET last_seen_at = ?2 WHERE id = ?1').bind(session.sessionId, now));

  await env.DB.batch(statements);
  return noContent();
};
