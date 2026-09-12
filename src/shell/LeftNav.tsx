import { NavLink, useNavigate } from 'react-router';
import { getLayers, getNodes } from '../data';
import type { Node } from '../data/types';
import { Icon } from '../components/Icon';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import { useRoute } from './useRoute';
import './leftnav.css';

/**
 * Site index: a search entry point plus every layer with its primary and
 * secondary tiers. WS6 owns the richer behaviour (collapsible groups, icon
 * rail, auto-scroll, "+N more").
 */
export function LeftNav() {
  const layers = getLayers();
  const navigate = useNavigate();
  const { layerId, nodeId } = useRoute();
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const density = useUi((s) => s.density);

  const go = (node: Node) => {
    navigate(`/${node.layerId}/${node.id}`);
    track('node_focus', { layerId: node.layerId, nodeId: node.id, via: 'nav' });
  };

  return (
    <div className="leftnav">
      <button type="button" className="leftnav-search" onClick={() => setSearchOpen(true)}>
        <Icon name="search" size={15} />
        <span>Search</span>
        <kbd className="leftnav-kbd">/</kbd>
      </button>

      <nav className="leftnav-groups sc-scroll" aria-label="Site index">
        {layers.map((layer) => {
          const nodes = getNodes(layer.id);
          const primary = nodes.filter((n) => n.tier === 'primary');
          const secondary = nodes.filter((n) => n.tier === 'secondary');
          const hideSecondary = layer.hasDensity && density === 'compressed';
          return (
            <section className="leftnav-group" key={layer.id} data-active={layer.id === layerId}>
              <NavLink
                to={layer.path}
                className="leftnav-layer"
                onClick={() => track('layer_view', { layerId: layer.id, via: 'nav' })}
              >
                <span className="leftnav-layer-title">
                  {layer.nodesFile ? layer.title : layer.shortTitle}
                </span>
                {layer.nodesFile ? <span className="leftnav-count">{nodes.length}</span> : null}
              </NavLink>

              {primary.length > 0 ? (
                <ul className="leftnav-list">
                  {primary.map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        className="leftnav-node"
                        data-tier="primary"
                        aria-current={node.id === nodeId ? 'page' : undefined}
                        onClick={() => go(node)}
                      >
                        {node.title}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {secondary.length > 0 ? (
                <ul className="leftnav-list" data-hidden={hideSecondary ? 'true' : undefined}>
                  {secondary.map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        className="leftnav-node"
                        data-tier="secondary"
                        aria-current={node.id === nodeId ? 'page' : undefined}
                        onClick={() => go(node)}
                      >
                        {node.title}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {secondary.length > 0 && hideSecondary ? (
                <button
                  type="button"
                  className="leftnav-more"
                  onClick={() => useUi.getState().setDensity('expanded')}
                >
                  +{secondary.length} more
                </button>
              ) : null}

              {layer.nodesFile && nodes.length === 0 ? (
                <p className="leftnav-empty">Coming soon</p>
              ) : null}
            </section>
          );
        })}
      </nav>
    </div>
  );
}
