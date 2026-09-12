import { Fragment, type CSSProperties } from 'react';
import type { BeliefNode, BeliefType } from '../../data/types';
import { cn } from '../../lib/cn';
import { useLayerState } from '../helpers';
import type { LayerViewProps } from '../types';
import { BeliefsNode } from './BeliefsNode';
import { isBelief } from './beliefs';
import './beliefs.css';

interface Slot {
  align: 'flex-start' | 'center' | 'flex-end';
  ox: number;
  oy: number;
}

/**
 * Per-index nudges so each cluster reads as a loose group rather than a
 * column. The right cluster mirrors the left so both lean toward the divider.
 */
const LEFT_SLOTS: Slot[] = [
  { align: 'flex-end', ox: -6, oy: 4 },
  { align: 'flex-start', ox: 22, oy: -4 },
  { align: 'center', ox: 10, oy: -2 },
  { align: 'flex-end', ox: -18, oy: -8 },
  { align: 'flex-start', ox: 14, oy: 0 },
];

const RIGHT_SLOTS: Slot[] = LEFT_SLOTS.map((s) => ({
  align: s.align === 'flex-start' ? 'flex-end' : s.align === 'flex-end' ? 'flex-start' : 'center',
  ox: -s.ox,
  oy: s.oy,
}));

const CLUSTERS: { type: BeliefType; title: string; hint: string; slots: Slot[] }[] = [
  { type: 'threat', title: 'Threats', hint: 'What we are up against', slots: LEFT_SLOTS },
  { type: 'advantage', title: 'Advantages', hint: 'What we build on', slots: RIGHT_SLOTS },
];

/**
 * What We Believe: two clusters facing each other across a soft divider —
 * threats on the left in the warm peach, advantages on the right in green-2.
 */
export function BeliefsLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const { isDimmed } = useLayerState(layer);
  const beliefs = nodes.filter(isBelief);

  return (
    <div className="beliefs-layer" role="group" aria-label={layer.title}>
      {CLUSTERS.map((cluster, ci) => {
        const members: BeliefNode[] = beliefs.filter((n) => n.beliefType === cluster.type);
        return (
          <Fragment key={cluster.type}>
            {ci > 0 ? <div className="beliefs-divider" aria-hidden="true" /> : null}
            <section
              className={cn('beliefs-cluster', `beliefs-cluster--${cluster.type}`)}
              aria-label={cluster.title}
            >
              <header className="beliefs-cluster-head">
                <span className="beliefs-cluster-dot" aria-hidden="true" />
                <h3 className="beliefs-cluster-title sc-label">{cluster.title}</h3>
                <span className="beliefs-cluster-hint">{cluster.hint}</span>
              </header>

              <div className="beliefs-cluster-nodes">
                {members.map((node, i) => {
                  const slot = cluster.slots[i % cluster.slots.length];
                  const style = {
                    alignSelf: slot.align,
                    '--ox': `${slot.ox}px`,
                    '--oy': `${slot.oy}px`,
                  } as CSSProperties;
                  return (
                    <div key={node.id} className="beliefs-slot" style={style}>
                      <BeliefsNode
                        node={node}
                        dimmed={isDimmed(node)}
                        active={node.id === focusedId}
                        onSelect={onSelect}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          </Fragment>
        );
      })}
    </div>
  );
}
