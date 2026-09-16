import { useEffect, useState } from 'react';
import { youTubeId } from './video';

/**
 * A Foundational Background node's source: one URL on the node itself,
 * rendered as a YouTube embed, an X post or an article preview. Previews come
 * from `GET /api/unfurl` (see `functions/api/unfurl.ts`, whose types these
 * mirror) and are cached per URL for the page's lifetime.
 */

export type SourceKind = 'video' | 'post' | 'article';

export interface ArticlePreview {
  kind: 'article';
  url: string;
  title: string;
  siteName: string;
  description: string;
  image: string;
  published: string;
  pdf: boolean;
}

export interface VideoPreview {
  kind: 'video';
  url: string;
  title: string;
  channel: string;
  channelUrl: string;
}

export interface PostMedia {
  type: 'photo' | 'video';
  url: string;
  width: number;
  height: number;
}

export interface PostPreview {
  kind: 'post';
  url: string;
  id: string;
  text: string;
  author: { name: string; handle: string; avatar: string; verified: boolean };
  created: string;
  media: PostMedia[];
  likes: number;
  replies: number;
}

export type SourcePreview = ArticlePreview | VideoPreview | PostPreview;

const X_HOSTS = new Set(['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);
const X_STATUS = /^\/(?:\w{1,15}|i\/web|i)\/status(?:es)?\/(\d{1,20})(?:\/|$)/;

function parseUrl(link: string | undefined | null): URL | null {
  try {
    const url = new URL((link ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** The post id from an x.com / twitter.com status URL. */
export function xStatusId(link: string | undefined | null): string | null {
  const url = parseUrl(link);
  if (!url || !X_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.pathname.match(X_STATUS)?.[1] ?? null;
}

/** `video` for YouTube, `post` for an X status, `article` for any other http(s) URL, else `null`. */
export function sourceKind(link: string | undefined | null): SourceKind | null {
  if (!parseUrl(link)) return null;
  if (youTubeId(link)) return 'video';
  if (xStatusId(link)) return 'post';
  return 'article';
}

/** `example.org` from `https://www.example.org/path`. */
export function sourceHost(link: string): string {
  return parseUrl(link)?.hostname.replace(/^www\./, '') ?? '';
}

export function isPdfUrl(link: string): boolean {
  return /\.pdf$/i.test(parseUrl(link)?.pathname ?? '');
}

/**
 * `Apr 2, 2025` for a parseable timestamp; anything else (an authored "2026",
 * "Spring 2025") is shown as written.
 */
export function formatSourceDate(raw: string): string {
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw) && !/^\w{3}, \d/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/* ── fetching ───────────────────────────────────────── */

const settled = new Map<string, SourcePreview | null>();
const inflight = new Map<string, Promise<SourcePreview | null>>();

/** One request per URL per page load; failures resolve to `null` so the card keeps its fallbacks. */
export function loadSourcePreview(url: string): Promise<SourcePreview | null> {
  if (settled.has(url)) return Promise.resolve(settled.get(url) ?? null);
  let p = inflight.get(url);
  if (!p) {
    p = fetch(`/api/unfurl?url=${encodeURIComponent(url)}`, { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? (res.json() as Promise<SourcePreview>) : null))
      .catch(() => null)
      .then((preview) => {
        settled.set(url, preview);
        inflight.delete(url);
        return preview;
      });
    inflight.set(url, p);
  }
  return p;
}

export interface SourcePreviewState {
  preview: SourcePreview | null;
  /** True until the request settles (success or failure). */
  loading: boolean;
}

export function useSourcePreview(url: string): SourcePreviewState {
  // Bumped when a request this component started settles, so the render below re-reads the cache.
  const [, setSettledUrl] = useState('');

  useEffect(() => {
    if (!url || settled.has(url)) return;
    let alive = true;
    void loadSourcePreview(url).then(() => {
      if (alive) setSettledUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  if (!url) return { preview: null, loading: false };
  return { preview: settled.get(url) ?? null, loading: !settled.has(url) };
}
