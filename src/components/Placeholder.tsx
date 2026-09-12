import { placeholderImage, type PlaceholderVariant } from '../data/placeholders';
import type { SectorId } from '../data/types';
import { cn } from '../lib/cn';
import './placeholder.css';

export interface PlaceholderProps {
  /** Stable seed — use the node id so the image never changes between renders. */
  seed: string;
  variant?: PlaceholderVariant;
  sector?: SectorId | null;
  /** Monogram for logo/headshot variants. */
  label?: string;
  width?: number;
  height?: number;
  className?: string;
  /** Hide the small dev-only "placeholder" tag. */
  bare?: boolean;
}

/**
 * Generated brand-colored media. No external requests — the image is an inline
 * SVG data URI, so the site stays private and builds offline.
 */
export function Placeholder({
  seed,
  variant = 'image',
  sector = null,
  label = '',
  width,
  height,
  className,
  bare = false,
}: PlaceholderProps) {
  const src = placeholderImage({ seed, sector, variant, label, width, height });
  return (
    <span className={cn('ph', `ph--${variant}`, className)}>
      <img className="ph-img" src={src} alt="" />
      {bare ? null : <span className="sc-placeholder-tag">placeholder</span>}
    </span>
  );
}
