import { Fragment, type CSSProperties } from 'react';
import { Icon } from '../../components/Icon';
import type { BeliefNode, BeliefType } from '../../data/types';
import { cn } from '../../lib/cn';
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
 * Per-index nudges so each column reads as a loose stack rather than a rigid
 * list. Kept gentle: three columns leave less room than the old two.
 */
const SLOTS: Slot[] = [
  { align: 'flex-start', ox: 0, oy: 0 },
  { align: 'flex-end', ox: 0, oy: -4 },
  { align: 'center', ox: 0, oy: -2 },
  { align: 'flex-start', ox: 6, oy: -6 },
  { align: 'flex-end', ox: -6, oy: 0 },
];

/** Left → right: what threatens businesses, what is changing, what we bring. */
const COLUMNS: { type: BeliefType; title: string; hint: string }[] = [
  { type: 'threat', title: 'Threats', hint: 'New risk factors facing companies & critical sectors' },
  {
    type: 'disruption',
    title: 'Disruptions',
    hint: 'The shifting landscape of building products and services',
  },
  {
    type: 'advantage',
    title: 'Advantages',
    hint: 'Our unique competitive advantages in the era of AI',
  },
];

/**
 * What We Believe: three columns read left to right — threats in orange,
 * disruptions in yellow, advantages in green-2 — joined by flow connectors so
 * the page tells one story: this is what we are up against, this is how the
 * ground is shifting, and this is why we win on the new ground.
 */
export function BeliefsLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const beliefs = nodes.filter(isBelief);

  return (
    <div className="beliefs-layer" role="group" aria-label={layer.title}>
      <div className="beliefs-story">
        {COLUMNS.map((column, ci) => {
          const members: BeliefNode[] = beliefs.filter((n) => n.beliefType === column.type);
          const prev = COLUMNS[ci - 1];
          return (
            <Fragment key={column.type}>
              {prev ? (
                <div
                  className={cn('beliefs-flow', `beliefs-flow--${prev.type}-${column.type}`)}
                  aria-hidden="true"
                >
                  <span className="beliefs-flow-arrow">
                    <Icon name="chevron-right" size={14} />
                  </span>
                </div>
              ) : null}
              <section
                className={cn('beliefs-column', `beliefs-column--${column.type}`)}
                aria-label={column.title}
              >
                <header className="beliefs-column-head">
                  <span className="beliefs-column-step" aria-hidden="true">
                    {String(ci + 1).padStart(2, '0')}
                  </span>
                  <span className="beliefs-column-dot" aria-hidden="true" />
                  <h3 className="beliefs-column-title sc-label">{column.title}</h3>
                  <span className="beliefs-column-hint">{column.hint}</span>
                </header>

                <div className="beliefs-column-nodes">
                  {members.map((node, i) => {
                    const slot = SLOTS[i % SLOTS.length];
                    const style = {
                      alignSelf: slot.align,
                      '--ox': `${slot.ox}px`,
                      '--oy': `${slot.oy}px`,
                    } as CSSProperties;
                    return (
                      <div key={node.id} className="beliefs-slot" style={style}>
                        <BeliefsNode
                          node={node}
                          active={node.id === focusedId}
                          onSelect={onSelect}
                        />
                      </div>
                    );
                  })}
                  {members.length === 0 ? (
                    <p className="beliefs-column-empty">Nothing here yet.</p>
                  ) : null}
                </div>
              </section>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
