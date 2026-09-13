import { NodeCard } from '../../components/NodeCard';
import { Placeholder } from '../../components/Placeholder';
import { cn } from '../../lib/cn';
import type { WhoGroup } from '../../data/types';
import type { NodeViewProps } from '../types';
import './who.css';

export interface WhoNodeProps extends NodeViewProps {
  /** Founders render larger; leaders and experts share the compact card. */
  variant?: WhoGroup;
}

/**
 * A person card: circular headshot, name, job title and the company as a
 * small label. Built on `NodeCard` so the shared `layoutId` still grows the
 * card into the focus frame.
 */
export function WhoNode({
  node,
  dimmed,
  collapsed,
  active,
  onSelect,
  variant = 'leader',
}: WhoNodeProps) {
  if (node.layerId !== 'who') return null;

  return (
    <NodeCard
      node={node}
      size={variant === 'founder' ? 'lg' : 'md'}
      dimmed={dimmed}
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
      className={cn('who-card', `who-card--${variant}`, variant !== 'founder' && 'who-card--compact')}
    >
      <span className="who-card-headshot">
        {node.headshotFile ? (
          <img className="who-card-img" src={node.headshotFile} alt="" loading="lazy" />
        ) : (
          <Placeholder seed={node.id} variant="headshot" label={node.title} bare />
        )}
      </span>
      <span className="who-card-body">
        <span className="who-card-name">{node.title}</span>
        <span className="who-card-role">{node.role}</span>
        <span className="sc-label who-card-company">{node.company}</span>
      </span>
    </NodeCard>
  );
}
