import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode, Ref } from 'react';
import { nodeSectors } from '../data/normalize';
import type { Node } from '../data/types';
import { cn } from '../lib/cn';
import { SectorTag } from './SectorTag';
import { StageTag } from './StageTag';
import './node-card.css';

export type NodeCardSize = 'xs' | 'sm' | 'md' | 'lg' | 'wide';

export interface NodeCardProps {
  node: Node;
  size?: NodeCardSize;
  /** Density collapse — animates out, still in the DOM. */
  collapsed?: boolean;
  active?: boolean;
  /** Shared element id for the grow-into-focus transition. `null` opts out. */
  layoutId?: string | null;
  onSelect?: (node: Node) => void;
  className?: string;
  /** Replaces the default title/subtitle body. */
  children?: ReactNode;
  /** Slot above the title (logo, headshot, icon …). */
  media?: ReactNode;
  subtitle?: ReactNode;
  showTags?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

function defaultSubtitle(node: Node): string | null {
  switch (node.layerId) {
    case 'who':
      return `${node.role} · ${node.company}`;
    case 'products':
      return node.category ?? 'Sector';
    case 'services':
      return node.tier === 'primary' ? 'Company' : 'Offering';
    case 'sectors':
      return node.tier === 'primary' ? 'Sector' : 'Domain';
    case 'beliefs':
      return node.beliefType === 'disruption' ? 'Disruption' : 'Advantage';
    default:
      return null;
  }
}

/**
 * The base node surface every layer builds on: glass card, size variants,
 * collapse state and the `layoutId` that grows into the focus frame.
 */
export function NodeCard({
  node,
  size = 'md',
  collapsed = false,
  active = false,
  layoutId,
  onSelect,
  className,
  children,
  media,
  subtitle,
  showTags = true,
  ref,
}: NodeCardProps) {
  const reduced = useReducedMotion();
  const sectors = nodeSectors(node);
  const sub = subtitle ?? defaultSubtitle(node);

  return (
    <motion.button
      ref={ref}
      type="button"
      layoutId={reduced || layoutId === null ? undefined : (layoutId ?? `node-${node.id}`)}
      className={cn(
        'node-card',
        `node-card--${size}`,
        collapsed && 'is-collapsed',
        active && 'is-active',
        className,
      )}
      data-layer={node.layerId}
      data-tier={node.tier}
      data-sector={sectors[0]}
      data-sector-2={sectors[1]}
      data-belief={node.layerId === 'beliefs' ? node.beliefType : undefined}
      aria-pressed={active}
      onClick={() => onSelect?.(node)}
      // Motion writes inline styles on layout-animated elements, which would win
      // over the .is-collapsed class — so drive it here and keep the class as a
      // styling hook for the layers.
      animate={{
        opacity: collapsed ? 0 : 1,
        scale: collapsed ? 0.96 : 1,
      }}
      transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children ?? (
        <>
          {media ? <span className="node-card-media">{media}</span> : null}
          <span className="node-card-body">
            <span className="node-card-title">{node.title}</span>
            {sub && size !== 'xs' ? <span className="node-card-sub">{sub}</span> : null}
          </span>
          {showTags && size !== 'xs' ? (
            <span className="node-card-tags">
              {sectors[0] ? <SectorTag sector={sectors[0]} second={sectors[1] ?? null} /> : null}
              {node.layerId === 'products' && node.stage ? <StageTag stage={node.stage} /> : null}
            </span>
          ) : null}
        </>
      )}
    </motion.button>
  );
}
