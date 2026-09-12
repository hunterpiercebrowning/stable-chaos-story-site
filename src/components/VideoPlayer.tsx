import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { getPrimarySector, getPoster } from '../data';
import type { Node } from '../data/types';
import { resolveVideoSource } from '../lib/video';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import { Icon } from './Icon';
import './video-player.css';

export interface VideoPlayerProps {
  node: Node;
  /** Overrides `node.video_link`; used by the welcome intro slot. */
  link?: string;
  label?: string;
}

/**
 * Placeholder player. Inline it is a 16:9 poster with a play glyph; playing
 * expands it over the stage. WS10 swaps the expanded body for Stream/native
 * playback and adds progress events — the store contract stays the same.
 */
export function VideoPlayer({ node, link, label = 'Watch' }: VideoPlayerProps) {
  const videoExpanded = useUi((s) => s.videoExpanded);
  const setVideoExpanded = useUi((s) => s.setVideoExpanded);
  const source = resolveVideoSource(link ?? node.videoLink);
  const poster = getPoster(node);

  useEffect(() => {
    if (!videoExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setVideoExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [videoExpanded, setVideoExpanded]);

  // Never leave the stage covered when the focused node changes.
  useEffect(() => () => setVideoExpanded(false), [node.id, setVideoExpanded]);

  const open = () => {
    track('video_play', { nodeId: node.id, source: source.kind, pct: 0 });
    setVideoExpanded(true);
  };

  const close = () => {
    track('video_pause', { nodeId: node.id, source: source.kind });
    setVideoExpanded(false);
  };

  return (
    <>
      <button type="button" className="video-inline" onClick={open} aria-label={`${label} — ${node.title}`}>
        <img className="video-poster" src={poster} alt="" />
        <span className="video-play">
          <Icon name="play" size={22} />
        </span>
        <span className="video-meta">
          <span className="sc-label">{label}</span>
          {source.kind === 'none' ? <span className="video-note">placeholder</span> : null}
        </span>
      </button>

      <AnimatePresence>
        {videoExpanded ? (
          <motion.div
            className="video-expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
            role="dialog"
            aria-label={`${node.title} video`}
            data-sector={getPrimarySector(node) ?? undefined}
          >
            <img className="video-expanded-poster" src={poster} alt="" />
            <div className="video-expanded-body">
              <div className="sc-label">{node.title}</div>
              <p className="video-expanded-note">
                Video placeholder — {source.kind === 'none' ? 'no source yet' : source.kind}
              </p>
            </div>
            <button type="button" className="video-close" onClick={close} aria-label="Close video">
              <Icon name="close" size={18} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
