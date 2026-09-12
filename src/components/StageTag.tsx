import type { ProductStage } from '../data/types';
import { cn } from '../lib/cn';
import './tags.css';

export interface StageTagProps {
  stage: ProductStage;
  className?: string;
}

/** Active = solid; slated = dashed + muted + "Planned". */
export function StageTag({ stage, className }: StageTagProps) {
  return (
    <span className={cn('tag', 'tag--stage', className)} data-stage={stage}>
      {stage === 'active' ? 'Active' : 'Planned'}
    </span>
  );
}
