import { describe, expect, it } from 'vitest';
import { allNodes } from './loader';
import {
  getBackdrop,
  getChildCount,
  getContextItems,
  getCopy,
  getLayers,
  getNavTree,
  getNextLayer,
  getNode,
  getNodes,
  getPrevLayer,
  getRelated,
  search,
} from './index';
import { kebab, normalizeProducts, normalizeSectors, toSectorId, toStage } from './normalize';
import { loremBlurb, loremBullets, placeholderImage, placeholderMotif } from './placeholders';
import { buildRelated, groupByLayer } from './related';
import { searchNodes } from './search';
import type { Node } from './types';

describe('getNavTree', () => {
  it('nests every secondary under its primary, with no orphans', () => {
    for (const layerId of ['sectors', 'services'] as const) {
      const { branches, orphans } = getNavTree(layerId);
      const nodes = getNodes(layerId);
      expect(orphans).toEqual([]);
      expect(branches.map((b) => b.primary.id)).toEqual(
        nodes.filter((n) => n.tier === 'primary').map((n) => n.id),
      );
      const nested = new Set(branches.flatMap((b) => b.children.map((c) => c.id)));
      expect(nested.size).toBe(nodes.filter((n) => n.tier === 'secondary').length);
      for (const b of branches) {
        for (const c of b.children) expect(c.tier).toBe('secondary');
      }
    }
  });

  it('lists a domain shared by two sectors under both', () => {
    const { branches } = getNavTree('sectors');
    const shared = getNodes('sectors').find(
      (n) => n.tier === 'secondary' && n.layerId === 'sectors' && n.relatedSectors.length === 2,
    );
    expect(shared).toBeDefined();
    const under = branches.filter((b) => b.children.some((c) => c.id === shared!.id)).map((b) => b.primary.id);
    expect(under).toEqual(shared!.layerId === 'sectors' ? shared!.relatedSectors : []);
  });

  it('is flat for primary-only layers', () => {
    const { branches, orphans } = getNavTree('products');
    expect(orphans).toEqual([]);
    expect(branches.every((b) => b.children.length === 0)).toBe(true);
  });
});

describe('compressed card extras', () => {
  it('counts the secondaries nested under a primary', () => {
    const synbio = getNode('synbio')!;
    const expected = getNodes('sectors').filter(
      (n) => n.layerId === 'sectors' && n.tier === 'secondary' && n.relatedSectors.includes('synbio'),
    ).length;
    expect(expected).toBeGreaterThan(0);
    expect(getChildCount(synbio)).toBe(expected);
    expect(getChildCount(getNode('growth-curve-bio')!)).toBeGreaterThan(0);
    expect(getChildCount(getNodes('sectors').find((n) => n.tier === 'secondary')!)).toBe(0);
    expect(getChildCount(getNodes('products')[0])).toBe(0);
  });

  it('backdrop prefers the authored image and falls back to a sector motif', () => {
    const security = getNode('security')!;
    const fallback = getBackdrop(security);
    expect(fallback.isPlaceholder).toBe(true);
    expect(fallback.src.startsWith('data:image/svg+xml,')).toBe(true);
    expect(fallback.src).toBe(placeholderMotif('security', 'security'));
    const authored = getBackdrop({ ...security, backgroundImage: '/assets/backgrounds/security.jpg' } as Node);
    expect(authored).toEqual({ src: '/assets/backgrounds/security.jpg', isPlaceholder: false });
  });

  it('draws a different motif per sector, deterministically', () => {
    expect(placeholderMotif('synbio')).toBe(placeholderMotif('synbio'));
    expect(new Set([placeholderMotif('synbio'), placeholderMotif('security'), placeholderMotif('systems')]).size).toBe(3);
  });
});

