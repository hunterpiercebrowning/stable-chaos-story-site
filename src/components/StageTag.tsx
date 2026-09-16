import type { ProductStage } from '../data/types';
import { cn } from '../lib/cn';
import './tags.css';

export interface StageTagProps {
  stage: ProductStage;
  className?: string;
}

/**
 * Slated = dashed + muted + "Slated". Active is the default state and goes
 * unlabelled on cards and in the focus eyebrow; the solid card is the cue.
 */
export function StageTag({ stage, className }: StageTagProps) {
  return (
    <span className={cn('tag', 'tag--stage', className)} data-stage={stage}>
      {stage === 'active' ? 'Active' : 'Slated'}
    </span>
  );
}
