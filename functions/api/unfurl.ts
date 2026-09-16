import { type Fn } from '../_lib/env';
import { error, json, withHeaders } from '../_lib/http';
import {
  hostLabel,
  isFetchable,
  parseArticleHtml,
  parseTweet,
  parseYouTubeOembed,
  sourceKind,
  tweetResultUrl,
  xStatusId,
  youTubeOembedUrl,
  type SourcePreview,
} from '../_lib/unfurl';

/**
 * `GET /api/unfurl?url=<source url>` → `SourcePreview`.
 * YouTube via oEmbed, X posts via the public syndication data, anything else
 * from the page's Open Graph tags. Results are cached at the edge for a day and
 * lasting failures (gone, private, no preview) for ten minutes, so a node's
 * card does not refetch on every view; transient upstream errors are not cached.
 */

const TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 768 * 1024;
const MAX_REDIRECTS = 5;
const OK_TTL_S = 24 * 60 * 60;
const FAIL_TTL_S = 10 * 60;

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** Publishers allow link-preview crawlers more often than generic bots; some only allow browsers. */
const USER_AGENTS = ['facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', BROWSER_UA];

/** Failures worth remembering: the source is gone, private or has no preview. Anything else may be transient. */
const CACHEABLE_FAILURES = new Set([403, 404, 422]);

class UnfurlError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** `fetch` that re-checks `isFetchable` on every redirect hop. */
async function safeFetch(start: URL, headers: HeadersInit): Promise<Response> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isFetchable(url)) throw new UnfurlError(400, 'url is not a public http(s) address');
    const res = await fetch(url.toString(), { headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    url = new URL(location, url);
  }
  throw new UnfurlError(502, 'too many redirects');
}

/** The first `MAX_HTML_BYTES`, stopping early once `</head>` has arrived. */
async function readHead(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let html = '';
  let bytes = 0;
  while (bytes < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  await reader.cancel().catch(() => undefined);
  return html;
}

async function unfurlArticle(url: URL): Promise<SourcePreview> {
  let lastStatus = 502;
  for (const ua of USER_AGENTS) {
    const res = await safeFetch(url, {
      'user-agent': ua,
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    });
    const type = res.headers.get('content-type') ?? '';
    if (res.ok && type.includes('application/pdf')) {
      await res.body?.cancel();
      return { kind: 'article', url: url.toString(), title: '', siteName: hostLabel(url.toString()), description: '', image: '', published: '', pdf: true };
    }
    if (res.ok && type.includes('html')) {
      const preview = parseArticleHtml(await readHead(res), url.toString());
      if (preview.title) return preview;
    } else {
      await res.body?.cancel();
    }
    lastStatus = res.ok ? 422 : res.status;
  }
  throw new UnfurlError(lastStatus === 422 ? 422 : 502, `the page did not return a preview (upstream ${lastStatus})`);
}

async function unfurlPost(url: URL, id: string): Promise<SourcePreview> {
  // The syndication endpoint answers 400 to requests without a User-Agent (Workers sends none).
  const res = await fetch(tweetResultUrl(id), { headers: { 'user-agent': BROWSER_UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new UnfurlError(404, 'post not found or not public');
  if (!res.ok) throw new UnfurlError(502, `X answered ${res.status}`);
  const post = parseTweet(await res.json(), url.toString());
  if (!post) throw new UnfurlError(404, 'post not found or not public');
  return post;
}

async function unfurlVideo(url: URL): Promise<SourcePreview> {
  const res = await fetch(youTubeOembedUrl(url.toString()), { headers: { 'user-agent': BROWSER_UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new UnfurlError(res.status === 401 || res.status === 403 ? 403 : 404, `YouTube oEmbed answered ${res.status}`);
  const video = parseYouTubeOembed(await res.json(), url.toString());
  if (!video) throw new UnfurlError(502, 'unexpected oEmbed payload');
  return video;
}

export async function unfurl(url: URL): Promise<SourcePreview> {
  switch (sourceKind(url)) {
    case 'video':
      return unfurlVideo(url);
    case 'post':
      return unfurlPost(url, xStatusId(url) ?? '');
    default:
      return unfurlArticle(url);
  }
}

export const onRequestGet: Fn = async ({ request, data, waitUntil }) => {
  if (!data.session) return error(401, 'no session');

  let url: URL;
  try {
    url = new URL(new URL(request.url).searchParams.get('url') ?? '');
  } catch {
    return error(400, 'url must be an absolute http(s) URL');
  }
  url.hash = '';
  if (!isFetchable(url)) return error(400, 'url must be a public http(s) address');

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`https://unfurl.cache/preview?url=${encodeURIComponent(url.toString())}`);
  const hit = await cache.match(cacheKey);
  if (hit) return withHeaders(hit, { 'cache-control': `private, max-age=${hit.ok ? OK_TTL_S : FAIL_TTL_S}` });

  let res: Response;
  let ttl: number;
  try {
    res = json(await unfurl(url), 200, { 'cache-control': `private, max-age=${OK_TTL_S}` });
    ttl = OK_TTL_S;
  } catch (e) {
    const status = e instanceof UnfurlError ? e.status : 502;
    res = error(status, e instanceof Error ? e.message : String(e));
    if (!CACHEABLE_FAILURES.has(status)) return res;
    ttl = FAIL_TTL_S;
  }

  const stored = new Response(res.clone().body, res);
  stored.headers.set('cache-control', `public, max-age=${ttl}`);
  waitUntil(cache.put(cacheKey, stored).catch(() => undefined));
  return res;
};
