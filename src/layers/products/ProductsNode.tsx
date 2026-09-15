import { Icon } from '../../components/Icon';
import { NodeCard } from '../../components/NodeCard';
import { SectorTag } from '../../components/SectorTag';
import { getBackdrop, getCopy } from '../../data';
import type { Node, ProductNode } from '../../data/types';
import { cn } from '../../lib/cn';
import type { NodeViewProps } from '../types';
import { CATEGORY_ICON } from './categoryIcon';
import { getSectorProductStats, type SectorProductStats } from './productStats';
import './products.css';

/** One icon chip per category with its product count. */
export function CategoryMix({ stats, className }: { stats: SectorProductStats; className?: string }) {
  return (
    <span className={cn('products-mix', className)}>
      {stats.categories.map(({ category, count }) => (
        <span key={category} className="products-mix-item" title={`${count} ${category}`}>
          <Icon name={CATEGORY_ICON[category]} size={14} />
          <span className="products-mix-count">{count}</span>
          <span className="products-mix-label">{category}</span>
        </span>
      ))}
    </span>
  );
}

const isProduct = (node: Node): node is ProductNode => node.layerId === 'products';

/**
 * Products nodes. A sector primary is the Compressed hero card: sector motif
 * backdrop, the category mix, title, the summary tagline and the product
 * counts; `collapsed` hides it under Expanded, where the bands take over.
 *
 * A product (secondary) card: category icon top-left, title, category label,
 * then the sector and stage tags the base card already renders. Active
 * products are solid; slated ones are dashed and tagged "Slated".
 */
export function ProductsNode({ node, collapsed, active, onSelect }: NodeViewProps) {
  if (!isProduct(node)) return null;

  if (node.tier === 'primary') {
    const { tagline } = getCopy(node);
    const backdrop = getBackdrop(node);
    const stats = getSectorProductStats(node);
    return (
      <NodeCard
        node={node}
        size="md"
        collapsed={collapsed}
        active={active}
        // A hidden card should not be the origin of the grow-into-focus transition.
        layoutId={collapsed ? null : undefined}
        onSelect={onSelect}
        className="products-sector-card"
      >
        <span
          className="products-sector-backdrop"
          style={{ backgroundImage: `url("${backdrop.src}")` }}
          aria-hidden="true"
        />
        <span className="node-card-media">
          <CategoryMix stats={stats} />
        </span>
        <span className="node-card-body">
          <span className="node-card-title">{node.title}</span>
          <span className="products-sector-tagline">
            {tagline}
            {node.tagline ? null : <span className="sc-placeholder-tag products-sector-ph">placeholder</span>}
          </span>
        </span>
        <span className="node-card-tags">
          <SectorTag sector={node.sector} />
          {stats.total > 0 ? (
            <>
              <span className="products-sector-meta">
                {stats.total} {stats.total === 1 ? 'product' : 'products'}
              </span>
              <span className="products-sector-stages">
                {stats.active} active
                <span className="products-band-count-sep">·</span>
                {stats.slated} slated
              </span>
            </>
          ) : null}
        </span>
      </NodeCard>
    );
  }

  const slated = node.stage === 'slated';
  return (
    <NodeCard
      node={node}
      size="md"
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
      className={cn('products-node', slated && 'products-node--slated')}
      backdrop={
        node.backgroundImage ? (
          <span
            className="products-node-backdrop"
            style={{ backgroundImage: `url("${node.backgroundImage}")` }}
            aria-hidden="true"
          />
        ) : null
      }
      media={
        node.category ? (
          <span className="products-node-icon" data-stage={node.stage}>
            <Icon name={CATEGORY_ICON[node.category]} size={18} />
          </span>
        ) : null
      }
      subtitle={node.category}
    />
  );
}
