import { useCallback, useEffect, useState } from 'react';
import { VideoHost } from '../../components/ContextCardVideoHost';
import { Icon } from '../../components/Icon';
import type { BackgroundNode } from '../../data/types';
import { getSession } from '../../lib/session';
import type { LayerViewProps } from '../types';
import './welcome.css';

/**
 * Layer 0 — the marketing hero, carried over: glowing logo mark, gradient
 * wordmark, tagline, "Prepared for {label}" from the session, and a pulsing
 * ring that opens the shared VideoPlayer expanded with the intro placeholder.
 * The up/down layer arrows and the attractor intensity belong to the shell.
 */

/** Synthetic node so the shared VideoPlayer can carry the intro placeholder. */
const INTRO_NODE: BackgroundNode = {
  id: 'welcome-intro',
  layerId: 'background',
  tier: 'primary',
  order: 0,
  title: 'Introduction',
  tagline: '',
  blurb: '',
  bulletPoints: [],
  videoLink: '',
  contextItems: [],
};

export function WelcomeLayer(_props: LayerViewProps) {
  const [label, setLabel] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopPlaying = useCallback(() => setPlaying(false), []);

  useEffect(() => {
    let live = true;
    getSession().then((session) => {
      if (live && session?.label) setLabel(session.label);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <div className="welcome-mark-wrap">
          <img className="welcome-mark sc-logo-glow" src="/assets/logos/logo-white.svg" alt="" />
        </div>

        <h1 className="welcome-title">Stable Chaos</h1>
        <p className="welcome-tagline">Advancing Critical Sectors &amp; Missions</p>

        {label ? (
          <p className="welcome-prepared">
            <span className="welcome-prepared-label">Prepared for</span>
            <span className="welcome-prepared-name">{label}</span>
          </p>
        ) : null}

        <button
          type="button"
          className="welcome-intro"
          onClick={() => setPlaying(true)}
          aria-haspopup="dialog"
          aria-label="Watch the introduction"
        >
          <span className="welcome-ring" aria-hidden="true">
            <span className="welcome-ring-pulse" />
            <span className="welcome-ring-pulse welcome-ring-pulse--late" />
            <span className="welcome-ring-core">
              <Icon name="play" size={22} />
            </span>
          </span>
          <span className="welcome-intro-label">Watch the introduction</span>
          <span className="welcome-intro-note">placeholder</span>
        </button>
      </div>

      {playing ? <VideoHost node={INTRO_NODE} label="Introduction" onClose={stopPlaying} /> : null}
    </div>
  );
}
