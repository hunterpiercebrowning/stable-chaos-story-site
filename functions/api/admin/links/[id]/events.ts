import { parseProps } from '../../../../_lib/db';
import { type Fn } from '../../../../_lib/env';
import { error, json } from '../../../../_lib/http';

interface Row {
  id: number;
  ts: number;
  type: string;
  layer_id: string | null;
  node_id: string | null;
  props: string | null;
  session_id: string;
  device_class: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * `GET /api/admin/links/:id/events?cursor=&limit=&session=` → `{ events, nextCursor }`,
 * newest first. `cursor` is the last `id` from the previous page (opaque to clients).
 */
export const onRequestGet: Fn<'id'> = async ({ request, env, params }) => {
  const id = typeof params.id === 'string' ? params.id : '';
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return error(400, 'bad id');
  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitRaw) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw))) : DEFAULT_LIMIT;
  const cursorRaw = url.searchParams.get('cursor');
  const cursor = cursorRaw ? Number(cursorRaw) : null;
  if (cursor !== null && (!Number.isFinite(cursor) || cursor < 0)) return error(400, 'bad cursor');
  const sessionFilter = url.searchParams.get('session');

  const exists = await env.DB.prepare('SELECT 1 AS x FROM links WHERE id = ?1').bind(id).first();
  if (!exists) return error(404, 'link not found');

  const where = ['e.link_id = ?1'];
  const binds: unknown[] = [id];
  if (cursor !== null) {
    binds.push(cursor);
    where.push(`e.id < ?${binds.length}`);
  }
  if (sessionFilter) {
    binds.push(sessionFilter);
    where.push(`e.session_id = ?${binds.length}`);
  }
  binds.push(limit + 1);

  const { results } = await env.DB.prepare(
    `SELECT e.id, e.ts, e.type, e.layer_id, e.node_id, e.props, e.session_id,
            s.device_class, s.country, s.region, s.city
     FROM events e LEFT JOIN sessions s ON s.id = e.session_id
     WHERE ${where.join(' AND ')}
     ORDER BY e.id DESC LIMIT ?${binds.length}`,
  )
    .bind(...binds)
    .all<Row>();

  const page = results.slice(0, limit);
  const nextCursor = results.length > limit ? String(page[page.length - 1].id) : null;
  return json({
    events: page.map((r) => ({
      id: r.id,
      ts: r.ts,
      type: r.type,
      layerId: r.layer_id,
      nodeId: r.node_id,
      props: parseProps(r.props),
      session: { id: r.session_id, deviceClass: r.device_class, country: r.country, region: r.region, city: r.city },
    })),
    nextCursor,
  });
};
