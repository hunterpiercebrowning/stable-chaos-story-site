import { videoThumbnail } from '../lib/video';
import { allNodes, layers, nodeIndex, nodesOf } from './loader';
import { nodeSectors, parentIds } from './normalize';
import {
  DEFAULT_LOREM_BUDGET,
  type LoremBudget,
  loremBlurb,
  loremBullets,
  loremContextItems,
  loremTagline,
  placeholderMotif,
  placeholderPoster,
} from './placeholders';
import { buildRelated, groupByLayer } from './related';
import { searchNodes } from './search';
import type { ContextItem, Layer, LayerId, Node, NodeRef, SearchResult } from './types';

/* ── public API ─────────────────────────────────────── */

export function getLayers(): Layer[] {
  return layers;
}

export function getLayer(layerId: string | undefined): Layer | undefined {
  return layers.find((l) => l.id === layerId);
}

export function getNodes(layerId: LayerId | string | undefined): Node[] {
  if (!layerId) return [];
  return nodesOf(layerId as LayerId);
}

export function getNode(id: string | undefined): Node | undefined {
  return id ? nodeIndex.get(id) : undefined;
}

export interface NavBranch {
  primary: Node;
  /** Secondaries that name this primary as a parent, in content order. */
  children: Node[];
}

export interface NavTree {
  branches: NavBranch[];
  /** Secondaries whose parent is missing from the layer — should be empty; rendered flat if not. */
  orphans: Node[];
}

/**
 * The two-tier index for a layer: every primary with its secondaries nested under it.
 * A secondary with two parents (a domain shared by two sectors) appears under both.
 */
const navTreeCache = new Map<string, NavTree>();

export function getNavTree(layerId: LayerId | string | undefined): NavTree {
  const key = layerId ?? '';
  const cached = navTreeCache.get(key);
  if (cached) return cached;
  const tree = buildNavTree(layerId);
  navTreeCache.set(key, tree);
  return tree;
}

function buildNavTree(layerId: LayerId | string | undefined): NavTree {
  const nodes = getNodes(layerId);
  const branches: NavBranch[] = nodes
    .filter((n) => n.tier === 'primary')
    .map((primary) => ({ primary, children: [] as Node[] }));
  const byPrimary = new Map(branches.map((b) => [b.primary.id, b]));
  const orphans: Node[] = [];
  for (const node of nodes) {
    if (node.tier !== 'secondary') continue;
    const parents = parentIds(node).map((id) => byPrimary.get(id)).filter((b): b is NavBranch => Boolean(b));
    if (parents.length === 0) orphans.push(node);
    for (const b of parents) b.children.push(node);
  }
  return { branches, orphans };
}

/** Secondaries nested under a primary (0 for secondaries and for primary-only layers). */
export function getChildCount(node: Node): number {
  if (node.tier !== 'primary') return 0;
  return getNavTree(node.layerId).branches.find((b) => b.primary.id === node.id)?.children.length ?? 0;
}

export interface Backdrop {
  src: string;
  /** True when the image is the generated sector motif rather than an authored file. */
  isPlaceholder: boolean;
}

/**
 * Art behind a sector band, company card or sector products card under
 * Compressed density: the authored `background_image` when there is one, else
 * a generated sector motif.
 */
export function getBackdrop(node: Node): Backdrop {
  const authored =
    node.layerId === 'sectors' || (node.layerId === 'products' && node.tier === 'primary')
      ? (node.backgroundImage ?? '')
      : '';
  if (authored) return { src: authored, isPlaceholder: false };
  return { src: placeholderMotif(getPrimarySector(node), node.id), isPlaceholder: true };
}

const relatedIndex = buildRelated(allNodes);

export function getRelated(id: string | undefined): NodeRef[] {
  return (id && relatedIndex.get(id)) || [];
}

export function search(q: string, limit?: number): SearchResult[] {
  return searchNodes(allNodes, q, limit);
}

