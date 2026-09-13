import { allNodes, layers, nodeIndex, nodesOf } from './loader';
import { nodeSectors, parentIds } from './normalize';
import {
  loremBlurb,
  loremBullets,
  loremContextItems,
  loremTagline,
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
export function getNavTree(layerId: LayerId | string | undefined): NavTree {
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

export function getCopy(node: Node): ResolvedCopy {
  const tagline = node.tagline || loremTagline(node.id);
  const blurb = node.blurb || loremBlurb(node.id);
  const bullets = node.bulletPoints.length ? node.bulletPoints : loremBullets(node.id);
  return {
    tagline,
    blurb,
    bullets,
    isPlaceholder: !node.tagline || !node.blurb || node.bulletPoints.length === 0,
  };
}

/** Context items for the right tray; three lorem placeholders until real ones land. */
export function getContextItems(node: Node): ContextItem[] {
  return node.contextItems.length ? node.contextItems : loremContextItems(node.id, 3);
}

export function getPrimarySector(node: Node) {
  return nodeSectors(node)[0] ?? null;
}

/** 16:9 poster for a node's video slot. */
export function getPoster(node: Node): string {
  return placeholderPoster(node.id, getPrimarySector(node));
}

export { nodeSectors, parentIds, toSectorId, kebab, toRef, byOrder } from './normalize';
export { groupByLayer };
export { placeholderImage, placeholderGallery, placeholderPoster, sectorHex } from './placeholders';
export { SECTOR_IDS, SECTOR_LABEL } from './types';
export type * from './types';
