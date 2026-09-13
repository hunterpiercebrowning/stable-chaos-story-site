import { Link } from 'react-router';
import type { Layer } from '../data/types';
import { Icon } from '../components/Icon';
import { useUi } from '../store/ui';
import './stage.css';

export interface LayerArrowProps {
  layer?: Layer;
  direction: 'up' | 'down';
}

/**
 * Layer paging that floats over the stage's scroll region: a quiet "Back" pill
 * in the top-left corner for the layer above, and a "Next · <title>" pill
 * centred along the bottom edge for the layer below. Content scrolls under both.
 */
export function LayerArrow({ layer, direction }: LayerArrowProps) {
  const setNavIntent = useUi((s) => s.setNavIntent);
  if (!layer) return null;
  const up = direction === 'up';
  return (
    <Link
      className={up ? 'stage-back' : 'stage-next'}
      to={layer.path}
      aria-label={`${up ? 'Back to' : 'Next:'} ${layer.title}`}
      title={up ? `Back to ${layer.title}` : undefined}
      // Stage emits `layer_view` with this intent.
      onClick={() => setNavIntent('arrow', layer.path)}
    >
      {up ? (
        <>
          <Icon name="arrow-up" size={13} />
          <span>Back</span>
        </>
      ) : (
        <>
          <span className="stage-next-kicker">Next</span>
          <span className="stage-next-title">{layer.title}</span>
        </>
      )}
    </Link>
  );
}
