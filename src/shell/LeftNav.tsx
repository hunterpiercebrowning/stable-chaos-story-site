import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router';
import { getLayers, getNavTree, getNodes } from '../data';
import type { Layer, LayerId, Node } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import { useRoute } from './useRoute';
import './leftnav.css';

/** One line icon per layer, used by the collapsed rail and the group headers. */
const LAYER_ICON: Record<LayerId, IconName> = {
  welcome: 'home',
  who: 'people',
  beliefs: 'lightbulb',
  sectors: 'grid',
  services: 'briefcase',
  products: 'box',
  background: 'book',
};

/**
 * Site index. Open: a search entry plus a collapsible group per layer with the
 * primary tier bold and each primary's secondaries nested under it (hidden under
 * Compressed density with a "+N more" affordance). Only the current layer's group
 * is open; the rest collapse when the layer changes. Closed: an icon rail, one
 * icon per layer, with tooltips.
 */
export function LeftNav() {
  const leftOpen = useUi((s) => s.leftOpen);
  return leftOpen ? <NavFull /> : <NavRail />;
}

/* ── full nav ─────────────────────────────────────────── */

function NavFull() {
  const layers = getLayers();
  const { layerId, nodeId } = useRoute();
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const density = useUi((s) => s.density);
  const navGroups = useUi((s) => s.navGroups);
  const resetNavGroups = useUi((s) => s.resetNavGroups);
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLElement>(null);

  // A new layer opens its own group and collapses the rest, dropping any hand
  // toggles; within a layer, opening or closing a group by hand sticks.
  const prevLayerId = useRef(layerId);
  const layerChanged = prevLayerId.current !== layerId;
  useEffect(() => {
    prevLayerId.current = layerId;
    resetNavGroups();
  }, [layerId, resetNavGroups]);

  // Keep the active node (or layer) in view.
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const selector = nodeId ? `[data-node-id="${nodeId}"]` : `[data-layer-id="${layerId}"]`;
    // Wait for the groups to finish opening and collapsing before measuring.
    const delay = layerChanged ? 360 : 30;
    const id = window.setTimeout(() => {
      root
        .querySelector<HTMLElement>(selector)
        ?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, layerId, density]);

  return (
    <div className="leftnav">
      <div className="leftnav-top">
        <button
          type="button"
          className="leftnav-search"
          onClick={() => setSearchOpen(true)}
          aria-label="Search (press /)"
        >
          <Icon name="search" size={15} />
          <span>Search</span>
          <kbd className="leftnav-kbd">/</kbd>
        </button>
      </div>

      <nav className="leftnav-groups sc-scroll" aria-label="Site index" ref={listRef}>
        {layers.map((layer) => (
          <NavGroup
            key={layer.id}
            layer={layer}
            active={layer.id === layerId}
            open={navGroups[layer.id] ?? layer.id === layerId}
            nodeId={nodeId}
            compressed={layer.hasDensity && density === 'compressed'}
          />
        ))}
      </nav>
    </div>
  );
}

interface NavGroupProps {
  layer: Layer;
  active: boolean;
  open: boolean;
  nodeId: string | undefined;
  compressed: boolean;
}

