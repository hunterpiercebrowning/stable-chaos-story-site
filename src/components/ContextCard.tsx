import { useCallback, useState, type ReactNode } from 'react';
import { getPrimarySector } from '../data';
import type { ContextItem, ContextItemType, Node } from '../data/types';
import { cn } from '../lib/cn';
import { track } from '../lib/track';
import { videoThumbnail, youTubeThumbnailFallback } from '../lib/video';
import { VideoHost } from './ContextCardVideoHost';
import { Icon, type IconName } from './Icon';
import { Placeholder } from './Placeholder';
import './context-card.css';

export interface ContextCardProps {
  item: ContextItem;
  /** Node the item belongs to — seeds the placeholder art and carries the tracking id. */
  node: Node;
  /** Position within the node's list; keeps generated thumbnails distinct. */
  index: number;
  /** Non-interactive, faded preview (the Foundational Background "coming soon" state). */
  ghost?: boolean;
  /** Makes the whole card one button that runs this instead of opening the url or playing. */
  onActivate?: () => void;
  /** Accessible name when `onActivate` is set; defaults to the item title. */
  label?: string;
  className?: string;
}

const TYPE_ICON: Record<ContextItemType, IconName> = {
  article: 'article',
  video: 'video',
  link: 'link',
  pdf: 'document',
  image: 'image',
  quote: 'quote',
};

const TYPE_LABEL: Record<ContextItemType, string> = {
  article: 'Article',
  video: 'Video',
  link: 'Link',
  pdf: 'PDF',
  image: 'Image',
  quote: 'Quote',
};

/** `example.org/path` → `example.org`; falls back to the item's source. */
function domainOf(url: string, fallback = ''): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || fallback;
  } catch {
    return fallback;
  }
}

/**
 * One supporting-context item, laid out per type:
 *   article — wide thumb, source · date, title, blurb
 *   video   — 16:9 thumb with a play ring; opens the shared VideoPlayer expanded
 *   link    — favicon-style tile, domain, title
 *   pdf     — document tile, source · date, title
 *   image   — thumb-led with a caption overlay
 *   quote   — large quote mark, the quote, attribution
 *
 * Clicking tracks `context_item_open` and opens the url in a new tab (video
 * plays in place instead). Items without a url are inert.
 */
