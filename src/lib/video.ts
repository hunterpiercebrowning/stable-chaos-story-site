/**
 * Resolve a `video_link` from the content JSON into something the player can
 * use. WS10 owns the player; WS8 owns the signed-token fetch.
 */

export type VideoKind = 'stream' | 'url' | 'r2' | 'none';

export interface VideoSource {
  kind: VideoKind;
  /** Cloudflare Stream UID, when `kind === 'stream'`. */
  uid?: string;
  /** Directly playable URL, when `kind === 'url'`. */
  url?: string;
  /** R2 object key, when `kind === 'r2'`; needs signing before playback. */
  key?: string;
}

const STREAM_UID = /^[0-9a-f]{32}$/i;
const STREAM_HOST = /(?:^|\.)cloudflarestream\.com$/i;
const STREAM_PATH_UID = /([0-9a-f]{32})/i;

export function resolveVideoSource(link: string | undefined | null): VideoSource {
  const raw = (link ?? '').trim();
  if (!raw) return { kind: 'none' };

  if (STREAM_UID.test(raw)) return { kind: 'stream', uid: raw.toLowerCase() };
  if (raw.startsWith('r2:')) return { kind: 'r2', key: raw.slice(3) };

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { kind: 'none' };
    }
    if (STREAM_HOST.test(url.hostname)) {
      const uid = url.pathname.match(STREAM_PATH_UID)?.[1];
      return uid ? { kind: 'stream', uid: uid.toLowerCase() } : { kind: 'none' };
    }
    if (/\.(mp4|webm|m3u8)$/i.test(url.pathname)) return { kind: 'url', url: raw };
    return { kind: 'url', url: raw };
  }

  return { kind: 'none' };
}

/** WS8 implements `GET /api/video/token?uid=` → `{ token }`. */
export async function fetchStreamToken(uid: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/video/token?uid=${encodeURIComponent(uid)}`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const token = (data as { token?: unknown })?.token;
    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
}