describe('normalize', () => {
  it('kebabs titles, stripping symbols and diacritics', () => {
    expect(kebab('Nth° Specificity')).toBe('nth-specificity');
    expect(kebab('Signals & Spectrum')).toBe('signals-and-spectrum');
    expect(kebab('Supply Chain & Logistics')).toBe('supply-chain-and-logistics');
  });

  it('resolves every sector alias to a canonical id', () => {
    expect(toSectorId('Synthetic Bio')).toBe('synbio');
    expect(toSectorId('SynBio')).toBe('synbio');
    expect(toSectorId('security')).toBe('security');
    expect(toSectorId('Systems')).toBe('systems');
    expect(() => toSectorId('nope')).toThrow();
  });

  it('accepts the legacy "slatted" stage spelling', () => {
    expect(toStage('slatted')).toBe('slated');
    expect(toStage('slated')).toBe('slated');
    expect(toStage('active')).toBe('active');
  });

  it('normalizes a raw sector node', () => {
    const [primary, secondary] = normalizeSectors([
      { type: 'primary', id: 'synbio', title: 'Synthetic Bio', sector: 'Synthetic Bio' },
      { type: 'secondary', id: 'biosecurity', title: 'Biosecurity', related_sectors: ['Synthetic Bio', 'Security'] },
    ]);
    expect(primary.tier).toBe('primary');
    expect(primary.relatedSectors).toEqual(['synbio']);
    expect(secondary.relatedSectors).toEqual(['synbio', 'security']);
  });

  it('normalizes a raw product node with legacy fields', () => {
    const [p] = normalizeProducts([
      { type: 'primary', id: 'x', title: 'X', sector: 'security', stage: 'slatted', category: 'Hardware' },
    ]);
    expect(p.stage).toBe('slated');
    expect(p.sector).toBe('security');
    expect(p.gallery).toEqual([]);
  });
});

describe('content', () => {
  it('has all seven layers in order', () => {
    expect(getLayers().map((l) => l.id)).toEqual([
      'welcome', 'who', 'beliefs', 'sectors', 'services', 'products', 'background',
    ]);
  });

  it('gives every node a unique id', () => {
    const ids = allNodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id === kebab(id))).toBe(true);
  });

  it('loads every node file', () => {
    expect(getNodes('who')).toHaveLength(6);
    expect(getNodes('beliefs')).toHaveLength(7);
    expect(getNodes('sectors')).toHaveLength(21);
    expect(getNodes('services')).toHaveLength(25);
    expect(getNodes('products')).toHaveLength(23);
    expect(getNodes('background')).toHaveLength(0);
  });

  it('walks layers with prev/next', () => {
    expect(getPrevLayer('welcome')).toBeUndefined();
    expect(getNextLayer('welcome')?.id).toBe('who');
    expect(getNextLayer('background')).toBeUndefined();
    expect(getPrevLayer('products')?.id).toBe('services');
  });

  it('resolves a node by id', () => {
    expect(getNode('hunter-browning')?.title).toBe('Hunter Browning');
    expect(getNode('nope')).toBeUndefined();
  });
});

