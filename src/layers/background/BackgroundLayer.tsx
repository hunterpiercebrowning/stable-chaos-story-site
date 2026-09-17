import type { CSSProperties } from 'react';
import { ContextCard } from '../../components/ContextCard';
import { Icon } from '../../components/Icon';
import type { BackgroundNode as BackgroundNodeData, ContextItem } from '../../data/types';
import type { LayerViewProps } from '../types';
import { BackgroundNode } from './BackgroundNode';
import './background.css';

/**
 * Layer 6 — Foundational Background: an intro and a grid of source cards in the
 * ContextCard style, one per node. Until `background-nodes.json` has entries
 * the grid is six ghosted cards, one per item type, under a "coming soon"
 * eyebrow. The up arrow to Products is the stage header's.
 */

/** Synthetic node: seeds the ghost cards' placeholder art and carries an id. */
const PREVIEW_NODE: BackgroundNodeData = {
  id: 'background-preview',
  layerId: 'background',
  tier: 'primary',
  order: 0,
  title: 'Foundational Background',
  tagline: '',
  blurb: '',
  bulletPoints: [],
  videoLink: '',
  contextItems: [],
};

const PREVIEW_ITEMS: ContextItem[] = [
  {
    type: 'article',
    title: 'Independent reporting that frames the sector',
    source: 'Publication',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: 'A short summary of why this piece matters and which claim it supports.',
  },
  {
    type: 'pdf',
    title: 'Primary document, filing, or technical report',
    source: 'Issuing body',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: 'Page references and the specific figures cited across the site.',
  },
  {
    type: 'video',
    title: 'Talk, briefing, or interview',
    source: 'Venue',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: '',
  },
  {
    type: 'quote',
    title: 'A load-bearing statement from a named authority, quoted exactly as given.',
    source: 'Name, role',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: '',
  },
  {
    type: 'link',
    title: 'Program page, dataset, or standard',
    source: 'example.org',
    date: '',
    url: '',
    thumbnail: '',
    blurb: 'Where the underlying material lives.',
  },
  {
    type: 'image',
    title: 'Chart, map, or figure',
    source: 'Source',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: '',
  },
];

export function BackgroundLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const ready = nodes.length > 0;

  return (
    <div className="background">
      <div className="background-intro">
        <span className="background-eyebrow" data-ready={ready ? 'true' : undefined}>
          <Icon name={ready ? 'book' : 'clock'} size={13} />
          {ready ? 'Sources' : 'Coming soon'}
        </span>
        <h2 className="background-title">The sources behind every claim</h2>
        <p className="background-desc">
          Third-party reporting, research, and primary documents that support the claims made across
          the layers above.
        </p>
      </div>

      {ready ? (
        <div className="background-grid" role="group" aria-label={layer.title}>
          {nodes.map((node, i) => (
            <BackgroundNode
              key={node.id}
              node={node}
              index={i}
              active={node.id === focusedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <PreviewGrid />
      )}
    </div>
  );
}

function PreviewGrid() {
  return (
    <div className="background-grid" aria-hidden="true">
      {PREVIEW_ITEMS.map((item, i) => (
        <div key={item.type} className="background-card" style={{ '--i': i } as CSSProperties}>
          <ContextCard item={item} node={PREVIEW_NODE} index={i} ghost />
        </div>
      ))}
    </div>
  );
}
