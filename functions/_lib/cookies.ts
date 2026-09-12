import {
  ADMIN_COOKIE,
  ADMIN_TTL_MS,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  VERIFY_COOKIE,
  type SessionData,
} from './env';
import { signPayload, verifyPayload } from './crypto';

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name) continue;
    out[name] = part.slice(eq + 1).trim();
  }
  return out;
}

export function getCookie(request: Request, name: string): string | undefined {
  return parseCookies(request.headers.get('cookie'))[name];
}

export interface CookieOptions {
  maxAgeSeconds?: number;
  /** Omit `Secure` on plain-http local dev so browsers keep the cookie. */
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  path?: string;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${value}`, `Path=${opts.path ?? '/'}`];
  if (opts.maxAgeSeconds !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(opts.maxAgeSeconds))}`);
  if (opts.httpOnly ?? true) parts.push('HttpOnly');
  if (opts.secure ?? true) parts.push('Secure');
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

/** `Secure` only when the request itself is https (wrangler pages dev is http). */
export function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

export function clearCookie(name: string, secure: boolean): string {
  return serializeCookie(name, '', { maxAgeSeconds: 0, secure });
}

// ---- sc_s: investor session ------------------------------------------------

/** `sc_s` = base64url(`linkId.sessionId.iat`) + `.` + HMAC-SHA256. */
export async function signSession(secret: string, s: SessionData): Promise<string> {
  return signPayload(secret, `${s.linkId}.${s.sessionId}.${s.iat}`, 'session');
}

export async function verifySession(
  secret: string,
  value: string | undefined | null,
  now = Date.now(),
): Promise<SessionData | null> {
  const payload = await verifyPayload(secret, value, 'session');
  if (!payload) return null;
  const fields = payload.split('.');
  if (fields.length !== 3) return null;
  const [linkId, sessionId, iatRaw] = fields;
  const iat = Number(iatRaw);
  if (!linkId || !sessionId || !Number.isFinite(iat)) return null;
  if (now - iat > SESSION_TTL_MS || iat > now + 60_000) return null;
  return { linkId, sessionId, iat };
}

export function sessionCookie(value: string, secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, value, { maxAgeSeconds: SESSION_TTL_MS / 1000, secure });
}

// ---- sc_v: last link-status verification --------------------------------------

/** `sc_v` = base64url(`sessionId.verifiedAt`) + `.` + HMAC. */
export async function signVerify(secret: string, sessionId: string, verifiedAt: number): Promise<string> {
  return signPayload(secret, `${sessionId}.${verifiedAt}`, 'verify');
}

export async function verifyVerify(
  secret: string,
  value: string | undefined | null,
  sessionId: string,
): Promise<number | null> {
  const payload = await verifyPayload(secret, value, 'verify');
  if (!payload) return null;
  const fields = payload.split('.');
  if (fields.length !== 2) return null;
  const [sid, atRaw] = fields;
  const at = Number(atRaw);
  if (sid !== sessionId || !Number.isFinite(at)) return null;
  return at;
}

export function verifyCookie(value: string, secure: boolean): string {
  return serializeCookie(VERIFY_COOKIE, value, { maxAgeSeconds: SESSION_TTL_MS / 1000, secure });
}

// ---- sc_admin ------------------------------------------------------------------

/** `sc_admin` = base64url(`admin.iat`) + `.` + HMAC. 12h. */
export async function signAdmin(secret: string, iat = Date.now()): Promise<string> {
  return signPayload(secret, `admin.${iat}`, 'admin');
}

export async function verifyAdmin(
  secret: string,
  value: string | undefined | null,
  now = Date.now(),
): Promise<boolean> {
  const payload = await verifyPayload(secret, value, 'admin');
  if (!payload) return false;
  const fields = payload.split('.');
  if (fields.length !== 2) return false;
  const [tag, iatRaw] = fields;
  const iat = Number(iatRaw);
  if (tag !== 'admin' || !Number.isFinite(iat)) return false;
  return now - iat <= ADMIN_TTL_MS && iat <= now + 60_000;
}

export function adminCookie(value: string, secure: boolean): string {
  return serializeCookie(ADMIN_COOKIE, value, { maxAgeSeconds: ADMIN_TTL_MS / 1000, secure });
}
