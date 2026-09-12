import { NodeCard } from '../../components/NodeCard';
import { Placeholder } from '../../components/Placeholder';
import { cn } from '../../lib/cn';
import type { NodeViewProps } from '../types';
import './who.css';

export type WhoNodeVariant = 'founder' | 'president';

export interface WhoNodeProps extends NodeViewProps {
  /** Founders render larger; presidents are visually subordinate. */
  variant?: WhoNodeVariant;
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
  variant = 'president',
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
      className={cn('who-card', `who-card--${variant}`)}
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