function NavGroup({ layer, active, open, nodeId, compressed }: NavGroupProps) {
  const navigate = useNavigate();
  const setNavGroup = useUi((s) => s.setNavGroup);
  const setDensity = useUi((s) => s.setDensity);
  const nodes = getNodes(layer.id);
  const { branches, orphans } = getNavTree(layer.id);
  const secondaryCount = nodes.filter((n) => n.tier === 'secondary').length;
  const hasBody = nodes.length > 0 || layer.nodesFile !== null;
  const bodyId = `leftnav-body-${layer.id}`;

  const setNavIntent = useUi((s) => s.setNavIntent);

  const go = (node: Node) => {
    const path = `/${node.layerId}/${node.id}`;
    setNavIntent('nav', path);
    navigate(path);
  };

  const renderButton = (node: Node) => (
    <button
      type="button"
      className="leftnav-node"
      data-tier={node.tier}
      data-node-id={node.id}
      aria-current={node.id === nodeId ? 'page' : undefined}
      onClick={() => go(node)}
    >
      {node.title}
    </button>
  );

  // Secondaries nest under their primary; Compressed density folds them away.
  const renderChildren = (children: Node[]) =>
    children.length > 0 ? (
      <ul
        className="leftnav-list leftnav-list--secondary"
        data-hidden={compressed ? 'true' : undefined}
        aria-hidden={compressed}
      >
        {children.map((child) => (
          <li key={child.id}>{renderButton(child)}</li>
        ))}
      </ul>
    ) : null;

  return (
    <section
      className="leftnav-group"
      data-active={active ? 'true' : undefined}
      data-open={hasBody && open ? 'true' : 'false'}
      data-layer-id={layer.id}
    >
      <div className="leftnav-layer">
        <NavLink
          to={layer.path}
          end
          className="leftnav-layer-link"
          onClick={() => setNavIntent('nav', layer.path)}
        >
          <Icon name={LAYER_ICON[layer.id]} size={14} className="leftnav-layer-icon" />
          <span className="leftnav-layer-title">
            {layer.nodesFile ? layer.title : layer.shortTitle}
          </span>
        </NavLink>
        {hasBody ? (
          <button
            type="button"
            className="leftnav-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${layer.title}`}
            onClick={() => setNavGroup(layer.id, !open)}
          >
            {nodes.length > 0 ? <span className="leftnav-count">{nodes.length}</span> : null}
            <Icon name="chevron-down" size={13} className="leftnav-chevron" />
          </button>
        ) : null}
      </div>

      {hasBody ? (
        <div className="leftnav-body" id={bodyId} aria-hidden={!open}>
          <div className="leftnav-body-inner">
            {branches.length > 0 ? (
              <ul className="leftnav-list">
                {branches.map(({ primary, children }) => (
                  <li key={primary.id}>
                    {renderButton(primary)}
                    {renderChildren(children)}
                  </li>
                ))}
              </ul>
            ) : null}

            {renderChildren(orphans)}

            {secondaryCount > 0 && compressed ? (
              <button
                type="button"
                className="leftnav-more"
                title="Switch to Expanded density"
                onClick={() => {
                  setDensity('expanded');
                  track('density_change', { value: 'expanded' });
                }}
              >
                +{secondaryCount} more
              </button>
            ) : null}

            {nodes.length === 0 ? <p className="leftnav-empty">Coming soon</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ── icon rail ────────────────────────────────────────── */

interface Tip {
  label: string;
  top: number;
}

function NavRail() {
  const layers = getLayers();
  const { layerId } = useRoute();
  const setSearchOpen = useUi((s) => s.setSearchOpen);
  const setLeftOpen = useUi((s) => s.setLeftOpen);
  const setNavIntent = useUi((s) => s.setNavIntent);
  const [tip, setTip] = useState<Tip | null>(null);

  const show = (label: string) => (e: SyntheticEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2 });
  };
  const hide = () => setTip(null);

  return (
    <div className="leftnav-rail" onMouseLeave={hide}>
      <button
        type="button"
        className="leftnav-rail-btn"
        onClick={() => setSearchOpen(true)}
        onMouseEnter={show('Search  /')}
        onFocus={show('Search  /')}
        onBlur={hide}
        aria-label="Search"
      >
        <Icon name="search" size={17} />
      </button>

      <div className="leftnav-rail-sep" />

      <nav className="leftnav-rail-layers" aria-label="Layers">
        {layers.map((layer) => (
          <NavLink
            key={layer.id}
            to={layer.path}
            end
            className="leftnav-rail-btn"
            aria-label={layer.title}
            data-active={layer.id === layerId ? 'true' : undefined}
            onMouseEnter={show(layer.title)}
            onFocus={show(layer.title)}
            onBlur={hide}
            onClick={() => setNavIntent('nav', layer.path)}
          >
            <Icon name={LAYER_ICON[layer.id]} size={17} />
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="leftnav-rail-btn leftnav-rail-expand"
        onClick={() => setLeftOpen(true)}
        onMouseEnter={show('Expand navigation  [')}
        onFocus={show('Expand navigation  [')}
        onBlur={hide}
        aria-label="Expand navigation"
      >
        <Icon name="chevron-right" size={16} />
      </button>

      {tip
        ? createPortal(
            <div className="leftnav-tip" role="tooltip" style={{ top: tip.top }}>
              {tip.label}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
