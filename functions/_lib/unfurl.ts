/**
 * Link previews for the Foundational Background layer (`GET /api/unfurl`).
 * Pure parsing and URL rules only, so everything here is unit-testable; the
 * route in `functions/api/unfurl.ts` does the fetching and caching.
 *
 * The response shapes are mirrored by `SourcePreview` in `src/lib/source.ts`.
 */

export interface ArticlePreview {
  kind: 'article';
  url: string;
  title: string;
  siteName: string;
  description: string;
  /** Absolute http(s) image URL, or `''`. */
  image: string;
  /** As published by the page (usually ISO 8601), or `''`. */
  published: string;
  /** The URL served a PDF rather than a page. */
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
  /** Photo, or the poster frame of a video / GIF. */
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

/* ── URL rules ──────────────────────────────────────── */

const X_HOSTS = new Set(['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);
const X_STATUS = /^\/(?:[\w]{1,15}|i\/web|i)\/status(?:es)?\/(\d{1,20})(?:\/|$)/;
const YOUTUBE_HOST = /(?:^|\.)(?:youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

/** The post id from an x.com / twitter.com status URL. */
export function xStatusId(url: URL): string | null {
  if (!X_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.pathname.match(X_STATUS)?.[1] ?? null;
}

export function isYouTube(url: URL): boolean {
  return YOUTUBE_HOST.test(url.hostname);
}

export function sourceKind(url: URL): SourcePreview['kind'] {
  if (isYouTube(url)) return 'video';
  if (xStatusId(url)) return 'post';
  return 'article';
}

const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(?:1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/**
 * Only public http(s) URLs on the default ports: no credentials, no
 * localhost / `.local` / `.internal` names, no private or IPv6 literals.
 * Checked on the first URL and again on every redirect hop.
 */
export function isFetchable(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.startsWith('[')) return false;
  if (host === 'localhost' || /\.(?:localhost|local|internal|home|lan)$/.test(host)) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) && PRIVATE_V4.some((re) => re.test(host))) return false;
  return true;
}

/* ── HTML entities ──────────────────────────────────── */

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return NAMED[code.toLowerCase()] ?? m;
  });
}

const clean = (s: string | undefined) => decodeEntities(s ?? '').replace(/\s+/g, ' ').trim();

/* ── articles: Open Graph / meta tags ───────────────── */

const META_TAG = /<meta\b[^>]*>/gi;
const ATTR = /([a-zA-Z_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

function metaMap(head: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of head.match(META_TAG) ?? []) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(ATTR)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    // First wins: pages repeat og:image for alternates, the first is the primary.
    if (key && attrs.content !== undefined && !out.has(key)) out.set(key, attrs.content);
  }
  return out;
}

function absoluteHttp(raw: string, base: string): string {
  if (!raw) return '';
  try {
    const u = new URL(decodeEntities(raw.trim()), base);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Title, site, description, image and publish date from a page's `<head>`. */
export function parseArticleHtml(html: string, pageUrl: string): ArticlePreview {
  const end = html.search(/<\/head>/i);
  const head = end === -1 ? html : html.slice(0, end);
  const meta = metaMap(head);
  const first = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v && v.trim()) ?? '';

  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const jsonLdDate = html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1];

  return {
    kind: 'article',
    url: pageUrl,
    title: clean(first('og:title', 'twitter:title') || titleTag),
    siteName: clean(first('og:site_name', 'application-name')) || hostLabel(pageUrl),
    description: clean(first('og:description', 'twitter:description', 'description')),
    image: absoluteHttp(first('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'), pageUrl),
    published: clean(
      first('article:published_time', 'og:article:published_time', 'datepublished', 'pubdate', 'parsely-pub-date', 'sailthru.date', 'date') ||
        jsonLdDate,
    ),
    pdf: false,
  };
}

/* ── X posts: public syndication data ───────────────── */

/** The `token` the syndication endpoint expects, derived from the post id. */
export function tweetToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(6 ** 2).replace(/(0+|\.)/g, '');
}

export function tweetResultUrl(id: string): string {
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${tweetToken(id)}`;
}

interface RawTweet {
  __typename?: string;
  id_str?: string;
  text?: string;
  display_text_range?: [number, number];
  entities?: { urls?: { url: string; display_url?: string; expanded_url?: string }[] };
  created_at?: string;
  favorite_count?: number;
  conversation_count?: number;
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string; is_blue_verified?: boolean; verified?: boolean };
  mediaDetails?: { type?: string; media_url_https?: string; original_info?: { width?: number; height?: number } }[];
}

/**
 * Normalizes a `tweet-result` payload. `display_text_range` and the entity
 * indices count code points of the still-encoded text, so the text is sliced
 * and its t.co links swapped for their display form before entities are decoded.
 * `null` for tombstones (deleted, protected, age-gated) and malformed payloads.
 */
export function parseTweet(raw: unknown, url: string): PostPreview | null {
  const t = raw as RawTweet | null;
  if (!t || t.__typename === 'TweetTombstone' || !t.id_str || typeof t.text !== 'string' || !t.user) return null;

  const chars = Array.from(t.text);
  const [start, end] = t.display_text_range ?? [0, chars.length];
  let text = chars.slice(start, end).join('');
  for (const link of t.entities?.urls ?? []) {
    text = text.split(link.url).join(link.display_url ?? link.expanded_url ?? link.url);
  }
  text = decodeEntities(text.replace(/\s*https:\/\/t\.co\/\w+\s*$/, '')).trim();

  const handle = t.user.screen_name ?? '';
  return {
    kind: 'post',
    url,
    id: t.id_str,
    text,
    author: {
      name: t.user.name ?? handle,
      handle,
      avatar: (t.user.profile_image_url_https ?? '').replace('_normal.', '_bigger.'),
      verified: Boolean(t.user.is_blue_verified || t.user.verified),
    },
    created: t.created_at ?? '',
    media: (t.mediaDetails ?? [])
      .filter((m) => m.media_url_https)
      .map((m) => ({
        type: m.type === 'photo' ? 'photo' : 'video',
        url: m.media_url_https ?? '',
        width: m.original_info?.width ?? 0,
        height: m.original_info?.height ?? 0,
      })),
    likes: t.favorite_count ?? 0,
    replies: t.conversation_count ?? 0,
  };
}

/* ── YouTube: oEmbed ────────────────────────────────── */

export function youTubeOembedUrl(url: string): string {
  return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
}

export function parseYouTubeOembed(raw: unknown, url: string): VideoPreview | null {
  const o = raw as { title?: string; author_name?: string; author_url?: string } | null;
  if (!o || typeof o.title !== 'string') return null;
  return { kind: 'video', url, title: clean(o.title), channel: clean(o.author_name), channelUrl: o.author_url ?? '' };
}
