import { getCookie, isSecure, signVerify, verifyCookie, verifySession, verifyVerify } from './_lib/cookies';
import { getLinkStatus } from './_lib/db';
import { SESSION_COOKIE, VERIFY_COOKIE, VERIFY_INTERVAL_MS, type Fn } from './_lib/env';
import { error, redirect, withHeaders } from './_lib/http';

/**
 * The investor gate. Every request needs a valid `sc_s` cookie except the
 * allowlist below. The link's revoked/expired state is re-checked in D1 at
 * most once per 60s per session, remembered in the signed `sc_v` cookie.
 */

type Reason = 'none' | 'invalid' | 'revoked' | 'expired';

/**
 * Public paths. `/gate` and `/admin` are React routes inside the same bundle,
 * so the Vite build output (`/assets/*.js|css`) has to be public too — see the
 * WS8 handoff note for the trade-off and the WS11 follow-up.
 */
function isPublic(pathname: string): boolean {
  if (pathname === '/gate' || pathname === '/favicon.svg') return true;
  if (pathname.startsWith('/i/')) return true;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  if (pathname.startsWith('/api/admin/')) return true;
  if (pathname.startsWith('/assets/fonts/') || pathname.startsWith('/assets/logos/')) return true;
  if (/^\/assets\/[^/]+\.(?:js|css|woff2?)$/.test(pathname)) return true;
  return false;
}

/** A top-level document request (browser navigation), as opposed to a script/asset/XHR. */
function isNavigation(request: Request): boolean {
  const dest = request.headers.get('sec-fetch-dest');
  if (dest) return dest === 'document';
  return (request.headers.get('accept') ?? '').includes('text/html');
}

function isApi(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function reject(request: Request, reason: Reason, secure: boolean): Response {
  const { pathname } = new URL(request.url);
  const clear = [
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
    `${VERIFY_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`,
  ];
  if (isApi(pathname)) {
    const res = error(401, reason === 'none' ? 'no session' : `session ${reason}`, { reason });
    for (const c of clear) res.headers.append('set-cookie', c);
    return res;
  }
  const res = redirect(request, `/gate?r=${reason}`);
  // Only clear cookies when the session is positively bad; a missing cookie has nothing to clear.
  if (reason !== 'none') for (const c of clear) res.headers.append('set-cookie', c);
  return res;
}

export const onRequest: Fn = async (context) => {
  const { request, env, next, data } = context;
  const url = new URL(request.url);
  const secure = isSecure(request);

  if (isPublic(url.pathname)) {
    // Never let the (unauthenticated) admin bundle requests be cached by a shared cache.
    const res = await next();
    return url.pathname.startsWith('/admin') ? withHeaders(res, { 'cache-control': 'private, no-cache' }) : res;
  }

  if (!env.SESSION_SECRET) return error(500, 'SESSION_SECRET is not configured');

  const raw = getCookie(request, SESSION_COOKIE);
  if (!raw) return reject(request, 'none', secure);
  const session = await verifySession(env.SESSION_SECRET, raw);
  if (!session) return reject(request, 'invalid', secure);

  // Revoke/expiry check: always for HTML navigations (one per page load, so
  // revocation bites on the very next page load), throttled to once per 60s
  // per session for sub-resources and API calls via the signed sc_v cookie.
  const now = Date.now();
  const lastVerified = await verifyVerify(env.SESSION_SECRET, getCookie(request, VERIFY_COOKIE), session.sessionId);
  let setVerify: string | null = null;
  if (
    isNavigation(request) ||
    lastVerified === null ||
    now - lastVerified > VERIFY_INTERVAL_MS ||
    lastVerified > now + 60_000
  ) {
    const status = await getLinkStatus(env.DB, session.linkId);
    if (status === null) return reject(request, 'invalid', secure);
    if (status !== 'active') return reject(request, status, secure);
    setVerify = verifyCookie(await signVerify(env.SESSION_SECRET, session.sessionId, now), secure);
  }

  data.session = session;
  const upstream = await next();

  const headers: Record<string, string> = {};
  const contentType = upstream.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) headers['cache-control'] = 'private, no-cache';
  if (setVerify) headers['set-cookie'] = setVerify;
  if (Object.keys(headers).length === 0) return upstream;
  return withHeaders(upstream, headers, ['set-cookie']);
};
