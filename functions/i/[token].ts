import { isSecure, sessionCookie, signSession, signVerify, verifyCookie } from '../_lib/cookies';
import { hmac, randomId } from '../_lib/crypto';
import { getLinkByToken, linkStatus } from '../_lib/db';
import { type Fn } from '../_lib/env';
import { clientIp, error, geo, redirect } from '../_lib/http';
import { deviceClassFromUa } from '../_lib/ua';

/**
 * `GET /i/:token` — the only credential. Validates the link, records a
 * session row, sets `sc_s` (and a fresh `sc_v`) and sends the visitor to `/`.
 */
export const onRequestGet: Fn<'token'> = async ({ request, env, params }) => {
  if (!env.SESSION_SECRET) return error(500, 'SESSION_SECRET is not configured');
  const token = typeof params.token === 'string' ? params.token : '';
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) return redirect(request, '/gate?r=invalid');

  const link = await getLinkByToken(env.DB, token);
  if (!link) return redirect(request, '/gate?r=invalid');
  const status = linkStatus(link);
  if (status !== 'active') return redirect(request, `/gate?r=${status}`);

  const now = Date.now();
  const sessionId = randomId();
  const ua = request.headers.get('user-agent') ?? '';
  const ip = clientIp(request);
  const ipHash = ip ? await hmac(env.IP_HASH_SECRET || env.SESSION_SECRET, ip) : null;
  const { country, region, city } = geo(request);

  await env.DB.prepare(
    `INSERT INTO sessions (id, link_id, started_at, last_seen_at, ip_hash, country, region, city, ua, device_class)
     VALUES (?1, ?2, ?3, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(sessionId, link.id, now, ipHash, country, region, city, ua.slice(0, 512), deviceClassFromUa(ua))
    .run();

  const secure = isSecure(request);
  const res = redirect(request, '/');
  res.headers.append('set-cookie', sessionCookie(await signSession(env.SESSION_SECRET, { linkId: link.id, sessionId, iat: now }), secure));
  res.headers.append('set-cookie', verifyCookie(await signVerify(env.SESSION_SECRET, sessionId, now), secure));
  return res;
};
