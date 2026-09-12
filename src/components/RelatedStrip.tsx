import { useNavigate } from 'react-router';
import { getLayer, getNode, getPrimarySector, getRelated, groupByLayer } from '../data';
import type { Node } from '../data/types';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import './related-strip.css';

export interface RelatedStripProps {
  node: Node;
  /** Max chips per layer group. */
  limit?: number;
}

/**
 * Cross-layer "Related" chips under the focus content, grouped by layer and
 * labelled with the layer's short title. A chip carries a sector-colored dot
 * when its target belongs to a sector. Click navigates and tracks `related_click`.
 */
export function RelatedStrip({ node, limit = 6 }: RelatedStripProps) {
  const navigate = useNavigate();
  const groups = groupByLayer(getRelated(node.id));
  if (groups.length === 0) return null;

  return (
    <nav className="related-strip" aria-label="Related">
      <div className="related-strip-head">
        <span className="sc-label">Related</span>
        <span className="related-strip-rule" aria-hidden="true" />
      </div>

      <div className="related-strip-groups">
        {groups.map((group) => {
          const layer = getLayer(group.layerId);
          const hidden = Math.max(0, group.refs.length - limit);
          return (
            <div className="related-group" key={group.layerId} data-layer={group.layerId}>
              <span className="related-group-label">{layer?.shortTitle ?? group.layerId}</span>
              <ul className="related-group-chips">
                {group.refs.slice(0, limit).map((ref) => {
                  const sector = getPrimarySector(getNode(ref.id) ?? node) ?? null;
                  return (
                    <li key={ref.id}>
                      <button
                        type="button"
                        className="related-chip"
                        data-sector={sector ?? undefined}
                        data-tier={ref.tier}
                        title={`${layer?.title ?? group.layerId} · ${ref.title}`}
                        onClick={() => {
                          track('related_click', { fromNodeId: node.id, toNodeId: ref.id });
                          const path = `/${ref.layerId}/${ref.id}`;
                          useUi.getState().setNavIntent('related', path);
                          navigate(path);
                        }}
                      >
                        {sector ? <span className="related-chip-dot" aria-hidden="true" /> : null}
                        <span className="related-chip-title">{ref.title}</span>
                      </button>
                    </li>
                  );
                })}
                {hidden > 0 ? (
                  <li className="related-more" aria-label={`${hidden} more in ${layer?.title}`}>
                    +{hidden}
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
