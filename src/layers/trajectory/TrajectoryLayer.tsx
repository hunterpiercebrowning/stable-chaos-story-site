import type { CSSProperties } from 'react';
import type { LayerViewProps } from '../types';
import './trajectory.css';

/**
 * What We've Done — hard-coded from the raise deck (slide 7, "Our Foundation").
 * An intro line and a four-stop timeline, one venture per year, along a green
 * rail. No nodes: the milestones are history and do not change, so the copy
 * lives here rather than in `content/`.
 */

const INTRO =
  "We've been busy building an atypical foundation of advanced technologies, facilities and " +
  'personnel across critical sectors upon which to continue expanding our product offerings ' +
  'and services.';

const MILESTONES = [
  {
    year: '2023',
    title: 'Starling Technologies',
    body: 'C2C, embedded AI & proprietary software accelerant.',
  },
  {
    year: '2024',
    title: 'Fountain City Partners',
    body: 'Airtight back-office, operations & compliance.',
  },
  {
    year: '2025',
    title: 'Growth Curve Bio',
    body: 'Synthetic biology rapid iteration & biomanufacturing lab.',
  },
  {
    year: '2026',
    title: 'Defense / Intel Products',
    body: "T&E with those serving our nation's most important missions.",
  },
];

export function TrajectoryLayer({ layer }: LayerViewProps) {
  return (
    <div className="trajectory" role="group" aria-label={layer.title}>
      <p className="trajectory-intro">{INTRO}</p>

      <ol className="trajectory-line" aria-label="Ventures by year">
        {MILESTONES.map((m, i) => (
          <li key={m.year} className="trajectory-stop" style={{ '--i': i } as CSSProperties}>
            <span className="trajectory-marker" aria-hidden="true">
              <span className="trajectory-dot" />
            </span>
            <span className="trajectory-year">{m.year}</span>
            <span className="trajectory-title">{m.title}</span>
            <span className="trajectory-body">{m.body}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
