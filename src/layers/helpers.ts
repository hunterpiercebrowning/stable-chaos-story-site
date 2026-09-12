import { nodeSectors } from '../data/normalize';
import type { Layer, Node } from '../data/types';
import { useUi } from '../store/ui';

export interface LayerState {
  /** Emphasis miss: dim, never hide. */
  isDimmed: (node: Node) => boolean;
  /** Compressed density: collapse secondary nodes on layers that opt in. */
  isCollapsed: (node: Node) => boolean;
}

/**
 * Emphasis and density rules, shared by every layer so the behaviour is
 * identical whatever the layout.
 */
export function useLayerState(layer: Layer): LayerState {
  const emphasis = useUi((s) => s.emphasis);
  const density = useUi((s) => s.density);

  const isDimmed = (node: Node) => {
    if (!layer.hasEmphasis || emphasis === 'all') return false;
    const sectors = nodeSectors(node);
    return sectors.length > 0 && !sectors.includes(emphasis);
  };

  const isCollapsed = (node: Node) =>
    layer.hasDensity && density === 'compressed' && node.tier === 'secondary';

  return { isDimmed, isCollapsed };
}
