import { useLocation } from 'react-router';
import { getLayer, getNode } from '../data';
import type { Layer, Node } from '../data/types';

export interface RouteContext {
  /** The layer segment of the URL; `welcome` at `/`. */
  layerId: string;
  layer: Layer | undefined;
  nodeId: string | undefined;
  node: Node | undefined;
  /** True when the URL names a layer that does not exist. */
  unknown: boolean;
}

/**
 * The URL is the source of truth for `layerId` and the focused node. Parsing
 * the pathname (rather than `useParams`) means layout components and leaves
 * read exactly the same thing.
 */
export function useRoute(): RouteContext {
  const { pathname } = useLocation();
  const [rawLayer, rawNode] = pathname.split('/').filter(Boolean);
  const layerId = rawLayer ?? 'welcome';
  const layer = getLayer(layerId);
  const node = layer && rawNode ? getNode(rawNode) : undefined;
  return {
    layerId,
    layer,
    nodeId: node?.id,
    node,
    unknown: !layer,
  };
}
