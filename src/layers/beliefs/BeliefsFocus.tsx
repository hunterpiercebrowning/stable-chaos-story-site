import { FocusFrame } from '../../components/FocusFrame';
import { Icon } from '../../components/Icon';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy, getLayer } from '../../data';
import { cn } from '../../lib/cn';
import { GenericFocus } from '../GenericFocus';
import type { FocusViewProps } from '../types';
import { BELIEF_LABEL, beliefIcon, isBelief } from './beliefs';
import './beliefs.css';

/**
 * Belief focus: the frame takes the belief's type color as its accent, the
 * eyebrow carries the icon and type, then tagline, blurb, bullets and the
 * video slot.
 */
export function BeliefsFocus({ node, onClose }: FocusViewProps) {
  if (!isBelief(node)) return <GenericFocus node={node} onClose={onClose} />;

  const copy = getCopy(node);
  const type = node.beliefType;
  const icon = beliefIcon(node);
  const layerTitle = getLayer('beliefs')?.title ?? 'What We Believe';

  return (
    <FocusFrame
      node={node}
      onClose={onClose}
      className={cn('beliefs-focus', `beliefs-focus--${type}`)}
      eyebrow={
        <span className="beliefs-focus-eyebrow">
          <span className="beliefs-focus-eyebrow-icon" aria-hidden="true">
            <Icon name={icon} size={14} />
          </span>
          <span className="beliefs-focus-eyebrow-type">{BELIEF_LABEL[type]}</span>
          <span className="beliefs-focus-eyebrow-sep" aria-hidden="true">
            ·
          </span>
          <span>{layerTitle}</span>
        </span>
      }
      subtitle={copy.tagline}
      body={<p>{copy.blurb}</p>}
      bullets={copy.bullets}
      extras={<VideoPlayer node={node} />}
    />
  );
}
