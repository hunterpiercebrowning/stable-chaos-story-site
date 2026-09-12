import { getContextItems, getPrimarySector } from '../data';
import type { ContextItem, ContextItemType, Node } from '../data/types';
import { Icon, type IconName } from '../components/Icon';
import { Placeholder } from '../components/Placeholder';
import { track } from '../lib/track';
import { useRoute } from './useRoute';
import './right-tray.css';

const TYPE_ICON: Record<ContextItemType, IconName> = {
  article: 'article',
  video: 'video',
  link: 'link',
  pdf: 'document',
  image: 'image',
  quote: 'quote',
};

/**
 * "Supporting Context" for the focused node. WS7 owns the per-type card
 * designs; this generic card keeps every type readable in the meantime.
 */
export function RightTray() {
  const { layer, node } = useRoute();
  const items = node ? getContextItems(node) : [];

  return (
    <div className="tray">
      <header className="tray-header">
        <span className="sc-label">Supporting Context</span>
        {node ? <span className="tray-count">{items.length}</span> : null}
      </header>

      {node ? (
        <div className="tray-list sc-scroll">
          {items.map((item, i) => (
            <ContextCard key={`${node.id}-${i}`} item={item} node={node} index={i} />
          ))}
        </div>
      ) : (
        <p className="tray-empty">
          {layer && layer.id !== 'welcome'
            ? `Focus a node in ${layer.title} to see its supporting material.`
            : 'Focus a node to see the articles, videos and links behind it.'}
        </p>
      )}
    </div>
  );
}

function ContextCard({ item, node, index }: { item: ContextItem; node: Node; index: number }) {
  const sector = getPrimarySector(node);
  const isPlaceholder = node.contextItems.length === 0;

  return (
    <article className="context-card" data-type={item.type}>
      <div className="context-card-thumb">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" />
        ) : (
          <Placeholder
            seed={`${node.id}-ctx-${index}`}
            variant="thumb"
            sector={sector}
            bare
            className="context-card-ph"
          />
        )}
        <span className="context-card-type">
          <Icon name={TYPE_ICON[item.type]} size={13} />
          {item.type}
        </span>
      </div>

      <div className="context-card-body">
        <div className="context-card-meta">
          <span>{item.source}</span>
          {item.date ? <span>· {item.date}</span> : null}
        </div>
        <h4 className="context-card-title">{item.title}</h4>
        {item.blurb ? <p className="context-card-blurb">{item.blurb}</p> : null}
        {item.url ? (
          <a
            className="context-card-link"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              track('context_item_open', { nodeId: node.id, itemType: item.type, url: item.url })
            }
          >
            Open <Icon name="external-link" size={13} />
          </a>
        ) : isPlaceholder ? (
          <span className="context-card-note">placeholder</span>
        ) : null}
      </div>
    </article>
  );
}
