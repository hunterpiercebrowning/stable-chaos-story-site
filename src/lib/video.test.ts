import { describe, expect, it } from 'vitest';
import {
  crossedMilestones,
  mimeForUrl,
  progressPct,
  resolveVideoSource,
  streamEmbedUrl,
} from './video';

const UID = 'b236bde30eb07b9d01318940e5fc3eda';

describe('resolveVideoSource', () => {
  it('maps empty / whitespace / nullish to none', () => {
    expect(resolveVideoSource('')).toEqual({ kind: 'none' });
    expect(resolveVideoSource('   ')).toEqual({ kind: 'none' });
    expect(resolveVideoSource(undefined)).toEqual({ kind: 'none' });
    expect(resolveVideoSource(null)).toEqual({ kind: 'none' });
  });

  it('treats a bare 32-hex string as a Stream UID (lower-cased)', () => {
    expect(resolveVideoSource(UID)).toEqual({ kind: 'stream', uid: UID });
    expect(resolveVideoSource(` ${UID.toUpperCase()} `)).toEqual({ kind: 'stream', uid: UID });
  });

  it('rejects hex strings of the wrong length', () => {
    expect(resolveVideoSource(UID.slice(0, 31))).toEqual({ kind: 'none' });
    expect(resolveVideoSource(`${UID}0`)).toEqual({ kind: 'none' });
  });

  it('extracts the UID from Stream URLs', () => {
    expect(
      resolveVideoSource(`https://customer-m033z5x00ks6nunl.cloudflarestream.com/${UID}/iframe`),
    ).toEqual({ kind: 'stream', uid: UID });
    expect(
      resolveVideoSource(`https://customer-abc.cloudflarestream.com/${UID}/manifest/video.m3u8`),
    ).toEqual({ kind: 'stream', uid: UID });
    expect(resolveVideoSource(`https://watch.cloudflarestream.com/${UID}`)).toEqual({
      kind: 'stream',
      uid: UID,
    });
    expect(resolveVideoSource(`https://iframe.videodelivery.net/${UID}?autoplay=true`)).toEqual({
      kind: 'stream',
      uid: UID,
    });
  });

  it('gives none for a Stream host with no UID in the path', () => {
    expect(resolveVideoSource('https://customer-abc.cloudflarestream.com/')).toEqual({
      kind: 'none',
    });
  });

  it('maps r2: prefixes to an R2 key', () => {
    expect(resolveVideoSource('r2:videos/intro.mp4')).toEqual({
      kind: 'r2',
      key: 'videos/intro.mp4',
    });
    expect(resolveVideoSource('r2:')).toEqual({ kind: 'none' });
  });

  it('maps media URLs to url with a mime', () => {
    expect(resolveVideoSource('https://example.com/a/b.mp4')).toEqual({
      kind: 'url',
      url: 'https://example.com/a/b.mp4',
      mime: 'video/mp4',
    });
    expect(resolveVideoSource('http://example.com/clip.WEBM?x=1')).toEqual({
      kind: 'url',
      url: 'http://example.com/clip.WEBM?x=1',
      mime: 'video/webm',
    });
    expect(resolveVideoSource('https://example.com/live.m3u8')).toEqual({
      kind: 'url',
      url: 'https://example.com/live.m3u8',
      mime: 'application/vnd.apple.mpegurl',
    });
  });

  it('passes other http(s) URLs through to <video> with an empty mime', () => {
    expect(resolveVideoSource('https://example.com/watch?v=abc')).toEqual({
      kind: 'url',
      url: 'https://example.com/watch?v=abc',
      mime: '',
    });
  });

  it('gives none for non-URL junk', () => {
    expect(resolveVideoSource('not a link')).toEqual({ kind: 'none' });
    expect(resolveVideoSource('ftp://example.com/a.mp4')).toEqual({ kind: 'none' });
    expect(resolveVideoSource('http://')).toEqual({ kind: 'none' });
  });
});

describe('mimeForUrl', () => {
  it('reads the extension off the path only', () => {
    expect(mimeForUrl('https://x.y/v.mp4?download=.webm')).toBe('video/mp4');
    expect(mimeForUrl('/local/clip.webm')).toBe('video/webm');
    expect(mimeForUrl('https://x.y/noext')).toBe('');
  });
});

describe('streamEmbedUrl', () => {
  it('uses the customer subdomain and /iframe path when a code is given', () => {
    expect(streamEmbedUrl(UID, { customerCode: 'abc123' })).toBe(
      `https://customer-abc123.cloudflarestream.com/${UID}/iframe`,
    );
  });

  it('falls back to iframe.videodelivery.net without a code', () => {
    expect(streamEmbedUrl(UID, { customerCode: '' })).toBe(
      `https://iframe.videodelivery.net/${UID}`,
    );
  });

  it('serialises player options and drops data-URI posters', () => {
    const url = streamEmbedUrl('signed.token.here', {
      customerCode: 'abc',
      autoplay: true,
      muted: true,
      preload: 'metadata',
      poster: 'data:image/svg+xml,...',
    });
    expect(url).toBe(
      'https://customer-abc.cloudflarestream.com/signed.token.here/iframe?autoplay=true&muted=true&preload=metadata',
    );
    expect(
      streamEmbedUrl(UID, { customerCode: 'abc', poster: 'https://cdn.example/p.jpg' }),
    ).toContain('poster=https%3A%2F%2Fcdn.example%2Fp.jpg');
  });
});

describe('progress helpers', () => {
  it('computes a clamped whole percentage', () => {
    expect(progressPct(0, 100)).toBe(0);
    expect(progressPct(33.3, 100)).toBe(33);
    expect(progressPct(120, 100)).toBe(100);
    expect(progressPct(10, 0)).toBe(0);
    expect(progressPct(10, Number.NaN)).toBe(0);
  });

  it('fires each milestone once, including several at a time after a seek', () => {
    const fired = new Set<number>();
    expect(crossedMilestones(10, fired)).toEqual([]);
    expect(crossedMilestones(25, fired)).toEqual([25]);
    expect(crossedMilestones(30, fired)).toEqual([]);
    expect(crossedMilestones(80, fired)).toEqual([50, 75]);
    expect(crossedMilestones(100, fired)).toEqual([]);
    expect([...fired].sort()).toEqual([25, 50, 75]);
  });
});
