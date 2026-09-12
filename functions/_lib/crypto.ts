/**
 * WebCrypto helpers shared by the cookie signer, IP hashing and the Stream JWT.
 * Everything here works in Workers and in Node >= 20 (vitest).
 */

const enc = new TextEncoder();

export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeUtf8Base64Url(text: string): string {
  return toBase64Url(enc.encode(text));
}

export function decodeUtf8Base64Url(s: string): string {
  return new TextDecoder().decode(fromBase64Url(s));
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let p = keyCache.get(secret);
  if (!p) {
    p = crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    keyCache.set(secret, p);
  }
  return p;
}

/** HMAC-SHA256(secret, message) as base64url. */
export async function hmac(secret: string, message: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(sig);
}

/** Constant-time string equality (same length required). */
export function timingSafeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/**
 * Sign an opaque payload string: `base64url(payload).base64url(hmac)`.
 * The payload itself is dot-separated fields, so it is base64url-encoded as a whole.
 * `purpose` domain-separates the key so a cookie of one kind never verifies as another.
 */
export async function signPayload(secret: string, payload: string, purpose = ''): Promise<string> {
  const body = encodeUtf8Base64Url(payload);
  return `${body}.${await hmac(`${secret}|${purpose}`, body)}`;
}

/** Verify a value produced by `signPayload`; returns the payload or null. */
export async function verifyPayload(secret: string, value: string | undefined | null, purpose = ''): Promise<string | null> {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(sig)) return null;
  const expected = await hmac(`${secret}|${purpose}`, body);
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    return decodeUtf8Base64Url(body);
  } catch {
    return null;
  }
}

/** Random base64url token, `bytes` bytes of entropy (24 → 32 chars). */
export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

export function randomId(): string {
  return crypto.randomUUID();
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