describe('placeholders', () => {
  it('is deterministic per seed', () => {
    expect(loremBlurb('abc')).toBe(loremBlurb('abc'));
    expect(loremBlurb('abc')).not.toBe(loremBlurb('abd'));
  });

  it('produces blurbs of roughly the right length', () => {
    const words = loremBlurb('growth-curve-bio').split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(45);
    expect(words).toBeLessThanOrEqual(75);
    const bullets = loremBullets('growth-curve-bio');
    expect(bullets.length).toBeGreaterThanOrEqual(4);
    expect(bullets.length).toBeLessThanOrEqual(6);
  });

  it('generates an inline svg data uri with no network reference', () => {
    const uri = placeholderImage({ seed: 'x', sector: 'synbio', variant: 'logo', label: 'Growth Curve' });
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length));
    // The only URL in the markup is the SVG namespace — no external fetches.
    expect(svg.match(/https?:\/\/[^"']+/g)).toEqual(['http://www.w3.org/2000/svg']);
  });

  it('fills empty copy and context items', () => {
    const node = getNode('biosecurity')!;
    const copy = getCopy(node);
    expect(copy.blurb.length).toBeGreaterThan(40);
    expect(copy.isPlaceholder).toBe(true);
    expect(getContextItems(node)).toHaveLength(3);
  });

  it('keeps real copy when present', () => {
    const node = getNode('hunter-browning')!;
    expect(getCopy(node).blurb).toBe(node.blurb);
  });
});

describe('related', () => {
  it('links a domain to both of its sectors, symmetrically', () => {
    const refs = getRelated('biosecurity').map((r) => r.id);
    expect(refs).toContain('synbio');
    expect(refs).toContain('security');
    expect(getRelated('synbio').map((r) => r.id)).toContain('biosecurity');
  });

  it('links a person to their company and back', () => {
    expect(getRelated('eric-sabo').map((r) => r.id)).toContain('growth-curve-bio');
    expect(getRelated('growth-curve-bio').map((r) => r.id)).toContain('eric-sabo');
  });

  it('links founders to every portfolio company', () => {
    const refs = getRelated('hunter-browning').map((r) => r.id);
    expect(refs).toEqual(
      expect.arrayContaining(['growth-curve-bio', 'starling-intel', 'triangulum-bio', 'fountain-city-partners']),
    );
  });

  it('links offerings to their company and sector', () => {
    const refs = getRelated('red-teaming').map((r) => r.id);
    expect(refs).toContain('starling-intel');
    expect(refs).toContain('security');
  });

  it('links products to their sector', () => {
    expect(getRelated('conus-coat').map((r) => r.id)).toContain('synbio');
  });

  it('gives beliefs no relations', () => {
    expect(getRelated('consilience')).toEqual([]);
  });

  it('never relates a node to itself and stays symmetric', () => {
    const index = buildRelated(allNodes);
    for (const [id, refs] of index) {
      expect(refs.some((r) => r.id === id)).toBe(false);
      for (const r of refs) {
        expect(index.get(r.id)?.some((back) => back.id === id)).toBe(true);
      }
    }
  });

  it('groups refs by layer in layer order', () => {
    const groups = groupByLayer(getRelated('synbio'));
    const layerOrder = getLayers().map((l) => l.id);
    const ranks = groups.map((g) => layerOrder.indexOf(g.layerId));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(groups[0].layerId).toBe('sectors');
  });
});

describe('search', () => {
  it('ranks title prefix above title contains above body', () => {
    const results = search('bio');
    expect(results.length).toBeGreaterThan(3);
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
    expect(results[0].match).toBe('title');
  });

  it('finds an exact title first', () => {
    expect(search('Red Teaming')[0].id).toBe('red-teaming');
  });

  it('is case insensitive and trims', () => {
    expect(search('  BIOSECURITY ')[0].id).toBe('biosecurity');
  });

  it('returns nothing for an empty query', () => {
    expect(search('')).toEqual([]);
    expect(search('   ')).toEqual([]);
  });

  it('falls back to body matches', () => {
    const nodes: Node[] = [
      {
        id: 'a', layerId: 'background', tier: 'primary', order: 0, title: 'Alpha',
        tagline: '', blurb: 'mentions quantum things', bulletPoints: [], videoLink: '', contextItems: [],
      },
      {
        id: 'b', layerId: 'background', tier: 'primary', order: 1, title: 'Quantum',
        tagline: '', blurb: '', bulletPoints: [], videoLink: '', contextItems: [],
      },
    ];
    const results = searchNodes(nodes, 'quantum');
    expect(results.map((r) => r.id)).toEqual(['b', 'a']);
    expect(results[1].match).toBe('body');
  });

  it('honours the limit', () => {
    expect(search('a', 3)).toHaveLength(3);
  });
});
