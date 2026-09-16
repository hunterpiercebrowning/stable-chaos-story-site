import { FocusFrame } from '../components/FocusFrame';
import { Placeholder } from '../components/Placeholder';
import { VideoPlayer } from '../components/VideoPlayer';
import { getCopy, getLayer, getPrimarySector } from '../data';
import type { FocusViewProps } from './types';
import './generic.css';

/**
 * Default focus view: every text field plus the video placeholder. Phase 1
 * replaces this per layer with a purpose-built layout.
 */
export function GenericFocus({ node, onClose }: FocusViewProps) {
  const copy = getCopy(node);
  const layer = getLayer(node.layerId);
  const sector = getPrimarySector(node);

  const eyebrow =
    node.layerId === 'who'
      ? node.company
      : node.layerId === 'holdings' && node.tier === 'secondary'
        ? node.kind === 'service'
          ? 'Service'
          : 'Product'
        : (layer?.title ?? '');

  const subtitle = node.layerId === 'who' ? node.role : copy.tagline;

  const media =
    node.layerId === 'who' ? (
      node.headshotFile ? (
        <img className="generic-focus-headshot" src={node.headshotFile} alt="" />
      ) : (
        <Placeholder seed={node.id} variant="headshot" sector={sector} label={node.title} />
      )
    ) : undefined;

  return (
    <FocusFrame
      node={node}
      onClose={onClose}
      media={media}
      eyebrow={eyebrow}
      subtitle={subtitle}
      body={copy.blurb ? <p>{copy.blurb}</p> : null}
      bullets={copy.bullets}
      extras={<VideoPlayer node={node} />}
    />
  );
}
