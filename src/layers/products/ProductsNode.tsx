import { Icon } from '../../components/Icon';
import { NodeCard } from '../../components/NodeCard';
import { cn } from '../../lib/cn';
import type { NodeViewProps } from '../types';
import { CATEGORY_ICON } from './categoryIcon';
import './products.css';

/**
 * A product card: category icon top-left, title, category label, then the
 * sector and stage tags the base card already renders. Active products are
 * solid; slated ones are dashed, muted and tagged "Planned".
 */
export function ProductsNode({ node, dimmed, collapsed, active, onSelect }: NodeViewProps) {
  if (node.layerId !== 'products') return null;
  const slated = node.stage === 'slated';

  return (
    <NodeCard
      node={node}
      size="md"
      dimmed={dimmed}
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
      className={cn('products-node', slated && 'products-node--slated')}
      media={
        <span className="products-node-icon" data-stage={node.stage}>
          <Icon name={CATEGORY_ICON[node.category]} size={18} />
        </span>
      }
      subtitle={node.category}
    />
  );
}
