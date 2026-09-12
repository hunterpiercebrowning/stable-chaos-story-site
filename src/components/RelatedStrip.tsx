import { useNavigate } from 'react-router';
import { getLayer, getRelated, groupByLayer } from '../data';
import type { Node } from '../data/types';
import { track } from '../lib/track';
import './related-strip.css';

export interface RelatedStripProps {
  node: Node;
  /** Max chips per layer group. */
  limit?: number;
}

/**
 * Cross-layer "Related" chips under the focus content, grouped by layer.
 * WS7 restyles this; the data shape and tracking call stay.
 */
export function RelatedStrip({ node, limit = 6 }: RelatedStripProps) {
  const navigate = useNavigate();
  const groups = groupByLayer(getRelated(node.id));
  if (groups.length === 0) return null;

  return (
    <div className="related-strip">
      <div className="sc-label related-strip-label">Related</div>
      <div className="related-strip-groups">
        {groups.map((group) => {
          const layer = getLayer(group.layerId);
          return (
            <div className="related-group" key={group.layerId}>
              <span className="related-group-label">{layer?.shortTitle ?? group.layerId}</span>
              <ul className="related-group-chips">
                {group.refs.slice(0, limit).map((ref) => (
                  <li key={ref.id}>
                    <button
                      type="button"
                      className="related-chip"
                      onClick={() => {
                        track('related_click', { fromNodeId: node.id, toNodeId: ref.id });
                        navigate(`/${ref.layerId}/${ref.id}`);
                      }}
                    >
                      {ref.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
