import { describe, expect, it } from 'vitest';
import {
  decodeEntities,
  isFetchable,
  parseArticleHtml,
  parseTweet,
  parseYouTubeOembed,
  sourceKind,
  tweetToken,
  xStatusId,
} from './unfurl';

const u = (s: string) => new URL(s);

describe('source kinds', () => {
  it('detects X posts on every host and path shape', () => {
    expect(xStatusId(u('https://x.com/jack/status/20'))).toBe('20');
    expect(xStatusId(u('https://twitter.com/jack/status/20?s=46'))).toBe('20');
    expect(xStatusId(u('https://mobile.twitter.com/jack/statuses/20'))).toBe('20');
    expect(xStatusId(u('https://x.com/i/web/status/20'))).toBe('20');
    expect(xStatusId(u('https://x.com/jack'))).toBeNull();
    expect(xStatusId(u('https://example.com/jack/status/20'))).toBeNull();
  });

  it('routes YouTube, X and everything else', () => {
    expect(sourceKind(u('https://youtu.be/BXLGV0Sj0n8'))).toBe('video');
    expect(sourceKind(u('https://www.youtube.com/watch?v=BXLGV0Sj0n8'))).toBe('video');
    expect(sourceKind(u('https://x.com/jack/status/20'))).toBe('post');
    expect(sourceKind(u('https://www.bbc.com/news/articles/abc'))).toBe('article');
  });
});

describe('isFetchable', () => {
  it('allows public http(s) hosts', () => {
    expect(isFetchable(u('https://www.bbc.com/news'))).toBe(true);
    expect(isFetchable(u('http://8.8.8.8/'))).toBe(true);
  });

  it('refuses local, private, credentialed and odd-port targets', () => {
    for (const s of [
      'http://localhost:8788/api',
      'http://127.0.0.1/',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://172.20.0.1/',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/',
      'http://printer.local/',
      'https://user:pw@example.com/',
      'https://example.com:8443/',
      'ftp://example.com/file',
      'http://intranet/',
    ]) {
      expect(isFetchable(u(s)), s).toBe(false);
    }
  });
});

describe('decodeEntities', () => {
  it('decodes named, decimal and hex references', () => {
    expect(decodeEntities('Views &amp; News &#8217;26 &#x2014; &lt;b&gt; &bogus;')).toBe('Views & News ’26 — <b> &bogus;');
  });
});

describe('parseArticleHtml', () => {
  const html = `<!doctype html><html><head>
    <title>Fallback title | Site</title>
    <meta property="og:site_name" content="The Journal">
    <meta content="Rare earths &amp; the new oil" property="og:title" />
    <meta name='description' content='Plain description'>
    <meta property="og:description" content="OG description">
    <meta property="og:image" content="/img/lead.jpg">
    <meta property="og:image" content="/img/alternate.jpg">
    <meta property="article:published_time" content="2025-04-02T08:00:00Z">
  </head><body><meta property="og:title" content="ignored body tag"></body></html>`;

  it('reads Open Graph tags regardless of attribute order and resolves the image', () => {
    expect(parseArticleHtml(html, 'https://journal.example.com/2025/rare-earths')).toEqual({
      kind: 'article',
      url: 'https://journal.example.com/2025/rare-earths',
      title: 'Rare earths & the new oil',
      siteName: 'The Journal',
      description: 'OG description',
      image: 'https://journal.example.com/img/lead.jpg',
      published: '2025-04-02T08:00:00Z',
      pdf: false,
    });
  });

  it('falls back to <title>, the hostname and JSON-LD dates', () => {
    const bare = `<head><title>Only a title</title><script type="application/ld+json">{"datePublished": "2024-11-05"}</script></head>`;
    const p = parseArticleHtml(bare, 'https://www.example.org/post');
    expect(p.title).toBe('Only a title');
    expect(p.siteName).toBe('example.org');
    expect(p.published).toBe('2024-11-05');
    expect(p.image).toBe('');
  });
});

describe('parseTweet', () => {
  it('matches the token X expects', () => {
    expect(tweetToken('20')).toMatch(/^[0-9a-z]+$/);
  });

  it('slices the display range, swaps t.co links and decodes entities after', () => {
    const raw = {
      __typename: 'Tweet',
      id_str: '1683920951807971329',
      text: 'Less JS than the &lt;iframe&gt;\n\nhttps://t.co/CMH9A1IGjV https://t.co/media123',
      display_text_range: [0, 56],
      entities: { urls: [{ url: 'https://t.co/CMH9A1IGjV', display_url: 'vercel.com/blog/introduci…' }] },
      created_at: '2023-07-25T20:00:00.000Z',
      favorite_count: 10,
      conversation_count: 2,
      user: { name: 'Shu', screen_name: 'shuding_', profile_image_url_https: 'https://pbs.twimg.com/a_normal.jpg', is_blue_verified: true },
      mediaDetails: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/x.jpg', original_info: { width: 1200, height: 675 } }],
    };
    expect(parseTweet(raw, 'https://x.com/shuding_/status/1683920951807971329')).toEqual({
      kind: 'post',
      url: 'https://x.com/shuding_/status/1683920951807971329',
      id: '1683920951807971329',
      text: 'Less JS than the <iframe>\n\nvercel.com/blog/introduci…',
      author: { name: 'Shu', handle: 'shuding_', avatar: 'https://pbs.twimg.com/a_bigger.jpg', verified: true },
      created: '2023-07-25T20:00:00.000Z',
      media: [{ type: 'photo', url: 'https://pbs.twimg.com/media/x.jpg', width: 1200, height: 675 }],
      likes: 10,
      replies: 2,
    });
  });

  it('returns null for tombstones and junk', () => {
    expect(parseTweet({ __typename: 'TweetTombstone' }, 'https://x.com/a/status/1')).toBeNull();
    expect(parseTweet(null, 'https://x.com/a/status/1')).toBeNull();
    expect(parseTweet({ text: 'no id' }, 'https://x.com/a/status/1')).toBeNull();
  });
});

describe('parseYouTubeOembed', () => {
  it('keeps the title and channel', () => {
    expect(
      parseYouTubeOembed(
        { title: 'China Found Something Better Than Oil', author_name: 'Maxinomics', author_url: 'https://www.youtube.com/@Maxinomics' },
        'https://www.youtube.com/watch?v=BXLGV0Sj0n8',
      ),
    ).toEqual({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=BXLGV0Sj0n8',
      title: 'China Found Something Better Than Oil',
      channel: 'Maxinomics',
      channelUrl: 'https://www.youtube.com/@Maxinomics',
    });
  });
});
