import { motion, useReducedMotion } from 'motion/react';
import { useCallback } from 'react';
import { useUi } from '../store/ui';
import { useKeyboard } from '../store/keyboard';
import { Attractor } from './Attractor';
import { LeftNav } from './LeftNav';
import { MobileBlocker } from './MobileBlocker';
import { RightTray } from './RightTray';
import { SearchOverlay } from './SearchOverlay';
import { Stage } from './Stage';
import { TopBar } from './TopBar';
import { useRoute } from './useRoute';
import './shell.css';

/** Three-column shell: nav | stage | supporting context, over the attractor. */
export function AppShell() {
  const { layerId } = useRoute();
  const leftOpen = useUi((s) => s.leftOpen);
  const rightOpen = useUi((s) => s.rightOpen);
  const presentation = useUi((s) => s.presentation);
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const setPresentation = useUi((s) => s.setPresentation);
  const reduced = useReducedMotion();

  const onSearch = useCallback(() => setSearchOpen(true), [setSearchOpen]);
  const onEscape = useCallback(() => {
    const { searchOpen, presentation: on } = useUi.getState();
    if (searchOpen) setSearchOpen(false);
    else if (on) setPresentation(false);
  }, [setSearchOpen, setPresentation]);
  useKeyboard({ onSearch, onEscape });

  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] as const };

  return (
    <div className="app-shell" data-presentation={presentation ? 'true' : undefined}>
      <Attractor intensity={layerId === 'welcome' ? 1 : 0.35} />

      <div className="app-frame">
        <TopBar />

        <div className="app-body">
          <motion.aside
            className="app-panel app-panel--left"
            animate={{ width: leftOpen ? 'var(--nav-w)' : 0, opacity: leftOpen ? 1 : 0 }}
            transition={transition}
            aria-hidden={!leftOpen}
            aria-expanded={leftOpen}
          >
            <LeftNav />
          </motion.aside>

          <main className="app-stage">
            <Stage />
          </main>

          <motion.aside
            className="app-panel app-panel--right"
            animate={{ width: rightOpen ? 'var(--tray-w)' : 0, opacity: rightOpen ? 1 : 0 }}
            transition={transition}
            aria-hidden={!rightOpen}
            aria-expanded={rightOpen}
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
