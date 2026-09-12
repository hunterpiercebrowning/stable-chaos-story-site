import { allNodes, layers, nodeIndex, nodesOf } from './loader';
import { nodeSectors } from './normalize';
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

export { nodeSectors, toSectorId, kebab, toRef, byOrder } from './normalize';
export { groupByLayer };
export { placeholderImage, placeholderGallery, placeholderPoster, sectorHex } from './placeholders';
export { SECTOR_IDS, SECTOR_LABEL } from './types';
export type * from './types';
