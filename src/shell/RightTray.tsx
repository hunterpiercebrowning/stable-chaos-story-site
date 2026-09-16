import { ContextCard } from '../components/ContextCard';
import { Icon } from '../components/Icon';
import { getContextItems } from '../data';
import type { Layer } from '../data/types';
import { useRoute } from './useRoute';
import './right-tray.css';

/** Layer-level hint shown while nothing is focused. */
const HINT: Record<Layer['id'], string> = {
  welcome: 'Focus a node anywhere in the story to see the articles, videos and links behind it.',
  who: 'Select a person to see the press, talks and profiles behind them.',
  operations: 'The operating team and the software layer they share. There is nothing to focus here.',
  beliefs: 'Select a belief to see the reporting and research behind it.',
  sectors: 'Select a sector or domain to see the sources behind it.',
  trajectory: 'The ventures built so far and what comes next, year by year. There is nothing to focus here.',
  services: 'Select a company or offering to see the coverage behind it.',
  products: 'Select a product to see the material behind it.',
  background: 'Select a background topic to see the sources behind it.',
};

/**
 * "Supporting Context": the focused node's context items, one `ContextCard`
 * per item. With no focus it shows a hint for the current layer.
 */
export function RightTray() {
  const { layer, node } = useRoute();
  const items = node ? getContextItems(node) : [];
  const placeholder = Boolean(node && node.contextItems.length === 0);

  return (
    <div className="tray">
      <header className="tray-header">
        <div className="tray-heading">
          <span className="sc-label">Supporting Context</span>
          {node && items.length > 0 ? (
            <span className="tray-count" aria-label={`${items.length} items`}>
              {items.length}
            </span>
          ) : null}
        </div>
        {node ? <div className="tray-subject">{node.title}</div> : null}
      </header>

      {node && items.length === 0 ? (
        <div className="tray-empty">
          <span className="tray-empty-glyph" aria-hidden="true">
            <Icon name="article" size={18} />
            <Icon name="video" size={18} />
            <Icon name="link" size={18} />
          </span>
          <p className="tray-empty-title">Source shown in focus</p>
          <p className="tray-empty-body">This topic's source is embedded in the focus panel. Add context items to list more here.</p>
        </div>
      ) : node ? (
        <div className="tray-list sc-scroll" key={node.id}>
          {items.map((item, i) => (
            <ContextCard
              key={`${node.id}-${i}`}
              item={item}
              node={node}
              index={i}
              placeholder={placeholder}
              className="tray-card sc-fade-in"
            />
          ))}
        </div>
      ) : (
        <div className="tray-empty">
          <span className="tray-empty-glyph" aria-hidden="true">
            <Icon name="article" size={18} />
            <Icon name="video" size={18} />
            <Icon name="link" size={18} />
          </span>
          <p className="tray-empty-title">Nothing focused</p>
          <p className="tray-empty-body">{HINT[layer?.id ?? 'welcome']}</p>
        </div>
      )}
    </div>
  );
}
