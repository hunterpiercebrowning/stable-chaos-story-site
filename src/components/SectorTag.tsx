import { SECTOR_LABEL, type SectorId } from '../data/types';
import { cn } from '../lib/cn';
import './tags.css';

export interface SectorTagProps {
  sector: SectorId;
  /** Two sectors render as a split pill. */
  second?: SectorId | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function SectorTag({ sector, second = null, size = 'sm', className }: SectorTagProps) {
  return (
    <span
      className={cn('tag', 'tag--sector', `tag--${size}`, className)}
      data-sector={sector}
      data-sector-2={second ?? undefined}
    >
      <span className="tag-dot" />
      {SECTOR_LABEL[sector]}
      {second ? <>&nbsp;· {SECTOR_LABEL[second]}</> : null}
    </span>
  );
}
