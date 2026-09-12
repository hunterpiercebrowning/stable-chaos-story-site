import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useEffect } from 'react';
import { setContextGetter } from '../lib/track';
import { useUi } from '../store/ui';
import { useKeyboard } from '../store/keyboard';
import { LeftNav } from './LeftNav';
import { MobileBlocker } from './MobileBlocker';
import { RightTray } from './RightTray';
import { SearchOverlay } from './SearchOverlay';
import { Stage } from './Stage';
import { TopBar } from './TopBar';
import { useRoute } from './useRoute';
import './shell.css';

// three.js is the one heavy dependency; it arrives in its own chunk after the shell has painted.
const Attractor = lazy(() => import('./Attractor').then((m) => ({ default: m.Attractor })));

/** Three-column shell: nav | stage | supporting context, over the attractor. */
export function AppShell() {
  const { layerId, nodeId } = useRoute();
  const leftOpen = useUi((s) => s.leftOpen);
  const rightOpen = useUi((s) => s.rightOpen);
  const presentation = useUi((s) => s.presentation);
  const reduced = useReducedMotion();

  // The global keyboard map (↑↓ ←→ Enter Esc / [ ] 1–4 P) lives in one place.
  useKeyboard();

  // Heartbeats carry the current layer/node.
  useEffect(() => {
    setContextGetter(() => ({ layerId, nodeId }));
  }, [layerId, nodeId]);

  // Presentation mode hides both panels outright; otherwise the closed nav is an icon rail.
  const leftWidth = presentation ? 0 : leftOpen ? 'var(--nav-w)' : 'var(--nav-w-collapsed)';
  const rightWidth = presentation || !rightOpen ? 0 : 'var(--tray-w)';

  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] as const };

  return (
    <div className="app-shell" data-presentation={presentation ? 'true' : undefined}>
      <Suspense fallback={null}>
        <Attractor intensity={layerId === 'welcome' ? 1 : 0.35} />
      </Suspense>

      <div className="app-frame">
        <TopBar />

        <div className="app-body">
          <motion.aside
            className="app-panel app-panel--left"
            animate={{ width: leftWidth, opacity: presentation ? 0 : 1 }}
            transition={transition}
            aria-hidden={presentation}
            aria-expanded={leftOpen}
          >
            <LeftNav />
          </motion.aside>

          <main className="app-stage">
            <Stage />
          </main>

          <motion.aside
            className="app-panel app-panel--right"
            animate={{ width: rightWidth, opacity: rightWidth === 0 ? 0 : 1 }}
            transition={transition}
            aria-hidden={rightWidth === 0}
            aria-expanded={rightOpen && !presentation}
          >
            <RightTray />
          </motion.aside>
        </div>
      </div>

      <SearchOverlay />
      <MobileBlocker />
    </div>
  );
}
