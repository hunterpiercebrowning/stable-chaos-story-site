import { useState } from 'react';
import { getPrimarySector } from '../data';
import type { BackgroundNode } from '../data/types';
import { cn } from '../lib/cn';
import {
  formatSourceDate,
  isPdfUrl,
  sourceHost,
  sourceKind,
  useSourcePreview,
  type PostPreview,
  type SourcePreview,
} from '../lib/source';
import { track } from '../lib/track';
import { videoThumbnail, youTubeEmbedUrl, youTubeId, youTubeThumbnailFallback } from '../lib/video';
import { Icon } from './Icon';
import { Placeholder } from './Placeholder';
import './context-card.css';
import './source-embed.css';

/**
 * The source of a Foundational Background node, shown in its focus frame:
 *   video   — YouTube poster that swaps to the player in place
 *   post    — the X post as a native card (author, text, first photo, counts)
 *   article — Open Graph preview: image, publication · date, headline, summary
 * Authored `source_name` / `source_date` / `thumbnail` win over fetched values;
 * while the preview loads (or if it fails) the node's own title stands in.
 */
export function SourceEmbed({ node }: { node: BackgroundNode }) {
  const url = node.sourceUrl ?? '';
  const kind = sourceKind(url);
  const { preview, loading } = useSourcePreview(url);
  if (!kind) return null;

  if (kind === 'video') return <VideoEmbed key={url} node={node} url={url} preview={preview} />;
  if (kind === 'post') {
    return (
      <PostCard
        node={node}
        url={url}
        preview={preview?.kind === 'post' ? preview : null}
        loading={loading}
        variant="embed"
      />
    );
  }
  return <ArticleEmbed node={node} url={url} preview={preview} loading={loading} />;
}

function openExternal(node: BackgroundNode, url: string, kind: string) {
  track('external_link', { nodeId: node.id, url, kind });
}

/* ── video ──────────────────────────────────────────── */

function VideoEmbed({ node, url, preview }: { node: BackgroundNode; url: string; preview: SourcePreview | null }) {
  const [playing, setPlaying] = useState(false);
  const id = youTubeId(url) ?? '';
  const video = preview?.kind === 'video' ? preview : null;
  const channel = node.sourceName || video?.channel || 'YouTube';
  const date = formatSourceDate(node.sourceDate ?? '');

  return (
    <figure className="src-video">
      <div className="src-video-frame">
        {playing ? (
          <iframe
            className="src-video-player"
            src={youTubeEmbedUrl(id, { autoplay: true })}
            title={video?.title || node.title}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="src-video-poster"
            aria-label={`Play: ${video?.title || node.title}`}
            onClick={() => {
              track('video_play', { nodeId: node.id, source: 'youtube', pct: 0 });
              setPlaying(true);
            }}
          >
            <img
              src={node.thumbnail || videoThumbnail(url)}
              alt=""
              onLoad={(e) => youTubeThumbnailFallback(e.currentTarget, false)}
              onError={(e) => youTubeThumbnailFallback(e.currentTarget, true)}
            />
            <span className="src-video-play" aria-hidden="true">
              <Icon name="play" size={22} />
            </span>
          </button>
        )}
      </div>
      <figcaption className="src-caption">
        <span className="src-meta">
          <span className="src-source">{channel}</span>
          {date ? <span className="src-date">{date}</span> : null}
        </span>
        {video?.title ? <span className="src-caption-title">{video.title}</span> : null}
        <a
          className="src-open"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => openExternal(node, url, 'video')}
        >
          Watch on YouTube
          <Icon name="external-link" size={12} />
        </a>
      </figcaption>
    </figure>
  );
}

/* ── article ────────────────────────────────────────── */

