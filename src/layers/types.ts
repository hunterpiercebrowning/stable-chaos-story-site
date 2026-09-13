import type { ComponentType } from 'react';
import type { Layer, Node } from '../data/types';

export interface LayerViewProps {
  layer: Layer;
  nodes: Node[];
  /** Currently focused node id, if any. */
  focusedId?: string;
  onSelect: (node: Node) => void;
}

export interface NodeViewProps {
  node: Node;
  collapsed?: boolean;
  active?: boolean;
  onSelect: (node: Node) => void;
}

export interface FocusViewProps {
  node: Node;
  onClose: () => void;
}

/** What every layer contributes to the registry. */
export interface LayerComponents {
  Layer: ComponentType<LayerViewProps>;
  Node: ComponentType<NodeViewProps>;
  Focus: ComponentType<FocusViewProps>;
}
