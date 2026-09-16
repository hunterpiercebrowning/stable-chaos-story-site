import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { ContextCard } from '../../components/ContextCard';
import { PostCard } from '../../components/SourceEmbed';
import { getCopy } from '../../data';
import type { BackgroundNode as BackgroundNodeData, ContextItem, Node } from '../../data/types';
import { cn } from '../../lib/cn';
import {
  formatSourceDate,
  isPdfUrl,
  sourceHost,
  sourceKind,
  useSourcePreview,
  type SourceKind,
  type SourcePreview,
} from '../../lib/source';
import { videoThumbnail } from '../../lib/video';
import type { NodeViewProps } from '../types';
import './background.css';

/**
 * The card a background node shows in the grid, in the ContextCard style,
 * driven by the node's own `source_url`: a YouTube video card, an article (or
 * PDF) card with its Open Graph image and publication, or an X post card. The
 * node supplies the headline and tagline; authored `source_name`,
 * `source_date` and `thumbnail` override what the preview fetched.
 * Without a source, the lead context item picks the layout as before.
 */
function sourceCardItem(node: BackgroundNodeData, kind: SourceKind, preview: SourcePreview | null): ContextItem {
  const url = node.sourceUrl ?? '';
  const base = { title: node.title, url: '', blurb: getCopy(node).tagline };

  if (kind === 'video') {
    return {
      ...base,
      type: 'video',
      source: node.sourceName || (preview?.kind === 'video' ? preview.channel : '') || 'YouTube',
      date: formatSourceDate(node.sourceDate ?? ''),
      thumbnail: node.thumbnail || videoThumbnail(url),
    };
  }

  const article = preview?.kind === 'article' ? preview : null;
  return {
    ...base,
    type: article?.pdf || isPdfUrl(url) ? 'pdf' : 'article',
    source: node.sourceName || article?.siteName || sourceHost(url),
    date: formatSourceDate(node.sourceDate || article?.published || ''),
    thumbnail: node.thumbnail || article?.image || '',
  };
}

function leadItemCard(node: Node): ContextItem {
  const lead = node.contextItems[0];
  const type = lead?.type ?? 'article';
  return {
    type,
    title: type === 'quote' && lead?.title ? lead.title : node.title,
    source: lead?.source ?? '',
    date: lead?.date ?? '',
    thumbnail:
      lead?.thumbnail ||
      videoThumbnail(lead?.url) ||
      (type === 'video' ? videoThumbnail(node.videoLink) : ''),
    url: '',
    blurb: getCopy(node).tagline,
  };
}

/** Clicking opens the node's focus; the shared `layoutId` grows the card into it. */
export function BackgroundNode({ node, active, onSelect, index = 0 }: NodeViewProps & { index?: number }) {
  const reduced = useReducedMotion();
  const bg = node.layerId === 'background' ? node : null;
  const url = bg?.sourceUrl ?? '';
  const kind = sourceKind(url);
  const { preview, loading } = useSourcePreview(url);
  const open = () => onSelect(node);

  return (
    <motion.div
      layoutId={reduced ? undefined : `node-${node.id}`}
      className={cn('background-card', active && 'is-active')}
      style={{ '--i': index } as CSSProperties}
    >
      {bg && kind === 'post' ? (
        <PostCard
          node={bg}
          url={url}
          preview={preview?.kind === 'post' ? preview : null}
          loading={loading}
          variant="card"
          onActivate={open}
        />
      ) : (
        <ContextCard
          item={bg && kind ? sourceCardItem(bg, kind, preview) : leadItemCard(node)}
          node={node}
          index={0}
          label={node.title}
          onActivate={open}
        />
      )}
    </motion.div>
  );
}
