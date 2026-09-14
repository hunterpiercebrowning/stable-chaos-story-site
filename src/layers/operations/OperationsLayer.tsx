import type { CSSProperties } from 'react';
import type { LayerViewProps } from '../types';
import './operations.css';

/**
 * Our Operational Advantage — hard-coded from the raise deck (slide 6). Two
 * panels: the operators (a decade together, the exit, two headline figures)
 * in the warm peach, and the shared software layer in green-2, listed as four
 * numbered capabilities. No nodes: this copy does not change over time, so it
 * lives here rather than in `content/`.
 */

const OPERATORS = {
  eyebrow: 'The operators',
  heading: 'A team that has already grown and won together.',
  body:
    'Over a decade operating side by side from zero all the way through to an exit and starting ' +
    'back again. The trust, speed and collaboration are already built.',
  stats: [
    { value: '11+', label: 'Years together' },
    { value: '12.14', label: 'MOIC' },
  ],
};

const SOFTWARE = {
  eyebrow: 'The software layer',
  heading: 'Built once. Compounding across every venture.',
  items: [
    {
      title: 'Operations Optimization',
      body: 'Internal tooling that keeps every venture lean, fast and self-sufficient.',
    },
    {
      title: 'Secure Comms & IP Protection',
      body: 'Protecting communications, data and proprietary advantage across the portfolio.',
    },
    {
      title: 'AI Guardrails',
      body: 'Safe, controlled AI deployment in sensitive and regulated environments.',
    },
    {
      title: 'Embedded Software',
      body: 'Purpose-built software living inside our hardware and lab systems.',
    },
  ],
};

export function OperationsLayer({ layer }: LayerViewProps) {
  return (
    <div className="operations" role="group" aria-label={layer.title}>
      <div className="operations-grid">
      <section className="operations-panel operations-panel--operators" aria-label={OPERATORS.eyebrow}>
        <header className="operations-head">
          <span className="sc-label operations-eyebrow">
            <span className="operations-eyebrow-dot" aria-hidden="true" />
            {OPERATORS.eyebrow}
          </span>
          <h2 className="operations-heading">{OPERATORS.heading}</h2>
          <p className="operations-body">{OPERATORS.body}</p>
        </header>

        <dl className="operations-stats">
          {OPERATORS.stats.map((stat) => (
            <div key={stat.label} className="operations-stat">
              <dt className="sc-label operations-stat-label">{stat.label}</dt>
              <dd className="operations-stat-value">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="operations-panel operations-panel--software" aria-label={SOFTWARE.eyebrow}>
        <header className="operations-head">
          <span className="sc-label operations-eyebrow">
            <span className="operations-eyebrow-dot" aria-hidden="true" />
            {SOFTWARE.eyebrow}
          </span>
          <h2 className="operations-heading">{SOFTWARE.heading}</h2>
        </header>

        <ol className="operations-list">
          {SOFTWARE.items.map((item, i) => (
            <li key={item.title} className="operations-item" style={{ '--i': i } as CSSProperties}>
              <span className="operations-item-index" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="operations-item-body">
                <span className="operations-item-title">{item.title}</span>
                <span className="operations-item-text">{item.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      </div>
    </div>
  );
}
