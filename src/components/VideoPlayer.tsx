import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { getPoster, getPrimarySector } from '../data';
import type { Node } from '../data/types';
import { cn } from '../lib/cn';
import { track } from '../lib/track';
import {
  crossedMilestones,
  loadStreamSdk,
  progressPct,
  resolveStreamPlayback,
  resolveVideoSource,
  streamEmbedUrl,
  type StreamPlayback,
  type StreamPlayerApi,
  type VideoKind,
  type VideoSource,
} from '../lib/video';
import { isTypingTarget } from '../store/keyboard';
import { useUi } from '../store/ui';
import { Icon } from './Icon';
import './video-player.css';

export interface VideoPlayerProps {
  node: Node;
  /** Overrides `node.videoLink`; used by the welcome intro slot. */
  link?: string;
  /** Inline label under the play glyph. */
  label?: string;
  /** Id reported in `video_*` events. Defaults to `node.id`. */
  nodeId?: string;
  /** Poster image; defaults to `getPoster(node)` (generated scene in sector color). */
  poster?: string;
  /** Start playback as soon as the expanded frame has settled. Default `true`. */
  autoplay?: boolean;
  className?: string;
  /** Called after the player expands (`true`) or collapses (`false`). */
  onExpandedChange?: (expanded: boolean) => void;
  /** Open straight into the expanded frame on mount (the tray / welcome host). */
  initialExpanded?: boolean;
}

const EASE = [0.22, 0.61, 0.36, 1] as const;
const LAYOUT_TRANSITION = { duration: 0.32, ease: EASE };
/** If the layout animation never reports completion, mount the player anyway. */
const READY_FALLBACK_MS = 700;

/** What the keyboard handler can ask of whichever player is mounted. */
interface PlayerControls {
  toggle(): void;
}

/**
 * Inline: a 16:9 poster with a centered play glyph. Play → the frame grows
 * (motion `layoutId`) over the stage content area and the real player mounts:
 * Cloudflare Stream in an `<iframe>` (signed token from `/api/video/token`,
 * unsigned UID fallback with a visible note) or a native `<video>`. Esc /
 * close animates it back. Emits `video_play` · `video_pause` ·
 * `video_progress` (25/50/75, once each) · `video_complete` via `track()`.
 */
