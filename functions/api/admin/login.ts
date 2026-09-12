import { adminCookie, getCookie, isSecure, signAdmin, verifyAdmin } from '../../_lib/cookies';
import { timingSafeEqual } from '../../_lib/crypto';
import { ADMIN_COOKIE, type Fn } from '../../_lib/env';
import { error, json, readJson } from '../../_lib/http';

/** `POST /api/admin/login` `{ password }` → `{ ok: true }` + `sc_admin` cookie (12h). */
export const onRequestPost: Fn = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return error(500, 'ADMIN_PASSWORD / SESSION_SECRET not configured');
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return error(400, 'invalid JSON');
  }
  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== 'string') return error(400, 'password required');
  if (!timingSafeEqual(password, env.ADMIN_PASSWORD)) return error(401, 'wrong password');
  const res = json({ ok: true });
  res.headers.append('set-cookie', adminCookie(await signAdmin(env.SESSION_SECRET), isSecure(request)));
  return res;
};

/** `GET /api/admin/login` → `{ ok }` — whether the current `sc_admin` cookie is valid. */
export const onRequestGet: Fn = async ({ request, env }) => {
  const ok = env.SESSION_SECRET ? await verifyAdmin(env.SESSION_SECRET, getCookie(request, ADMIN_COOKIE)) : false;
  return json({ ok });
};
