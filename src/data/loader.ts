import backgroundJson from '../../content/background-nodes.json';
import layersJson from '../../content/layers.json';
import productsJson from '../../content/product-nodes.json';
import sectorsJson from '../../content/sectors-nodes.json';
import servicesJson from '../../content/service-nodes.json';
import whoJson from '../../content/who-nodes.json';
import {
  byOrder,
  normalizeBackground,
  normalizeLayers,
  normalizeProducts,
  normalizeSectors,
  normalizeServices,
  normalizeWho,
} from './normalize';
import type { Layer, LayerId, Node } from './types';

/**
 * Content is imported at build time and normalized once at module load.
 * Nothing outside `src/data` may import the JSON directly.
 */

export const layers: Layer[] = normalizeLayers(layersJson as unknown[]);

const nodesByLayer: Record<LayerId, Node[]> = {
  welcome: [],
  who: normalizeWho(whoJson as unknown[]).sort(byOrder),
  operations: [],
  // Hard-coded layer since the simplification: the five advantages are stated
  // in `BeliefsLayer` and there is nothing to drill into. `beliefs-nodes.json`
  // stays on disk for whenever the drill-in version comes back.
  beliefs: [],
  sectors: normalizeSectors(sectorsJson as unknown[]).sort(byOrder),
  trajectory: [],
  // One layer over two files: the service companies and their offerings first,
  // then the sector product summaries and their products.
  holdings: [
    ...normalizeServices(servicesJson as unknown[]).sort(byOrder),
    ...normalizeProducts(productsJson as unknown[]).sort(byOrder),
  ],
  background: normalizeBackground(backgroundJson as unknown[]).sort(byOrder),
};

export const allNodes: Node[] = layers.flatMap((l) => nodesByLayer[l.id] ?? []);

export const nodeIndex: Map<string, Node> = new Map(allNodes.map((n) => [n.id, n]));

export function nodesOf(layerId: LayerId): Node[] {
  return nodesByLayer[layerId] ?? [];
}

if (import.meta.env?.DEV && nodeIndex.size !== allNodes.length) {
  const seen = new Set<string>();
  const dupes = allNodes.filter((n) => (seen.has(n.id) ? true : (seen.add(n.id), false)));
  console.warn('[data] duplicate node ids in content/:', dupes.map((n) => n.id));
}