export function ContextCard({
  item,
  node,
  index,
  ghost,
  onActivate,
  label,
  className,
}: ContextCardProps) {
  const [playing, setPlaying] = useState(false);
  const stopPlaying = useCallback(() => setPlaying(false), []);
  const sector = getPrimarySector(node);
  const seed = `${node.id}-ctx-${index}`;
  const isVideo = item.type === 'video';
  const interactive = !ghost && (Boolean(onActivate) || isVideo || Boolean(item.url));

  const onOpen = () => {
    track('context_item_open', { nodeId: node.id, itemType: item.type, url: item.url });
    if (isVideo) setPlaying(true);
  };

  const thumbSrc = item.thumbnail || videoThumbnail(item.url);
  const thumb = (variant: 'thumb' | 'image') =>
    thumbSrc ? (
      <img
        className="ctx-img"
        src={thumbSrc}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={(e) => youTubeThumbnailFallback(e.currentTarget, false)}
        onError={(e) => youTubeThumbnailFallback(e.currentTarget, true)}
      />
    ) : (
      <Placeholder
        seed={seed}
        variant={variant}
        sector={sector}
        width={variant === 'image' ? 640 : 960}
        height={variant === 'image' ? 480 : 540}
        bare
        className="ctx-ph"
      />
    );

  const typeBadge = (
    <span className="ctx-type">
      <Icon name={TYPE_ICON[item.type]} size={12} />
      {TYPE_LABEL[item.type]}
    </span>
  );

  const meta = () =>
    item.source || item.date ? (
      <div className="ctx-meta">
        {item.source ? (
          <span className="ctx-source">
            {item.source}
          </span>
        ) : null}
        {item.date ? <span className="ctx-date">{item.date}</span> : null}
      </div>
    ) : null;

  const foot =
    item.url && !isVideo && item.type !== 'link' ? (
      <div className="ctx-foot">
        <span className="ctx-open">
          {domainOf(item.url, 'Open')}
          <Icon name="external-link" size={12} />
        </span>
      </div>
    ) : null;

  let body: ReactNode;
  switch (item.type) {
    case 'video':
      body = (
        <>
          <div className="ctx-thumb ctx-thumb--video">
            {thumb('thumb')}
            <span className="ctx-play">
              <Icon name="play" size={18} />
            </span>
            {typeBadge}
          </div>
          <div className="ctx-body">
            {meta()}
            <h4 className="ctx-title">{item.title}</h4>
            {foot}
          </div>
        </>
      );
      break;

    case 'link':
      body = (
        <div className="ctx-row">
          <span className="ctx-tile" aria-hidden="true">
            <Icon name="link" size={17} />
          </span>
          <div className="ctx-body">
            <div className="ctx-meta">
              <span className="ctx-source">{domainOf(item.url, item.source)}</span>
            </div>
            <h4 className="ctx-title">{item.title}</h4>
            {item.blurb ? <p className="ctx-blurb">{item.blurb}</p> : null}
            {foot}
          </div>
          {interactive && !onActivate ? <Icon name="external-link" size={14} className="ctx-ext" /> : null}
        </div>
      );
      break;

    case 'pdf':
      body = (
        <div className="ctx-row">
          <span className="ctx-tile ctx-tile--pdf" aria-hidden="true">
            <Icon name="document" size={17} />
            <span className="ctx-tile-label">PDF</span>
          </span>
          <div className="ctx-body">
            {meta()}
            <h4 className="ctx-title">{item.title}</h4>
            {item.blurb ? <p className="ctx-blurb">{item.blurb}</p> : null}
            {foot}
          </div>
        </div>
      );
      break;

    case 'image':
      body = (
        <>
          <div className="ctx-thumb ctx-thumb--image">
            {thumb('image')}
            {typeBadge}
            <div className="ctx-caption">
              <h4 className="ctx-title">{item.title}</h4>
              {meta()}
            </div>
          </div>
          {foot ? <div className="ctx-body ctx-body--tight">{foot}</div> : null}
        </>
      );
      break;

    case 'quote':
      body = (
        <div className="ctx-quote">
          <span className="ctx-quote-mark" aria-hidden="true">
            &ldquo;
          </span>
          <blockquote className="ctx-quote-text">{item.title}</blockquote>
          {meta()}
          {foot}
        </div>
      );
      break;

    default:
      body = (
        <>
          <div className="ctx-thumb ctx-thumb--wide">
            {thumb('thumb')}
            {typeBadge}
          </div>
          <div className="ctx-body">
            {meta()}
            <h4 className="ctx-title">{item.title}</h4>
            {item.blurb ? <p className="ctx-blurb">{item.blurb}</p> : null}
            {foot}
          </div>
        </>
      );
  }

  const classes = cn(
    'ctx-card',
    `ctx-card--${item.type}`,
    interactive && 'is-interactive',
    ghost && 'is-ghost',
    className,
  );
  const data = { 'data-type': item.type, 'data-sector': sector ?? undefined };

  if (ghost) {
    return (
      <div className={classes} {...data} aria-hidden="true">
        {body}
      </div>
    );
  }

  if (onActivate) {
    return (
      <button type="button" className={classes} {...data} onClick={onActivate} aria-label={label ?? item.title}>
        {body}
      </button>
    );
  }

  if (isVideo) {
    return (
      <>
        <button
          type="button"
          className={classes}
          {...data}
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`Play: ${item.title}`}
        >
          {body}
        </button>
        {playing ? (
          <VideoHost node={node} link={item.url} label={item.source || 'Watch'} onClose={stopPlaying} />
        ) : null}
      </>
    );
  }

  if (item.url) {
    return (
      <a className={classes} {...data} href={item.url} target="_blank" rel="noreferrer" onClick={onOpen}>
        {body}
      </a>
    );
  }

  return (
    <article className={classes} {...data}>
      {body}
    </article>
  );
}
