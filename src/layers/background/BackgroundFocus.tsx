import { FocusFrame } from '../../components/FocusFrame';
import { SourceEmbed } from '../../components/SourceEmbed';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy, getLayer } from '../../data';
import { GenericFocus } from '../GenericFocus';
import type { FocusViewProps } from '../types';
import './background.css';

/**
 * A background node's focus: the copy, then its source embedded in place
 * (YouTube player, X post, article preview). A `video_link` that is not the
 * source itself still gets the usual Watch affordance under it. Nodes without
 * a source fall back to the generic focus.
 */
export function BackgroundFocus({ node, onClose }: FocusViewProps) {
  if (node.layerId !== 'background' || !node.sourceUrl) return <GenericFocus node={node} onClose={onClose} />;

  const copy = getCopy(node);
  const separateVideo = node.videoLink.trim() && node.videoLink.trim() !== node.sourceUrl;

  return (
    <FocusFrame
      node={node}
      onClose={onClose}
      className="background-focus"
      eyebrow={getLayer(node.layerId)?.title ?? ''}
      subtitle={copy.tagline}
      body={copy.blurb ? <p>{copy.blurb}</p> : null}
      bullets={copy.bullets}
      extras={
        <>
          <SourceEmbed node={node} />
          {separateVideo ? <VideoPlayer node={node} /> : null}
        </>
      }
    />
  );
}
