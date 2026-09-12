import { ContextCard } from '../../components/ContextCard';
import { Icon } from '../../components/Icon';
import type { BackgroundNode, ContextItem } from '../../data/types';
import { GenericLayer } from '../GenericLayer';
import type { LayerViewProps } from '../types';
import './background.css';

/**
 * Layer 6 — Foundational Background. No nodes yet, so this is a designed
 * "coming soon" state: what the layer will hold, and six ghosted source cards
 * in the ContextCard style, one per item type. Once `background-nodes.json`
 * has entries the generic grid takes over. The up arrow to Products is the
 * stage header's.
 */

/** Synthetic node: seeds the ghost cards' placeholder art and carries an id. */
const PREVIEW_NODE: BackgroundNode = {
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
    title: 'Primary document, filing or technical report',
    source: 'Issuing body',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: 'Page references and the specific figures cited across the site.',
  },
  {
    type: 'video',
    title: 'Talk, briefing or interview',
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
    title: 'Program page, dataset or standard',
    source: 'example.org',
    date: '',
    url: '',
    thumbnail: '',
    blurb: 'Where the underlying material lives.',
  },
  {
    type: 'image',
    title: 'Chart, map or figure',
    source: 'Source',
    date: 'Year',
    url: '',
    thumbnail: '',
    blurb: '',
  },
];

export function BackgroundLayer(props: LayerViewProps) {
  if (props.nodes.length > 0) return <GenericLayer {...props} />;

  return (
    <div className="background sc-scroll">
      <div className="background-intro">
        <span className="background-eyebrow">
          <Icon name="clock" size={13} />
          Coming soon
        </span>
        <h2 className="background-title">The sources behind every claim</h2>
        <p className="background-desc">
          Third-party reporting, research and primary documents that support the claims made across
          the layers above.
        </p>
      </div>

      <div className="background-grid" aria-hidden="true">
        {PREVIEW_ITEMS.map((item, i) => (
          <ContextCard
            key={item.type}
            item={item}
            node={PREVIEW_NODE}
            index={i}
            ghost
            className="background-card"
          />
        ))}
      </div>
    </div>
  );
}
