import { getCookie, verifyAdmin } from '../../_lib/cookies';
import { ADMIN_COOKIE, type Fn } from '../../_lib/env';
import { error, withHeaders } from '../../_lib/http';

/** Everything under `/api/admin/*` except `login` needs the signed `sc_admin` cookie. */
export const onRequest: Fn = async ({ request, env, next }) => {
  const { pathname } = new URL(request.url);
  const open = pathname === '/api/admin/login';
  if (!open) {
    if (!env.SESSION_SECRET) return error(500, 'SESSION_SECRET is not configured');
    const ok = await verifyAdmin(env.SESSION_SECRET, getCookie(request, ADMIN_COOKIE));
    if (!ok) return error(401, 'admin login required');
  }
  return withHeaders(await next(), { 'cache-control': 'no-store' });
};
