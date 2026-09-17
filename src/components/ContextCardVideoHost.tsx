import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Node } from '../data/types';
import { hasVideo } from '../lib/video';
import { useUi } from '../store/ui';
import { VideoPlayer } from './VideoPlayer';
import './context-card.css';

export interface VideoHostProps {
  node: Node;
  /** Overrides `node.videoLink` — a context item's url. */
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
 * the `role="dialog"` expanded surface shows. The player owns every event
 * (`video_play` … `video_complete`), so nothing is tracked here.
 */
export function VideoHost({ node, link, label, onClose }: VideoHostProps) {
  const videoExpanded = useUi((s) => s.videoExpanded);
  const armed = useRef(false);

  const playable = hasVideo(link ?? node.videoLink);

  useEffect(() => {
    if (videoExpanded) armed.current = true;
    else if (armed.current) onClose();
  }, [videoExpanded, onClose]);

  // Callers gate on `hasVideo` too; this keeps a stray host from stranding the
  // caller's `playing` state on a player that would never open.
  useEffect(() => {
    if (!playable) onClose();
  }, [playable, onClose]);

  if (!playable) return null;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="ctx-video-host">
      <VideoPlayer node={node} link={link} label={label} initialExpanded />
    </div>,
    document.body,
  );
}
