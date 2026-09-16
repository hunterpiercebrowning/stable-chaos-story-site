/**
 * Video source resolution + Cloudflare Stream helpers (WS10).
 *
 * `resolveVideoSource()` turns a content `video_link` into something the player
 * can act on. The signed-token endpoint (`GET /api/video/token?uid=` → `{token}`,
 * 501 when Stream is not configured) is WS8's; this file only calls it.
 *
 * Client env (see `.env.example`):
 *   VITE_STREAM_CUSTOMER_CODE — the `customer-<code>` subdomain for Stream embeds.
 */

export type VideoSource =
  | { kind: 'none' }
  | { kind: 'stream'; uid: string }
  | { kind: 'r2'; key: string }
  | { kind: 'youtube'; id: string }
  | { kind: 'url'; url: string; mime: string };

export type VideoKind = VideoSource['kind'];

const STREAM_UID = /^[0-9a-f]{32}$/i;
const STREAM_HOST = /(?:^|\.)(?:cloudflarestream\.com|videodelivery\.net)$/i;
const STREAM_PATH_UID = /(?:^|\/)([0-9a-f]{32})(?=\/|$)/i;

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
  m3u8: 'application/vnd.apple.mpegurl',
};

/** MIME type for a media URL, from its path extension. `''` when unknown. */
export function mimeForUrl(url: string): string {
  let pathname = url;
  try {
    pathname = new URL(url).pathname;
  } catch {
    /* treat as a bare path */
  }
  const ext = pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? '';
}

export function resolveVideoSource(link: string | undefined | null): VideoSource {
  const raw = (link ?? '').trim();
  if (!raw) return { kind: 'none' };

  if (STREAM_UID.test(raw)) return { kind: 'stream', uid: raw.toLowerCase() };
  if (/^r2:/i.test(raw)) {
    const key = raw.slice(3).trim();
    return key ? { kind: 'r2', key } : { kind: 'none' };
  }

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return { kind: 'none' };
    }
    const youtube = youTubeId(raw);
    if (youtube) return { kind: 'youtube', id: youtube };
    if (STREAM_HOST.test(url.hostname)) {
      const uid = url.pathname.match(STREAM_PATH_UID)?.[1];
      return uid ? { kind: 'stream', uid: uid.toLowerCase() } : { kind: 'none' };
    }
    // Anything else is handed to <video>; an unknown extension gets an empty
    // mime and the browser sniffs it (the player surfaces a visible error if
    // it cannot be decoded).
    return { kind: 'url', url: raw, mime: mimeForUrl(raw) };
  }

  return { kind: 'none' };
}

/* ── YouTube ─────────────────────────────────────────── */

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOST = /(?:^|\.)(?:youtube\.com|youtube-nocookie\.com)$/i;

/**
 * The 11-character video id from a YouTube link: `watch?v=`, `youtu.be/`,
 * `/embed/`, `/shorts/`, `/live/` and `/v/`. `null` for anything else.
 */
