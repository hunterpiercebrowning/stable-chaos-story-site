import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { nodeSectors } from '../data/normalize';
import type { Node } from '../data/types';
import { cn } from '../lib/cn';
import { track } from '../lib/track';
import { navVia } from '../store/ui';
import { Icon } from './Icon';
import './focus-frame.css';

export interface FocusFrameProps {
  node: Node;
  /** Large media column (headshot, logo, scene …). */
  media?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  body?: ReactNode;
  bullets?: string[];
  /** Video, gallery, buttons — rendered under the body. */
  extras?: ReactNode;
  onClose?: () => void;
  className?: string;
  /** `null` opts out of the shared-element transition. */
  layoutId?: string | null;
  /** What brought the user here; goes into `node_focus`. Defaults to the recorded navigation intent. */
  via?: string;
}

/**
 * The focus surface for every layer: a glass panel that grows out of the node
 * card. Layers fill the slots; the frame owns the chrome and the focus/blur
 * tracking.
 */
export function FocusFrame({
  node,
  media,
  eyebrow,
  title,
  subtitle,
  body,
  bullets,
  extras,
  onClose,
  className,
  layoutId,
  via,
}: FocusFrameProps) {
  const reduced = useReducedMotion();
  const sectors = nodeSectors(node);
  const openedAt = useRef(Date.now());

  // The single `node_focus` / `node_blur` source for every layer. `via` is the
  // navigation intent recorded by whichever control brought us here.
  useEffect(() => {
    openedAt.current = Date.now();
    const id = node.id;
    const layerId = node.layerId;
    track('node_focus', { layerId, nodeId: id, via: via ?? navVia(`/${layerId}/${id}`) });
    const start = openedAt.current;
    return () => {
      track('node_blur', { layerId, nodeId: id, dwellMs: Date.now() - start });
    };
    // `via` is informational only — re-firing on its change would double-count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, node.layerId]);

  return (
    <motion.section
      className={cn('focus-frame', className)}
      layoutId={reduced || layoutId === null ? undefined : (layoutId ?? `node-${node.id}`)}
      data-layer={node.layerId}
      data-sector={sectors[0]}
      aria-label={node.title}
      transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {onClose ? (
        <button type="button" className="focus-close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={18} />
        </button>
      ) : null}

      <div className={cn('focus-grid', media && 'focus-grid--media')}>
        {/* With a media column, the extras (video, buttons) sit under the media
            so the text column keeps its height for the copy. */}
        {media ? (
          <div className="focus-media">
            {media}
            {extras ? <div className="focus-extras">{extras}</div> : null}
          </div>
        ) : null}

        <div className="focus-main sc-scroll">
          {eyebrow ? <div className="sc-label focus-eyebrow">{eyebrow}</div> : null}
          <h2 className="focus-title">{title ?? node.title}</h2>
          {subtitle ? <div className="focus-subtitle">{subtitle}</div> : null}
          {body ? <div className="focus-body">{body}</div> : null}

          {bullets && bullets.length > 0 ? (
            <ul className="focus-bullets">
              {bullets.map((b, i) => (
                <li key={i}>
                  <span className="focus-bullet-mark" />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}

          {extras && !media ? <div className="focus-extras">{extras}</div> : null}
        </div>
      </div>
    </motion.section>
  );
}
