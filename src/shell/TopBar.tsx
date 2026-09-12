import { Link } from 'react-router';
import { Icon } from '../components/Icon';
import { useUi } from '../store/ui';
import { track } from '../lib/track';
import { DensityToggle } from './DensityToggle';
import { useRoute } from './useRoute';
import './topbar.css';

/** Persistent chrome: wordmark → welcome, breadcrumb, density, panels, presentation. */
export function TopBar() {
  const { layer, node } = useRoute();
  const leftOpen = useUi((s) => s.leftOpen);
  const rightOpen = useUi((s) => s.rightOpen);
  const toggleLeft = useUi((s) => s.toggleLeft);
  const toggleRight = useUi((s) => s.toggleRight);
  const presentation = useUi((s) => s.presentation);
  const setPresentation = useUi((s) => s.setPresentation);
  const setNavIntent = useUi((s) => s.setNavIntent);

  const setMode = (on: boolean) => {
    setPresentation(on);
    track('presentation_toggle', { on });
  };

  // Presentation mode: chrome reduced to a tiny wordmark and the exit chip.
  if (presentation) {
    return (
      <header className="topbar topbar--presentation">
        <Link to="/" className="topbar-logo" aria-label="Stable Chaos — welcome" onClick={() => setNavIntent('nav', '/')}>
          <img
            className="topbar-logo-img topbar-logo-img--mini"
            src="/assets/logos/SC--Logo--White--Horizontal.svg"
            alt="Stable Chaos"
          />
        </Link>
        <button
          type="button"
          className="topbar-exit"
          onClick={() => setMode(false)}
          aria-label="Exit presentation mode"
          title="Exit presentation ( P or Esc )"
        >
          <kbd className="topbar-exit-key">P</kbd>
          <span>Exit</span>
        </button>
      </header>
    );
  }

  return (
    <header className="topbar">
      <Link to="/" className="topbar-logo" aria-label="Stable Chaos — welcome">
        <img
          className="topbar-logo-img sc-logo-glow"
          src="/assets/logos/SC--Logo--White--Horizontal.svg"
          alt="Stable Chaos"
        />
      </Link>

      <nav className="topbar-crumbs" aria-label="Breadcrumb">
        {layer && layer.id !== 'welcome' ? (
          <>
            <Link className="topbar-crumb" to={layer.path} onClick={() => setNavIntent('nav', layer.path)}>
              {layer.title}
            </Link>
            {node ? (
              <>
                <Icon name="chevron-right" size={13} className="topbar-crumb-sep" />
                <span className="topbar-crumb is-current">{node.title}</span>
              </>
            ) : null}
          </>
        ) : (
          <span className="topbar-crumb is-current">Welcome</span>
        )}
      </nav>

      <div className="topbar-actions">
        <DensityToggle />
        <button
          type="button"
          className="icon-button"
          aria-pressed={leftOpen}
          aria-label="Toggle navigation panel"
          title="Toggle navigation ( [ )"
          onClick={toggleLeft}
        >
          <Icon name="panel-left" size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-pressed={rightOpen}
          aria-label="Toggle supporting context panel"
          title="Toggle supporting context ( ] )"
          onClick={toggleRight}
        >
          <Icon name="panel-right" size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-pressed={false}
          aria-label="Enter presentation mode"
          title="Presentation mode ( P )"
          onClick={() => setMode(true)}
        >
          <Icon name="presentation" size={17} />
        </button>
      </div>
    </header>
  );
}
