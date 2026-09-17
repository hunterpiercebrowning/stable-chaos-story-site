import type { CSSProperties } from 'react';
import type { SectorId } from '../../data/types';
import { SectorTag } from '../../components/SectorTag';
import type { LayerViewProps } from '../types';
import './trajectory.css';

/**
 * The Roadmap — hard-coded from the raise deck (slide 7, "Our Foundation").
 * Two timelines along a rail: what has already been built, one venture per
 * year, and what comes next. Each stop carries the tag of the sector or
 * sectors it belongs to, one pill per sector in its color. No nodes: the copy is fixed, so it lives here rather than in
 * `content/`.
 */

type Stop = { year: string; sectors: SectorId[]; title: string; body: string };

const BUILT: Stop[] = [
  {
    year: '2023',
    sectors: ['systems'],
    title: 'Starling Technologies',
    body: 'C2C, embedded AI & proprietary software accelerant.',
  },
  {
    year: '2024',
    sectors: ['systems'],
    title: 'Fountain City Partners',
    body: 'Airtight back-office, operations & compliance.',
  },
  {
    year: '2025',
    sectors: ['synbio'],
    title: 'Growth Curve Bio',
    body: 'Synthetic biology rapid iteration & biomanufacturing lab.',
  },
  {
    year: '2026',
    sectors: ['security'],
    title: 'Defense Product T&E',
    body: "Co-development with those executing our nation's critical missions.",
  },
];

const NEXT: Stop[] = [
  {
    year: '2026',
    sectors: ['synbio'],
    title: 'Genetic Engineering',
    body: 'DNA programming, host organism editing, and exotic organism harnessing.',
  },
  {
    year: '2027',
    sectors: ['synbio'],
    title: 'Bioproduct Commercialization',
    body: 'Industrial applications of proteins and peptides.',
  },
  {
    year: '2027',
    sectors: ['security'],
    title: 'Defense Product Commercialization',
    body: 'Large scale order fulfillment & fielding',
  },
  {
    year: '2027',
    sectors: ['synbio', 'security'],
    title: 'Hardware Acceleration',
    body: 'Increasing novel hardware product development across all sectors.',
  },
];

export function TrajectoryLayer({ layer }: LayerViewProps) {
  return (
    <div className="trajectory" role="group" aria-label={layer.title}>
      <Timeline label="Already built" stops={BUILT} variant="built" />
      <Timeline label="What's next" stops={NEXT} variant="next" offset={BUILT.length} />
    </div>
  );
}

type TimelineProps = {
  label: string;
  stops: Stop[];
  variant: 'built' | 'next';
  /** Number of stops that animate in before this rail; staggers the reveal. */
  offset?: number;
};

function Timeline({ label, stops, variant, offset = 0 }: TimelineProps) {
  return (
    <section
      className={`trajectory-section trajectory-section--${variant}`}
      style={{ '--offset': offset } as CSSProperties}
      aria-label={label}
    >
      <span className="trajectory-label sc-label">{label}</span>
      <ol className="trajectory-line">
        {stops.map((s, i) => (
          <li
            key={s.title}
            className="trajectory-stop"
            style={{ '--i': offset + i } as CSSProperties}
          >
            <span className="trajectory-marker" aria-hidden="true">
              <span className="trajectory-dot" />
            </span>
            <span className="trajectory-meta">
              <span className="trajectory-year">{s.year}</span>
              {s.sectors.map((sector) => (
                <SectorTag key={sector} sector={sector} className="trajectory-tag" />
              ))}
            </span>
            <span className="trajectory-title">{s.title}</span>
            <span className="trajectory-body">{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
