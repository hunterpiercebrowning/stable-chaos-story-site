/// <reference types="@cloudflare/workers-types" />

/** Bindings + secrets available to every Pages Function. */
export interface Env {
  DB: D1Database;
  /** HMAC key for the `sc_s` / `sc_v` / `sc_admin` cookies. */
  SESSION_SECRET: string;
  /** `/admin` password (POST /api/admin/login). */
  ADMIN_PASSWORD: string;
  /** Optional separate HMAC key for hashed visitor IPs; falls back to SESSION_SECRET. */
  IP_HASH_SECRET?: string;
  /** Cloudflare Stream signing key id + JWK (raw JSON or the base64 the API returns). */
  STREAM_SIGNING_KEY_ID?: string;
  STREAM_SIGNING_KEY_JWK?: string;
}

/** The verified investor session, attached to `context.data` by `_middleware`. */
export interface SessionData {
  linkId: string;
  sessionId: string;
  iat: number;
}

export interface Data extends Record<string, unknown> {
  session?: SessionData;
}

export type Fn<P extends string = string> = PagesFunction<Env, P, Data>;

export const SESSION_COOKIE = 'sc_s';
export const VERIFY_COOKIE = 'sc_v';
export const ADMIN_COOKIE = 'sc_admin';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;
export const VERIFY_INTERVAL_MS = 60 * 1000;
