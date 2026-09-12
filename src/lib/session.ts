/**
 * The current investor session, as told by `GET /api/session`.
 * Fetched once per page load and cached; `null` when there is no session or
 * the request fails (the gate middleware would have redirected already, so
 * `null` in practice means "dev without the API running").
 */

export interface SessionInfo {
  /** Optional per-link label for "Prepared for …". */
  label?: string;
  linkId?: string;
  sessionId?: string;
}

let cached: Promise<SessionInfo | null> | null = null;

export function getSession(): Promise<SessionInfo | null> {
  if (!cached) {
    cached = load().catch(() => null);
  }
  return cached;
}

/** Test helper — forget the cached result. */
export function resetSessionCache(): void {
  cached = null;
}

async function load(): Promise<SessionInfo | null> {
  if (typeof fetch !== 'function') return null;
  const res = await fetch('/api/session', { credentials: 'same-origin', headers: { accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { label?: unknown; linkId?: unknown; sessionId?: unknown };
  const out: SessionInfo = {};
  if (typeof data.label === 'string' && data.label) out.label = data.label;
  if (typeof data.linkId === 'string') out.linkId = data.linkId;
  if (typeof data.sessionId === 'string') out.sessionId = data.sessionId;
  return out;
}