export function youTubeId(link: string | undefined | null): string | null {
  let url: URL;
  try {
    url = new URL((link ?? '').trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  let id: string | null | undefined = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = url.pathname.split('/')[1];
  } else if (YOUTUBE_HOST.test(host)) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1];
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** Privacy-enhanced embed URL for the player iframe. */
export function youTubeEmbedUrl(id: string, opts: { autoplay?: boolean } = {}): string {
  const params = new URLSearchParams({ rel: '0', playsinline: '1', modestbranding: '1' });
  if (opts.autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

/**
 * Thumbnail for a video link, or `''` when the link has none we can derive
 * (only YouTube today). Asks for the 1280px frame; pair the `<img>` with
 * `youTubeThumbnailFallback` for the videos that do not have one.
 */
export function videoThumbnail(link: string | undefined | null): string {
  const id = youTubeId(link);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : '';
}

/**
 * `maxresdefault.jpg` is missing for some videos; YouTube then answers 404
 * with a 120×90 grey frame, which may load rather than error. Either way, swap
 * to `hqdefault.jpg`, which every video has. A no-op for any other image, so
 * it is safe on every `<img>` that might show a video thumbnail.
 */
export function youTubeThumbnailFallback(img: HTMLImageElement, failed: boolean): void {
  if (!img.src.includes('/maxresdefault.jpg')) return;
  if (failed || img.naturalWidth <= 120) img.src = img.src.replace('/maxresdefault.jpg', '/hqdefault.jpg');
}

/* ── Cloudflare Stream ───────────────────────────────── */

export const STREAM_SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';

/** `customer-<code>` subdomain for embeds. Empty when not configured. */
export function getStreamCustomerCode(): string {
  const code: unknown = import.meta.env?.VITE_STREAM_CUSTOMER_CODE;
  return typeof code === 'string' ? code.trim() : '';
}

export interface StreamEmbedOptions {
  /** Overrides `VITE_STREAM_CUSTOMER_CODE`. */
  customerCode?: string;
  autoplay?: boolean;
  muted?: boolean;
  poster?: string;
  preload?: 'auto' | 'metadata' | 'none';
}

/**
 * Player iframe URL. Falls back to the generic `iframe.videodelivery.net`
 * host when no customer code is configured (works for unsigned public videos,
 * which is all a dev machine without Stream credentials can play anyway).
 */
export function streamEmbedUrl(tokenOrUid: string, opts: StreamEmbedOptions = {}): string {
  const code = opts.customerCode ?? getStreamCustomerCode();
  const base = code
    ? `https://customer-${code}.cloudflarestream.com/${tokenOrUid}/iframe`
    : `https://iframe.videodelivery.net/${tokenOrUid}`;
  const params = new URLSearchParams();
  if (opts.autoplay) params.set('autoplay', 'true');
  if (opts.muted) params.set('muted', 'true');
  if (opts.preload) params.set('preload', opts.preload);
  // Data-URI posters would blow the URL length; only forward real URLs.
  if (opts.poster && /^https?:\/\//i.test(opts.poster)) params.set('poster', opts.poster);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export type StreamTokenResult =
  | { ok: true; token: string }
  /** `unconfigured` = endpoint answered 501; `unavailable` = anything else. */
  | { ok: false; reason: 'unconfigured' | 'unavailable' };

/** `GET /api/video/token?uid=` → `{ token }` (WS8). Never throws. */
export async function requestStreamToken(uid: string): Promise<StreamTokenResult> {
  try {
    const res = await fetch(`/api/video/token?uid=${encodeURIComponent(uid)}`, {
      headers: { accept: 'application/json' },
    });
    if (res.status === 501) return { ok: false, reason: 'unconfigured' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data: unknown = await res.json();
    const token = (data as { token?: unknown })?.token;
    return typeof token === 'string' && token
      ? { ok: true, token }
      : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Back-compat wrapper: the token, or `null` when signing is unavailable. */
export async function fetchStreamToken(uid: string): Promise<string | null> {
  const r = await requestStreamToken(uid);
  return r.ok ? r.token : null;
}

export interface StreamPlayback {
  /** What goes in the embed path: the signed token, or the bare UID as a fallback. */
  src: string;
  signed: boolean;
  /** Present only when `signed === false`. */
  reason?: 'unconfigured' | 'unavailable';
}

/**
 * Signed playback when the backend can sign; otherwise the unsigned UID so an
 * unsigned/public video (dev, samples) still plays. The player shows a note
 * whenever `signed` is false.
 */
export async function resolveStreamPlayback(uid: string): Promise<StreamPlayback> {
  const r = await requestStreamToken(uid);
  return r.ok ? { src: r.token, signed: true } : { src: uid, signed: false, reason: r.reason };
}

/* ── Stream player SDK (loaded on demand, no npm package) ── */

/** The subset of the Stream SDK player we use (`Stream(iframe)`). */
export interface StreamPlayerApi {
  play(): Promise<void> | void;
  pause(): void;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly currentTime: number;
  readonly duration: number;
  muted: boolean;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

export type StreamSdk = (iframe: HTMLIFrameElement) => StreamPlayerApi;

declare global {
  interface Window {
    Stream?: StreamSdk;
  }
}

let sdkPromise: Promise<StreamSdk> | null = null;

/** Injects `sdk.latest.js` once and resolves `window.Stream`. */
export function loadStreamSdk(): Promise<StreamSdk> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Stream) return Promise.resolve(window.Stream);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<StreamSdk>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${STREAM_SDK_URL}"]`);
    const script = existing ?? document.createElement('script');
    const done = () => {
      if (window.Stream) resolve(window.Stream);
      else {
        sdkPromise = null;
        reject(new Error('Stream SDK loaded but window.Stream is missing'));
      }
    };
    script.addEventListener('load', done, { once: true });
    script.addEventListener(
      'error',
      () => {
        sdkPromise = null;
        reject(new Error('Stream SDK failed to load'));
      },
      { once: true },
    );
    if (!existing) {
      script.src = STREAM_SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return sdkPromise;
}

/* ── progress helpers ────────────────────────────────── */

export const PROGRESS_MILESTONES = [25, 50, 75] as const;
export type ProgressMilestone = (typeof PROGRESS_MILESTONES)[number];

/** Whole-number percentage of `current` through `duration`, clamped to 0–100. */
export function progressPct(current: number, duration: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((current / duration) * 100)));
}

/**
 * Milestones (25/50/75) newly crossed at `pct`, given the set already fired.
 * Mutates `fired` so each fires once per playback session.
 */
export function crossedMilestones(pct: number, fired: Set<number>): ProgressMilestone[] {
  const out: ProgressMilestone[] = [];
  for (const m of PROGRESS_MILESTONES) {
    if (pct >= m && !fired.has(m)) {
      fired.add(m);
      out.push(m);
    }
  }
  return out;
}
