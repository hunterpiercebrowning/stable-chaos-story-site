import { FocusFrame } from '../../components/FocusFrame';
import { SectorTag } from '../../components/SectorTag';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy, nodeSectors } from '../../data';
import { cn } from '../../lib/cn';
import type { FocusViewProps } from '../types';
import './sectors.css';

/**
 * Focus view for a Sector or a Domain: tier eyebrow with the sector tag(s),
 * title, tagline, blurb, bullets and the video slot. The related strip
 * (a sector's domains/services/products, a domain's sectors) is rendered by
 * `FocusFrame`.
 */
export function SectorsFocus({ node, onClose }: FocusViewProps) {
  const copy = getCopy(node);
  const sectors = nodeSectors(node);
  const isSector = node.tier === 'primary';
  const second = sectors[1];

  const eyebrow = (
    <span className="sectors-focus-eyebrow">
      <span>{isSector ? 'Sector' : 'Domain'}</span>
      {!isSector && sectors[0] ? <SectorTag sector={sectors[0]} second={second ?? null} /> : null}
    </span>
  );

  return (
    <FocusFrame
      node={node}
      onClose={onClose}
      className={cn('sectors-focus', second && `sectors-focus--${second}`)}
      eyebrow={eyebrow}
      subtitle={copy.tagline}
      body={<p>{copy.blurb}</p>}
      bullets={copy.bullets}
      extras={<VideoPlayer node={node} />}
    />
  );
}
