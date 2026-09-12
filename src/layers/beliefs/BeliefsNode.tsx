import { Icon } from '../../components/Icon';
import { NodeCard } from '../../components/NodeCard';
import { cn } from '../../lib/cn';
import { GenericNode } from '../GenericLayer';
import type { NodeViewProps } from '../types';
import { BELIEF_LABEL, beliefIcon, isBelief } from './beliefs';
import './beliefs.css';

/**
 * A belief card: icon badge, title and type pill, tinted by its type
 * (threat → peach, advantage → green-2). Row layout so a cluster of them
 * stacks compactly.
 */
export function BeliefsNode({ node, dimmed, collapsed, active, onSelect }: NodeViewProps) {
  if (!isBelief(node)) {
    return (
      <GenericNode node={node} dimmed={dimmed} collapsed={collapsed} active={active} onSelect={onSelect} />
    );
  }

  const type = node.beliefType;

  return (
    <NodeCard
      node={node}
      size="sm"
      className={cn('beliefs-node', `beliefs-node--${type}`)}
      dimmed={dimmed}
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
    >
      <span className="beliefs-node-icon" aria-hidden="true">
        <Icon name={beliefIcon(node)} size={20} />
      </span>
      <span className="beliefs-node-body">
        <span className="beliefs-node-title">{node.title}</span>
        <span className="tag beliefs-pill">
          <span className="tag-dot" />
          {BELIEF_LABEL[type]}
        </span>
      </span>
    </NodeCard>
  );
}
