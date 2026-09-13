import type { Node, WhoGroup, WhoNode as WhoNodeData } from '../../data/types';
import type { LayerViewProps } from '../types';
import { WhoNode } from './WhoNode';
import './who.css';

function isWho(node: Node): node is WhoNodeData {
  return node.layerId === 'who';
}

const ROWS: { group: WhoGroup; label: string }[] = [
  { group: 'founder', label: 'Founders' },
  { group: 'leader', label: 'Leaders' },
  { group: 'expert', label: 'Experts' },
];

/**
 * Who We Are: a founders row (two larger cards) above rows of portfolio
 * leaders and experts, every row centred. This layer has neither emphasis nor
 * density, so the cards never dim or collapse.
 */
export function WhoLayer({ nodes, focusedId, onSelect }: LayerViewProps) {
  const people = nodes.filter(isWho);

  return (
    <div className="who-layer">
      {ROWS.map(({ group, label }) => {
        const members = people.filter((n) => n.group === group);
        if (members.length === 0) return null;
        return (
          <section key={group} className={`who-row who-row--${group}`} aria-label={label}>
            <div className="sc-label who-row-label">{label}</div>
            <div className={`who-grid who-grid--${group}`}>
              {members.map((node) => (
                <WhoNode
                  key={node.id}
                  node={node}
                  active={node.id === focusedId}
                  onSelect={onSelect}
                  variant={group}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
