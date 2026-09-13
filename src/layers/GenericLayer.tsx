import { NodeCard } from '../components/NodeCard';
import type { LayerViewProps, NodeViewProps } from './types';
import { useLayerState } from './helpers';
import './generic.css';

/**
 * Default layer layout: a responsive grid of node cards, primary tier first.
 * Phase 1 replaces this per layer; until then every layer is fully navigable.
 */
export function GenericLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const { isDimmed, isCollapsed } = useLayerState(layer);
  const primary = nodes.filter((n) => n.tier === 'primary');
  const secondary = nodes.filter((n) => n.tier === 'secondary');
  const secondaryCollapsed = secondary.length > 0 && secondary.every(isCollapsed);

  if (nodes.length === 0) {
    return (
      <div className="generic-empty">
        <h3 className="generic-empty-title">{layer.title}</h3>
        <p className="generic-empty-body">
          Content for this layer is coming soon. It will hold the third-party sources and
          background material behind the claims made in the layers above.
        </p>
      </div>
    );
  }

  return (
    <div className="generic-layer">
      <div className="generic-grid" data-tier="primary">
        {primary.map((node) => (
          <GenericNode
            key={node.id}
            node={node}
            dimmed={isDimmed(node)}
            active={node.id === focusedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {secondary.length > 0 ? (
        <div className="generic-section" data-collapsed={secondaryCollapsed ? 'true' : undefined}>
          <div className="generic-grid" data-tier="secondary">
            {secondary.map((node) => (
              <GenericNode
                key={node.id}
                node={node}
                dimmed={isDimmed(node)}
                collapsed={isCollapsed(node)}
                active={node.id === focusedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Default node rendering — the base card with no layer-specific chrome. */
export function GenericNode({ node, dimmed, collapsed, active, onSelect }: NodeViewProps) {
  return (
    <NodeCard
      node={node}
      size={node.tier === 'primary' ? 'md' : 'sm'}
      dimmed={dimmed}
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
    />
  );
}
