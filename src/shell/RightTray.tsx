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
  beliefs: 'Our five advantages in the age of AI, stated in full. There is nothing to focus here.',
  sectors: 'Select a sector or domain to see the sources behind it.',
  trajectory: 'The ventures built so far and what comes next, year by year. There is nothing to focus here.',
  holdings: 'Select a company, offering or product to see the material behind it.',
  background: 'Select a background topic to see the sources behind it.',
};

/**
 * "Supporting Context": the focused node's context items, one `ContextCard`
 * per item. With no focus it shows a hint for the current layer.
 */
export function RightTray() {
  const { layer, node } = useRoute();
  const items = node ? getContextItems(node) : [];
  // A background node's own source is embedded in its focus panel, so an empty
  // tray there is expected rather than missing content.
  const sourceInFocus = Boolean(node && node.layerId === 'background' && node.sourceUrl);

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
          <p className="tray-empty-title">
            {sourceInFocus ? 'Source shown in focus' : 'No supporting context'}
          </p>
          <p className="tray-empty-body">
            {sourceInFocus
              ? "This topic's source is embedded in the focus panel. Add context items to list more here."
              : 'Nothing has been linked to this node yet.'}
          </p>
        </div>
      ) : node ? (
        <div className="tray-list sc-scroll" key={node.id}>
          {items.map((item, i) => (
            <ContextCard
              key={`${node.id}-${i}`}
              item={item}
              node={node}
              index={i}
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
