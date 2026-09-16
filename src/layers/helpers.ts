import type { Density, Layer, Node } from '../data/types';
import { useUi } from '../store/ui';

/**
 * The density a layer actually renders at. Only layers that opt in with
 * `hasDensity` follow the Overview / Examples toggle; every other layer stays
 * compressed, so its secondaries never unfold on the stage.
 */
export function layerDensity(layer: Layer, density: Density): Density {
  return layer.hasDensity ? density : 'compressed';
}

export interface LayerState {
  density: Density;
  /** Compressed density: collapse secondary nodes. */
  isCollapsed: (node: Node) => boolean;
}

/**
 * Density rules, shared by every layer so the behaviour is identical whatever
 * the layout.
 */
export function useLayerState(layer: Layer): LayerState {
  const density = layerDensity(layer, useUi((s) => s.density));

  const isCollapsed = (node: Node) => density === 'compressed' && node.tier === 'secondary';

  return { density, isCollapsed };
}
