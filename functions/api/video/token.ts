import { encodeUtf8Base64Url, fromBase64Url, toBase64Url } from '../../_lib/crypto';
import { type Fn } from '../../_lib/env';
import { error, json } from '../../_lib/http';

/**
 * `GET /api/video/token?uid=<stream uid>` → `{ token }`.
 * RS256 JWT for Cloudflare Stream signed playback, 1h expiry. 501 until the
 * `STREAM_SIGNING_KEY_ID` / `STREAM_SIGNING_KEY_JWK` secrets are set.
 */

const TOKEN_TTL_S = 60 * 60;
const UID = /^[0-9a-f]{32}$/i;

let cachedKey: { jwk: string; key: Promise<CryptoKey> } | null = null;

function parseJwk(raw: string): JsonWebKey {
  const text = raw.trim().startsWith('{') ? raw.trim() : new TextDecoder().decode(fromBase64Url(raw.trim()));
  return JSON.parse(text) as JsonWebKey;
}

function signingKey(jwkRaw: string): Promise<CryptoKey> {
  if (cachedKey?.jwk === jwkRaw) return cachedKey.key;
  const key = crypto.subtle.importKey('jwk', parseJwk(jwkRaw), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  cachedKey = { jwk: jwkRaw, key };
  return key;
}

export async function signStreamToken(keyId: string, jwkRaw: string, uid: string, now = Date.now()): Promise<string> {
  const header = encodeUtf8Base64Url(JSON.stringify({ alg: 'RS256', kid: keyId }));
  const exp = Math.floor(now / 1000) + TOKEN_TTL_S;
  const payload = encodeUtf8Base64Url(JSON.stringify({ sub: uid, kid: keyId, exp, nbf: Math.floor(now / 1000) - 60 }));
  const key = await signingKey(jwkRaw);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${toBase64Url(sig)}`;
}

export const onRequestGet: Fn = async ({ request, env, data }) => {
  if (!data.session) return error(401, 'no session');
  const uid = new URL(request.url).searchParams.get('uid') ?? '';
  if (!UID.test(uid)) return error(400, 'uid must be a 32-hex Cloudflare Stream UID');
  if (!env.STREAM_SIGNING_KEY_ID || !env.STREAM_SIGNING_KEY_JWK) {
    return error(501, 'Stream signing is not configured (STREAM_SIGNING_KEY_ID / STREAM_SIGNING_KEY_JWK)');
  }
  try {
    const token = await signStreamToken(env.STREAM_SIGNING_KEY_ID, env.STREAM_SIGNING_KEY_JWK, uid.toLowerCase());
    return json({ token });
  } catch (e) {
    return error(500, `could not sign token: ${e instanceof Error ? e.message : String(e)}`);
  }
};
