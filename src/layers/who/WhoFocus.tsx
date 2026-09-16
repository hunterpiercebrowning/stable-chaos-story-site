import { FocusFrame } from '../../components/FocusFrame';
import { Placeholder } from '../../components/Placeholder';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy } from '../../data';
import type { FocusViewProps } from '../types';
import './who.css';

/**
 * Person focus: a large headshot with a soft radial glow on the left; company
 * eyebrow, name, job title, bio and resume bullets on the right, with the
 * video slot underneath. `FocusFrame` supplies the close button, the related
 * strip (company node; every company for founders) and focus/blur tracking.
 */
export function WhoFocus({ node, onClose }: FocusViewProps) {
  if (node.layerId !== 'who') return null;
  const copy = getCopy(node);

  const media = (
    <div className="who-focus-media">
      <div className="who-focus-glow" aria-hidden="true" />
      <div className="who-focus-headshot">
        {node.headshotFile ? (
          <img className="who-focus-img" src={node.headshotFile} alt={node.title} />
        ) : (
          <Placeholder seed={node.id} variant="headshot" label={node.title} />
        )}
      </div>
    </div>
  );

  return (
    <FocusFrame
      node={node}
      onClose={onClose}
      className="who-focus"
      media={media}
      eyebrow={node.company}
      title={node.title}
      subtitle={node.role}
      body={copy.blurb ? <p>{copy.blurb}</p> : null}
      bullets={copy.bullets}
      extras={<VideoPlayer node={node} label={`Meet ${node.title.split(' ')[0]}`} />}
    />
  );
}
