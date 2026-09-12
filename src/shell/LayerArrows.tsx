import { Link } from 'react-router';
import type { Layer } from '../data/types';
import { Icon } from '../components/Icon';
import { useUi } from '../store/ui';
import './stage.css';

export interface LayerArrowProps {
  layer?: Layer;
  direction: 'up' | 'down';
}

/** "Explore <layer title>" affordance at the top / bottom of the stage. */
export function LayerArrow({ layer, direction }: LayerArrowProps) {
  const setNavIntent = useUi((s) => s.setNavIntent);
  if (!layer) return <div className="layer-arrow-spacer" />;
  return (
    <Link
      className="layer-arrow"
      to={layer.path}
      // Stage emits `layer_view` with this intent.
      onClick={() => setNavIntent('arrow', layer.path)}
    >
      {direction === 'up' ? <Icon name="arrow-up" size={16} /> : null}
      <span>Explore {layer.title}</span>
      {direction === 'down' ? <Icon name="arrow-down" size={16} /> : null}
    </Link>
  );
}
