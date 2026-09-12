import { Link } from 'react-router';
import type { Layer } from '../data/types';
import { Icon } from '../components/Icon';
import { track } from '../lib/track';
import { EmphasisControl } from './EmphasisControl';
import './stage.css';

export interface StageHeaderProps {
  layer: Layer;
  prev?: Layer;
}

/** Up arrow to the layer above, the layer title, and the emphasis control. */
export function StageHeader({ layer, prev }: StageHeaderProps) {
  return (
    <header className="stage-header">
      <div className="stage-header-arrow">
        {prev ? (
          <Link
            className="layer-arrow"
            to={prev.path}
            onClick={() => track('layer_view', { layerId: prev.id, via: 'arrow' })}
          >
            <Icon name="arrow-up" size={16} />
            <span>Explore {prev.title}</span>
          </Link>
        ) : null}
      </div>

      <div className="stage-header-main">
        <h1 className="stage-title">{layer.title}</h1>
        {layer.hasEmphasis ? <EmphasisControl /> : null}
      </div>
    </header>
  );
}
