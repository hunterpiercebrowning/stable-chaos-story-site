import { describe, expect, it } from 'vitest';
import { formatSourceDate, isPdfUrl, sourceHost, sourceKind, xStatusId } from './source';

describe('sourceKind', () => {
  it('routes YouTube, X posts and articles', () => {
    expect(sourceKind('https://www.youtube.com/watch?v=BXLGV0Sj0n8')).toBe('video');
    expect(sourceKind('https://youtu.be/BXLGV0Sj0n8')).toBe('video');
    expect(sourceKind('https://x.com/jack/status/20')).toBe('post');
    expect(sourceKind('https://twitter.com/jack/status/20?s=20')).toBe('post');
    expect(sourceKind('https://x.com/jack')).toBe('article');
    expect(sourceKind('https://en.wikipedia.org/wiki/Rare-earth_element')).toBe('article');
  });

  it('ignores empty and non-http values', () => {
    expect(sourceKind('')).toBeNull();
    expect(sourceKind('   ')).toBeNull();
    expect(sourceKind('r2:clip.mp4')).toBeNull();
    expect(sourceKind('javascript:alert(1)')).toBeNull();
  });
});

describe('helpers', () => {
  it('reads ids, hosts and pdf paths', () => {
    expect(xStatusId('https://mobile.twitter.com/i/web/status/1683920951807971329')).toBe('1683920951807971329');
    expect(sourceHost('https://www.bbc.com/news/x')).toBe('bbc.com');
    expect(isPdfUrl('https://pubs.usgs.gov/a/b.PDF?x=1')).toBe(true);
    expect(isPdfUrl('https://pubs.usgs.gov/a/b')).toBe(false);
  });

  it('formats timestamps and keeps authored text', () => {
    expect(formatSourceDate('2006-03-21T20:50:14.000Z')).toBe('Mar 21, 2006');
    expect(formatSourceDate('2025-04-02')).toBe('Apr 2, 2025');
    expect(formatSourceDate('January 2025')).toBe('January 2025');
    expect(formatSourceDate('')).toBe('');
  });
});
