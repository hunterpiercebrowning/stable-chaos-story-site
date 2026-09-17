import { HIDDEN_LAYER_IDS } from '../lib/flags';
import { videoThumbnail } from '../lib/video';
import { allNodes, layers, nodeIndex, nodesOf } from './loader';
import { nodeSectors, parentIds } from './normalize';
import { placeholderMotif, placeholderPoster } from './placeholders';
import { buildRelated, groupByLayer } from './related';
import { searchNodes } from './search';
import { isProduct, type ContextItem, type Layer, type LayerId, type Node, type NodeRef, type SearchResult } from './types';

/* ── public API ─────────────────────────────────────── */

const hiddenLayers = new Set<string>(HIDDEN_LAYER_IDS);

/** Layers a reader can reach on their own; see `HIDDEN_LAYER_IDS`. */
const visibleLayers: Layer[] = layers.filter((l) => !hiddenLayers.has(l.id));

/** Nodes a hidden layer would otherwise leak into search. */
const searchableNodes: Node[] = allNodes.filter((n) => !hiddenLayers.has(n.layerId));

/**
 * The nav, the rail, the layer paging and search all read this, so hiding a
 * layer is one list. `getLayer` and `getNode` deliberately do not filter: a
 * hidden layer's URL still resolves for anyone holding the link.
 */
export function getLayers(): Layer[] {
  return visibleLayers;
}

export function isHiddenLayer(layerId: string | undefined): boolean {
  return Boolean(layerId && hiddenLayers.has(layerId));
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
    node.layerId === 'sectors' || (isProduct(node) && node.tier === 'primary')
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
  return searchNodes(searchableNodes, q, limit);
}

/* ── layer sequence (up/down arrows) ────────────────── */

/**
 * The paging run for a layer: the visible layers, plus the current one when it
 * is hidden. Someone who opened a hidden layer by direct link still gets a Back
 * pill out of it; nobody can page into it.
 */
function layerSequence(layerId: string | undefined): Layer[] {
  if (!isHiddenLayer(layerId)) return visibleLayers;
  return layers.filter((l) => !hiddenLayers.has(l.id) || l.id === layerId);
}

export function getPrevLayer(layerId: string | undefined): Layer | undefined {
  const seq = layerSequence(layerId);
  const i = seq.findIndex((l) => l.id === layerId);
  return i > 0 ? seq[i - 1] : undefined;
}

export function getNextLayer(layerId: string | undefined): Layer | undefined {
  const seq = layerSequence(layerId);
  const i = seq.findIndex((l) => l.id === layerId);
  return i >= 0 && i < seq.length - 1 ? seq[i + 1] : undefined;
}

/* ── resolved copy (authored content only) ── */

export interface ResolvedCopy {
  tagline: string;
  blurb: string;
  bullets: string[];
  /** True when any of the above is unauthored: the view leaves that slot out. */
  isEmpty: boolean;
}

/**
 * A node's copy exactly as authored. Fields the content does not supply come
 * back empty and the views drop those slots rather than standing in for them.
 */
export function getCopy(node: Node): ResolvedCopy {
  const tagline = node.tagline ?? '';
  const blurb = node.blurb ?? '';
  const bullets = node.bulletPoints ?? [];
  return {
    tagline,
    blurb,
    bullets,
    isEmpty: !tagline && !blurb && bullets.length === 0,
  };
}

/** Authored context items for the right tray; empty until real ones land. */
export function getContextItems(node: Node): ContextItem[] {
  return node.contextItems;
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
export { SECTOR_IDS, SECTOR_LABEL, isHolding, isProduct, isService } from './types';
export type * from './types';
