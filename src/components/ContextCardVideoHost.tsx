import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Node } from '../data/types';
import { track } from '../lib/track';
import { resolveVideoSource } from '../lib/video';
import { useUi } from '../store/ui';
import { VideoPlayer } from './VideoPlayer';
import './context-card.css';

export interface VideoHostProps {
  node: Node;
  /** Overrides `node.videoLink` — a context item's url, or empty for the placeholder. */
  link?: string;
  label?: string;
  /** Called once the player has been closed (close button, Esc, node change). */
  onClose: () => void;
}

/**
 * Launches the shared `VideoPlayer` straight into its expanded state, portalled
 * to `<body>` so it covers the whole viewport rather than the 320px tray or
 * the welcome stage. Mount it when the user asks to play; it unmounts itself
 * via `onClose` when `videoExpanded` drops back to false.
 *
 * The player's own inline poster button is hidden by `.ctx-video-host` — only
 * the `role="dialog"` expanded surface shows. WS10 keeps that role.
 */
export function VideoHost({ node, link, label, onClose }: VideoHostProps) {
  const videoExpanded = useUi((s) => s.videoExpanded);
  const setVideoExpanded = useUi((s) => s.setVideoExpanded);
  const armed = useRef(false);

  useEffect(() => {
    track('video_play', { nodeId: node.id, source: resolveVideoSource(link ?? node.videoLink).kind, pct: 0 });
    setVideoExpanded(true);
    // Fire once per launch — the node/link cannot change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoExpanded) armed.current = true;
    else if (armed.current) onClose();
  }, [videoExpanded, onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="ctx-video-host">
      <VideoPlayer node={node} link={link} label={label} />
    </div>,
    document.body,
  );
}
