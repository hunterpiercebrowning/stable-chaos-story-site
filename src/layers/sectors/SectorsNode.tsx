import type { Ref } from 'react';
import { NodeCard } from '../../components/NodeCard';
import { SectorTag } from '../../components/SectorTag';
import { getBackdrop, getChildCount, getCopy, nodeSectors } from '../../data';
import type { NodeViewProps } from '../types';
import './sectors.css';

export interface SectorsNodeProps extends NodeViewProps {
  /** Forwarded to the card so the layer can measure it for connectors. */
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Sector (primary): a wide band tinted in its sector color with a solid rule
 * along the top. Expanded shows the title alone; Compressed (only the three
 * bands on stage) grows it into a hero with the tagline, the domain count and
 * a backdrop — the authored `background_image` or a generated sector motif.
 * Domain (secondary): a compact card. Single-sector domains carry their sector
 * as a border tint; dual-sector domains take the border from the first sector,
 * the glow from the second and a two-stop gradient of both (see sectors.css).
 */
export function SectorsNode({ node, collapsed, active, onSelect, ref }: SectorsNodeProps) {
  const sectors = nodeSectors(node);
  const isSector = node.tier === 'primary';

  if (isSector) {
    const { tagline } = getCopy(node);
    const backdrop = getBackdrop(node);
    const domains = getChildCount(node);
    return (
      <NodeCard
        ref={ref}
        node={node}
        size="wide"
        className="sectors-sector"
        collapsed={collapsed}
        active={active}
        onSelect={onSelect}
      >
        <span
          className="sectors-sector-backdrop"
          data-placeholder={backdrop.isPlaceholder ? 'true' : undefined}
          style={{ backgroundImage: `url("${backdrop.src}")` }}
          aria-hidden="true"
        />
        <span className="sectors-sector-body">
          <span className="sectors-sector-title">{node.title}</span>
          {tagline ? <span className="sectors-sector-tagline">{tagline}</span> : null}
        </span>
        {domains > 0 ? (
          <span className="sectors-sector-meta">
            {domains} {domains === 1 ? 'domain' : 'domains'}
          </span>
        ) : null}
      </NodeCard>
    );
  }

  return (
    <NodeCard
      ref={ref}
      node={node}
      size="sm"
      className="sectors-domain"
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
