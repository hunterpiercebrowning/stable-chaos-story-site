import { VideoPlayer } from '../../components/VideoPlayer';
import type { BackgroundNode } from '../../data/types';
import type { LayerViewProps } from '../types';
import './welcome.css';

/**
 * Layer 0. First pass: logo mark, name, tagline and the intro-video slot.
 * WS7 polishes it (hero glow, "Prepared for {label}", pulsing ring).
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
  return (
    <div className="welcome">
      <img className="welcome-mark sc-logo-glow" src="/assets/logos/logo-white.svg" alt="" />
      <h1 className="welcome-title">Stable Chaos</h1>
      <p className="welcome-tagline">Advancing Critical Sectors &amp; Missions</p>
      <div className="welcome-intro">
        <VideoPlayer node={INTRO_NODE} label="Watch the introduction" />
      </div>
    </div>
  );
}
