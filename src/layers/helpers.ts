import type { Layer, Node } from '../data/types';
import { useUi } from '../store/ui';

export interface LayerState {
  /** Compressed density: collapse secondary nodes on layers that opt in. */
  isCollapsed: (node: Node) => boolean;
}

/**
 * Density rules, shared by every layer so the behaviour is identical whatever
 * the layout.
 */
export function useLayerState(layer: Layer): LayerState {
  const density = useUi((s) => s.density);

  const isCollapsed = (node: Node) =>
    layer.hasDensity && density === 'compressed' && node.tier === 'secondary';

  return { isCollapsed };
}
