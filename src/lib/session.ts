/**
 * Current session (the tokenized link the viewer arrived on).
 *
 * WS7 stub: `GET /api/session` → `{ label?, linkId? }`, `null` on any error.
 * WS8 owns the real implementation and replaces this file at merge; the
 * signature must stay `getSession(): Promise<Session | null>`.
 */

export interface Session {
  label?: string;
  linkId?: string;
}

let cached: Promise<Session | null> | undefined;

export function getSession(): Promise<Session | null> {
  cached ??= fetchSession();
  return cached;
}

async function fetchSession(): Promise<Session | null> {
  try {
    const res = await fetch('/api/session', { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object') return null;
    const { label, linkId } = data as { label?: unknown; linkId?: unknown };
    return {
      label: typeof label === 'string' && label.trim() ? label.trim() : undefined,
      linkId: typeof linkId === 'string' ? linkId : undefined,
    };
  } catch {
    return null;
  }
}