export function VideoPlayer({
  node,
  link,
  label = 'Watch',
  nodeId,
  poster: posterProp,
  autoplay = true,
  className,
  onExpandedChange,
  initialExpanded = false,
}: VideoPlayerProps) {
  const reduced = useReducedMotion() ?? false;
  const instanceId = useId();
  const layoutId = reduced ? undefined : `video-${instanceId}`;

  const videoExpanded = useUi((s) => s.videoExpanded);
  const setVideoExpanded = useUi((s) => s.setVideoExpanded);

  const source = useMemo(() => resolveVideoSource(link ?? node.videoLink), [link, node.videoLink]);
  const poster = posterProp ?? getPoster(node);
  const sector = getPrimarySector(node) ?? undefined;
  const trackId = nodeId ?? node.id;

  const [open, setOpen] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const openRef = useRef(false);
  openRef.current = open;

  const inlineRef = useRef<HTMLButtonElement>(null);
  const controlsRef = useRef<PlayerControls | null>(null);

  const openPlayer = () => {
    const el = inlineRef.current;
    setHost(el?.closest<HTMLElement>('.stage-content') ?? el?.closest<HTMLElement>('.stage') ?? null);
    if (source.kind === 'none' || source.kind === 'r2') {
      // No playback possible; record the intent so the admin timeline shows it.
      track('video_play', { nodeId: trackId, source: source.kind, pct: 0 });
    }
    // Store first, then local state, so the render that opens the frame
    // already sees `videoExpanded === true` (see the external-close effect).
    setVideoExpanded(true);
    setOpen(true);
  };

  const close = useCallback(() => {
    setOpen(false);
    inlineRef.current?.focus({ preventScroll: true });
  }, []);

  // Hosts that skip the inline poster (tray video cards, the welcome ring)
  // open the frame on mount. Records the same play intent the click would.
  useEffect(() => {
    if (initialExpanded) openPlayer();
    // Mount-only by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror local state into the store and notify the parent.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      setVideoExpanded(true);
      onExpandedChange?.(true);
    } else if (wasOpen.current) {
      setVideoExpanded(false);
      onExpandedChange?.(false);
    }
    wasOpen.current = open;
    // `onExpandedChange` is a notification, not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setVideoExpanded]);

  // Somebody else (Stage close, another player) cleared the flag — follow it.
  useEffect(() => {
    if (open && !videoExpanded) setOpen(false);
  }, [open, videoExpanded]);

  // Never leave the stage covered when the node changes or we unmount.
  useEffect(
    () => () => {
      if (openRef.current) {
        openRef.current = false;
        setVideoExpanded(false);
        setOpen(false);
      }
    },
    [node.id, setVideoExpanded],
  );

  // Keyboard while expanded: Space toggles, Esc closes. Captured on window and
  // stopped so the global map (WS6) and the Stage's Esc handler never see them.
  useEffect(() => {
    if (!open) return;
    const swallow = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    const isSpace = (e: KeyboardEvent) => e.key === ' ' || e.code === 'Space';
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Escape') {
        swallow(e);
        close();
      } else if (isSpace(e)) {
        swallow(e);
        controlsRef.current?.toggle();
      }
    };
    // Buttons activate on Space *keyup*; swallow that too so a focused close
    // button does not also fire.
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isTypingTarget(e.target) && (isSpace(e) || e.key === 'Escape')) swallow(e);
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [open, close]);

  const note =
    source.kind === 'none' ? 'placeholder' : source.kind === 'r2' ? 'not yet available' : null;

  const expanded = (
    <AnimatePresence initial={false}>
      {open ? (
        <ExpandedPlayer
          key="expanded"
          node={node}
          source={source}
          poster={poster}
          sector={sector}
          trackId={trackId}
          layoutId={layoutId}
          reduced={reduced}
          autoplay={autoplay}
          controlsRef={controlsRef}
          onClose={close}
        />
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        ref={inlineRef}
        type="button"
        className={cn('video-inline', className)}
        layoutId={layoutId}
        transition={LAYOUT_TRANSITION}
        onClick={openPlayer}
        aria-label={`${label} — ${node.title}`}
        aria-expanded={open}
        data-sector={sector}
        data-kind={source.kind}
      >
        <motion.span
          className="video-poster-box"
          layoutId={layoutId ? `${layoutId}-media` : undefined}
          transition={LAYOUT_TRANSITION}
        >
          <img className="video-poster" src={poster} alt="" />
        </motion.span>
        <span className="video-play">
          <Icon name="play" size={22} />
        </span>
        <span className="video-meta">
          <span className="sc-label">{label}</span>
          {note ? <span className="video-note">{note}</span> : null}
        </span>
      </motion.button>

      {host ? createPortal(expanded, host) : expanded}
    </>
  );
}

/* ── expanded frame ──────────────────────────────────── */

interface ExpandedPlayerProps {
  node: Node;
  source: VideoSource;
  poster: string;
  sector?: string;
  trackId: string;
  layoutId?: string;
  reduced: boolean;
  autoplay: boolean;
  controlsRef: RefObject<PlayerControls | null>;
  onClose: () => void;
}

function ExpandedPlayer({
  node,
  source,
  poster,
  sector,
  trackId,
  layoutId,
  reduced,
  autoplay,
  controlsRef,
  onClose,
}: ExpandedPlayerProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const playable = source.kind === 'stream' || source.kind === 'url';
  // The real player mounts only once the frame has grown into place: an
  // <iframe>/<video> being transform-scaled for 320ms looks worse than the poster.
  const [ready, setReady] = useState(reduced || !layoutId);
  const [status, setStatus] = useState<string | null>(playable ? 'Preparing…' : null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    frameRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (ready) return;
    const t = window.setTimeout(() => setReady(true), READY_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  const events = useVideoEvents(trackId, source.kind);

  const title =
    source.kind === 'none'
      ? 'Video placeholder — no source yet'
      : source.kind === 'r2'
        ? 'Not yet available'
        : null;

  return (
    <motion.div
      ref={frameRef}
      className={cn('video-expanded', playing && 'is-playing')}
      layoutId={layoutId}
      transition={{ layout: LAYOUT_TRANSITION, opacity: { duration: 0.2, ease: EASE } }}
      initial={reduced ? false : { opacity: 0.6 }}
      animate={{ opacity: 1 }}
      exit={reduced ? undefined : { opacity: 0 }}
      onLayoutAnimationComplete={() => setReady(true)}
      role="dialog"
      aria-modal="true"
      aria-label={`${node.title} video`}
      tabIndex={-1}
      data-sector={sector}
      data-kind={source.kind}
      data-ready={ready ? 'true' : undefined}
    >
      <motion.div
        className="video-media-box"
        layoutId={layoutId ? `${layoutId}-media` : undefined}
        transition={LAYOUT_TRANSITION}
      >
        <img className="video-expanded-poster" src={poster} alt="" />

        {ready && source.kind === 'stream' ? (
          <StreamPlayer
            uid={source.uid}
            autoplay={autoplay}
            events={events}
            controlsRef={controlsRef}
            onStatus={setStatus}
            onPlaying={setPlaying}
          />
        ) : null}
        {ready && source.kind === 'url' ? (
          <NativePlayer
            url={source.url}
            mime={source.mime}
            poster={poster}
            autoplay={autoplay}
            events={events}
            controlsRef={controlsRef}
            onStatus={setStatus}
            onPlaying={setPlaying}
          />
        ) : null}

        {title ? (
          <div className="video-expanded-body">
            <div className="sc-label">{node.title}</div>
            <p className="video-expanded-note">{title}</p>
          </div>
        ) : null}
      </motion.div>

      <div className="video-chrome">
        <div className="video-chrome-top">
          <span className="sc-label video-chrome-title">{node.title}</span>
          <button type="button" className="video-close" onClick={onClose} aria-label="Close video">
            <Icon name="close" size={18} />
          </button>
        </div>
        {status ? (
          <div className="video-status" role="status">
            {status}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

/* ── tracking ────────────────────────────────────────── */

interface VideoEvents {
  play(pct: number): void;
  pause(pct: number, ended: boolean): void;
  time(pct: number): void;
  ended(): void;
}

function useVideoEvents(nodeId: string, source: VideoKind): VideoEvents {
  const fired = useRef(new Set<number>());
  const completed = useRef(false);

  useEffect(() => {
    fired.current.clear();
    completed.current = false;
  }, [nodeId, source]);

  return useMemo<VideoEvents>(() => {
    const base = { nodeId, source };
    return {
      play: (pct) => track('video_play', { ...base, pct }),
      pause: (pct, ended) => {
        if (!ended && pct < 100) track('video_pause', { ...base, pct });
      },
      time: (pct) => {
        for (const m of crossedMilestones(pct, fired.current)) {
          track('video_progress', { ...base, pct: m });
        }
      },
      ended: () => {
        if (completed.current) return;
        completed.current = true;
        track('video_complete', { ...base, pct: 100 });
      },
    };
  }, [nodeId, source]);
}

/* ── Cloudflare Stream ───────────────────────────────── */

interface PlayerCommonProps {
  autoplay: boolean;
  events: VideoEvents;
  controlsRef: RefObject<PlayerControls | null>;
  onStatus: (s: string | null) => void;
  onPlaying: (playing: boolean) => void;
}

interface StreamPlayerProps extends PlayerCommonProps {
  uid: string;
}

function StreamPlayer({ uid, autoplay, events, controlsRef, onStatus, onPlaying }: StreamPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playback, setPlayback] = useState<StreamPlayback | null>(null);

  useEffect(() => {
    let alive = true;
    onStatus('Preparing…');
    resolveStreamPlayback(uid).then((p) => {
      if (!alive) return;
      setPlayback(p);
      onStatus(
        p.signed
          ? null
          : p.reason === 'unconfigured'
            ? 'Signing unavailable — Stream is not configured; playing unsigned'
            : 'Signing unavailable — playing unsigned',
      );
    });
    return () => {
      alive = false;
    };
  }, [uid, onStatus]);

  const src = useMemo(
    () => (playback ? streamEmbedUrl(playback.src, { autoplay, preload: 'auto' }) : null),
    [playback, autoplay],
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !src) return;
    let alive = true;
    let player: StreamPlayerApi | null = null;
    let playing = false;
    const pct = () => (player ? progressPct(player.currentTime, player.duration) : 0);

    const onPlay = () => {
      playing = true;
      onPlaying(true);
      events.play(pct());
    };
    const onPause = () => {
      playing = false;
      onPlaying(false);
      events.pause(pct(), player?.ended ?? false);
    };
    const onTime = () => events.time(pct());
    const onEnded = () => {
      playing = false;
      onPlaying(false);
      events.ended();
    };

    loadStreamSdk()
      .then((Stream) => {
        if (!alive) return;
        player = Stream(iframe);
        player.addEventListener('play', onPlay);
        player.addEventListener('pause', onPause);
        player.addEventListener('timeupdate', onTime);
        player.addEventListener('ended', onEnded);
        controlsRef.current = {
          toggle: () => {
            if (!player) return;
            if (player.paused) void player.play();
            else player.pause();
          },
        };
        if (autoplay) void player.play();
      })
      .catch(() => {
        if (alive) onStatus('Stream SDK unavailable — playback is not tracked');
      });

    return () => {
      alive = false;
      if (player) {
        if (playing) events.pause(pct(), false);
        player.removeEventListener('play', onPlay);
        player.removeEventListener('pause', onPause);
        player.removeEventListener('timeupdate', onTime);
        player.removeEventListener('ended', onEnded);
      }
      controlsRef.current = null;
      onPlaying(false);
    };
  }, [src, autoplay, events, controlsRef, onStatus, onPlaying]);

  if (!src) return null;

  return (
    <iframe
      ref={iframeRef}
      className="video-media video-media--stream"
      src={src}
      title="Video"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}

/* ── native <video> ──────────────────────────────────── */

interface NativePlayerProps extends PlayerCommonProps {
  url: string;
  mime: string;
  poster: string;
}

function NativePlayer({
  url,
  mime,
  poster,
  autoplay,
  events,
  controlsRef,
  onStatus,
  onPlaying,
}: NativePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    onStatus(null);
    const pct = () => progressPct(el.currentTime, el.duration);
    controlsRef.current = {
      toggle: () => {
        if (el.paused) void el.play().catch(() => undefined);
        else el.pause();
      },
    };
    return () => {
      if (!el.paused && !el.ended) events.pause(pct(), false);
      controlsRef.current = null;
      onPlaying(false);
    };
  }, [url, events, controlsRef, onStatus, onPlaying]);

  const pct = (el: HTMLVideoElement) => progressPct(el.currentTime, el.duration);

  return (
    <video
      ref={videoRef}
      className="video-media video-media--native"
      controls
      playsInline
      autoPlay={autoplay}
      poster={poster}
      onPlay={(e) => {
        onPlaying(true);
        events.play(pct(e.currentTarget));
      }}
      onPause={(e) => {
        onPlaying(false);
        events.pause(pct(e.currentTarget), e.currentTarget.ended);
      }}
      onTimeUpdate={(e) => events.time(pct(e.currentTarget))}
      onEnded={() => {
        onPlaying(false);
        events.ended();
      }}
      onError={() => onStatus('This video could not be played')}
    >
      <source src={url} type={mime || undefined} />
    </video>
  );
}
