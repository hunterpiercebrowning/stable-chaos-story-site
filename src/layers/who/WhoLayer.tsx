import { kebab } from '../../data';
import type { Node, WhoNode as WhoNodeData } from '../../data/types';
import type { LayerViewProps } from '../types';
import { WhoNode } from './WhoNode';
import './who.css';

/** Founders are the Stable Chaos people; everyone else is a portfolio president. */
function isFounder(node: WhoNodeData): boolean {
  return kebab(node.company) === 'stable-chaos' || /founder/i.test(node.role);
}

function isWho(node: Node): node is WhoNodeData {
  return node.layerId === 'who';
}

/**
 * Who We Are: a founders row (two larger cards, centered) above a row of
 * portfolio presidents. This layer has neither emphasis nor density, so the
 * cards never dim or collapse.
 */
export function WhoLayer({ nodes, focusedId, onSelect }: LayerViewProps) {
  const people = nodes.filter(isWho);
  const founders = people.filter(isFounder);
  const presidents = people.filter((n) => !isFounder(n));

  return (
    <div className="who-layer sc-scroll">
      {founders.length > 0 ? (
        <section className="who-row who-row--founders" aria-label="Founders">
          <div className="sc-label who-row-label">Founders</div>
          <div className="who-grid who-grid--founders">
            {founders.map((node) => (
              <WhoNode
                key={node.id}
                node={node}
                active={node.id === focusedId}
                onSelect={onSelect}
                variant="founder"
              />
            ))}
          </div>
        </section>
      ) : null}

      {presidents.length > 0 ? (
        <section className="who-row who-row--presidents" aria-label="Presidents">
          <div className="sc-label who-row-label">Presidents</div>
          <div className="who-grid who-grid--presidents">
            {presidents.map((node) => (
              <WhoNode
                key={node.id}
                node={node}
                active={node.id === focusedId}
                onSelect={onSelect}
                variant="president"
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