function ArticleEmbed({
  node,
  url,
  preview,
  loading,
}: {
  node: BackgroundNode;
  url: string;
  preview: SourcePreview | null;
  loading: boolean;
}) {
  const article = preview?.kind === 'article' ? preview : null;
  const host = sourceHost(url);
  const pdf = article?.pdf || isPdfUrl(url);
  const image = node.thumbnail || article?.image || '';
  const source = node.sourceName || article?.siteName || host;
  const date = formatSourceDate(node.sourceDate || article?.published || '');

  return (
    <a
      className="src-article"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-loading={loading ? 'true' : undefined}
      onClick={() => openExternal(node, url, pdf ? 'pdf' : 'article')}
    >
      <span className="src-article-media">
        {image ? (
          <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : pdf ? (
          <span className="ctx-tile ctx-tile--pdf src-article-tile" aria-hidden="true">
            <Icon name="document" size={17} />
            <span className="ctx-tile-label">PDF</span>
          </span>
        ) : (
          <Placeholder seed={`${node.id}-source`} variant="thumb" sector={getPrimarySector(node)} width={960} height={540} bare />
        )}
      </span>
      <span className="src-article-body">
        <span className="src-meta">
          <span className="src-source">{source}</span>
          {date ? <span className="src-date">{date}</span> : null}
        </span>
        <span className="src-article-title">{article?.title || node.title}</span>
        {article?.description ? <span className="src-article-desc">{article.description}</span> : null}
        <span className="src-open">
          {pdf ? 'Open PDF' : `Read on ${host}`}
          <Icon name="external-link" size={12} />
        </span>
      </span>
    </a>
  );
}

/* ── X post ─────────────────────────────────────────── */

/** `jack` from `https://x.com/jack/status/20`. */
function handleFromUrl(url: string): string {
  try {
    const first = new URL(url).pathname.split('/')[1] ?? '';
    return first && first !== 'i' ? first : '';
  } catch {
    return '';
  }
}

const compactCount = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export interface PostCardProps {
  node: BackgroundNode;
  url: string;
  preview: PostPreview | null;
  loading: boolean;
  /** `card` is the grid button (opens the focus); `embed` links out to the post. */
  variant: 'card' | 'embed';
  onActivate?: () => void;
  className?: string;
}

export function PostCard({ node, url, preview, loading, variant, onActivate, className }: PostCardProps) {
  const handle = preview?.author.handle || handleFromUrl(url);
  const name = node.sourceName || preview?.author.name || (handle ? `@${handle}` : 'X');
  const date = formatSourceDate(node.sourceDate || preview?.created || '');
  const photo = preview?.media[0];
  const text = preview?.text || node.title;

  const body = (
    <>
      <span className="src-post-head">
        {preview?.author.avatar ? (
          <img className="src-post-avatar" src={preview.author.avatar} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="src-post-avatar src-post-avatar--empty" aria-hidden="true">
            {(name.replace('@', '')[0] ?? 'X').toUpperCase()}
          </span>
        )}
        <span className="src-post-who">
          <span className="src-post-name">{name}</span>
          {handle ? <span className="src-post-handle">@{handle}</span> : null}
        </span>
        <Icon name="x-logo" size={16} className="src-post-x" />
      </span>

      <span className="src-post-text">{text}</span>

      {photo ? (
        <span className="src-post-media" data-type={photo.type}>
          <img src={node.thumbnail || photo.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
          {photo.type === 'video' ? (
            <span className="src-video-play src-video-play--sm" aria-hidden="true">
              <Icon name="play" size={16} />
            </span>
          ) : null}
        </span>
      ) : null}

      <span className="src-post-foot">
        {date ? <span className="src-date">{date}</span> : null}
        {variant === 'embed' && preview ? (
          <>
            <span className="src-post-count">{compactCount.format(preview.likes)} likes</span>
            <span className="src-post-count">{compactCount.format(preview.replies)} replies</span>
          </>
        ) : null}
        {variant === 'embed' ? (
          <span className="src-open">
            View on X
            <Icon name="external-link" size={12} />
          </span>
        ) : null}
      </span>
    </>
  );

  const classes = cn('ctx-card', 'src-post', `src-post--${variant}`, 'is-interactive', className);
  const data = { 'data-loading': loading ? 'true' : undefined };

  if (variant === 'card') {
    return (
      <button type="button" className={classes} {...data} onClick={onActivate} aria-label={node.title}>
        {body}
      </button>
    );
  }
  return (
    <a
      className={classes}
      {...data}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => openExternal(node, url, 'post')}
    >
      {body}
    </a>
  );
}