/* ── layer sequence (up/down arrows) ────────────────── */

export function getPrevLayer(layerId: string | undefined): Layer | undefined {
  const i = layers.findIndex((l) => l.id === layerId);
  return i > 0 ? layers[i - 1] : undefined;
}

export function getNextLayer(layerId: string | undefined): Layer | undefined {
  const i = layers.findIndex((l) => l.id === layerId);
  return i >= 0 && i < layers.length - 1 ? layers[i + 1] : undefined;
}

/* ── resolved copy (real content, else deterministic lorem) ── */

export interface ResolvedCopy {
  tagline: string;
  blurb: string;
  bullets: string[];
  /** True when any of the above is placeholder text. */
  isPlaceholder: boolean;
}

/**
 * Lorem sized so a node's focus card fits without scrolling at 1440×900 with
 * both trays open. The fixed chrome differs per layer (headshot column, video
 * row, gallery, slated note, related strip), so each layer gets its own budget;
 * it is also the copy-length target for authoring that layer.
 */
function loremBudget(node: Node): LoremBudget {
  switch (node.layerId) {
    case 'who':
      // Experts have no related strip under the bullets, so they get more room.
      return node.group === 'expert'
        ? { ...DEFAULT_LOREM_BUDGET, blurbWords: 35, bulletCount: 6, bulletWords: 6 }
        : { ...DEFAULT_LOREM_BUDGET, blurbWords: 30, bulletCount: 5, bulletWords: 6 };
    case 'beliefs':
      return { ...DEFAULT_LOREM_BUDGET, blurbWords: 40, bulletCount: 3, bulletWords: 16 };
    case 'sectors':
      return { ...DEFAULT_LOREM_BUDGET, blurbWords: 25, bulletCount: 2, bulletWords: 16 };
    case 'products':
      // Slated products also carry the "not yet in market" note above the blurb.
      return node.stage === 'slated'
        ? { ...DEFAULT_LOREM_BUDGET, blurbWords: 25, bulletCount: 1, bulletWords: 10 }
        : { ...DEFAULT_LOREM_BUDGET, blurbWords: 20, bulletCount: 2, bulletWords: 10 };
    default:
      return DEFAULT_LOREM_BUDGET;
  }
}

export function getCopy(node: Node): ResolvedCopy {
  const budget = loremBudget(node);
  const tagline = node.tagline || loremTagline(node.id, budget.taglineWords);
  const blurb = node.blurb || loremBlurb(node.id, budget.blurbWords);
  const bullets = node.bulletPoints.length
    ? node.bulletPoints
    : loremBullets(node.id, budget.bulletCount, budget.bulletWords);
  return {
    tagline,
    blurb,
    bullets,
    isPlaceholder: !node.tagline || !node.blurb || node.bulletPoints.length === 0,
  };
}

/**
 * Context items for the right tray; three lorem placeholders until real ones
 * land. A background node with a source needs none: the source is its focus.
 */
export function getContextItems(node: Node): ContextItem[] {
  if (node.contextItems.length) return node.contextItems;
  if (node.layerId === 'background' && node.sourceUrl) return [];
  return loremContextItems(node.id, 3);
}

export function getPrimarySector(node: Node) {
  return nodeSectors(node)[0] ?? null;
}

/** 16:9 poster for a node's video slot: the video's own thumbnail (YouTube), else a generated scene. */
export function getPoster(node: Node, link: string = node.videoLink): string {
  return videoThumbnail(link) || placeholderPoster(node.id, getPrimarySector(node));
}

export { nodeSectors, parentIds, toSectorId, kebab, toRef, byOrder } from './normalize';
export { groupByLayer };
export { placeholderImage, placeholderGallery, placeholderMotif, placeholderPoster, sectorHex } from './placeholders';
export { SECTOR_IDS, SECTOR_LABEL } from './types';
export type * from './types';
