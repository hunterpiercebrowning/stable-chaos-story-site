import { type Fn } from '../_lib/env';
import { error, json } from '../_lib/http';

/** `GET /api/session` → `{ label, linkId, sessionId }` for the welcome personalization. */
export const onRequestGet: Fn = async ({ env, data }) => {
  const session = data.session;
  if (!session) return error(401, 'no session');
  const row = await env.DB.prepare('SELECT label FROM links WHERE id = ?1').bind(session.linkId).first<{ label: string | null }>();
  if (!row) return error(401, 'no session');
  return json({ label: row.label, linkId: session.linkId, sessionId: session.sessionId });
};
