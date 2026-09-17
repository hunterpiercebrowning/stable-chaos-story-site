import { useEffect, useState } from 'react';
import './mobile-blocker.css';

const MIN_WIDTH = 1024;

/** Desktop-only experience. The open is still tracked upstream by WS8. */
export function MobileBlocker() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MIN_WIDTH,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MIN_WIDTH - 1}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!narrow) return null;

  return (
    <div className="mobile-blocker" role="alertdialog" aria-label="Desktop required">
      <img className="mobile-blocker-logo sc-logo-glow" src="/assets/logos/logo-white.svg" alt="" />
      <h1 className="mobile-blocker-title">Stable Chaos</h1>
      <p className="mobile-blocker-body">Please view on a laptop or desktop.</p>
    </div>
  );
}
