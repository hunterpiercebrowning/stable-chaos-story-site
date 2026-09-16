import type { HoldingKind } from '../data/types';
import { cn } from '../lib/cn';
import { Icon } from './Icon';
import './tags.css';

export interface KindTagProps {
  kind: HoldingKind;
  className?: string;
}

/** Service vs product on the Our Holdings layer: a briefcase or a box, with the word. */
export function KindTag({ kind, className }: KindTagProps) {
  return (
    <span className={cn('tag', 'tag--kind', className)} data-kind={kind}>
      <Icon name={kind === 'service' ? 'briefcase' : 'box'} size={11} />
      {kind === 'service' ? 'Service' : 'Product'}
    </span>
  );
}
