import type { Ref } from 'react';
import { NodeCard } from '../../components/NodeCard';
import { SectorTag } from '../../components/SectorTag';
import { nodeSectors } from '../../data';
import type { NodeViewProps } from '../types';
import './sectors.css';

export interface SectorsNodeProps extends NodeViewProps {
  /** Forwarded to the card so the layer can measure it for connectors. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Sector (primary): a wide, short band tinted in its sector color with a solid
 * rule along the top and the title alone.
 * Domain (secondary): a compact card. Single-sector domains carry their sector
 * as a border tint; dual-sector domains take the border from the first sector,
 * the glow from the second and a two-stop gradient of both (see sectors.css).
 */
export function SectorsNode({ node, dimmed, collapsed, active, onSelect, ref }: SectorsNodeProps) {
  const sectors = nodeSectors(node);
  const isSector = node.tier === 'primary';

  if (isSector) {
    return (
      <NodeCard
        ref={ref}
        node={node}
        size="wide"
        className="sectors-sector"
        dimmed={dimmed}
        collapsed={collapsed}
        active={active}
        onSelect={onSelect}
      >
        <span className="sectors-sector-title">{node.title}</span>
      </NodeCard>
    );
  }

  return (
    <NodeCard
      ref={ref}
      node={node}
      size="sm"
      className="sectors-domain"
      dimmed={dimmed}
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
    >
      <span className="sectors-domain-title">{node.title}</span>
      {sectors.length > 0 ? (
        // One tag per sector (rather than the split pill) so dual domains stay
        // readable in the narrower gutter columns — the tags wrap instead of clipping.
        <span className="sectors-domain-tags">
          {sectors.map((s) => (
            <SectorTag key={s} sector={s} />
          ))}
        </span>
      ) : null}
    </NodeCard>
  );
}
