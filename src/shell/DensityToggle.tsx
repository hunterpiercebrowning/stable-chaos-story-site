import type { Density } from '../data/types';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import { Icon } from '../components/Icon';
import './controls.css';

const OPTIONS: { value: Density; label: string; icon: 'compress' | 'expand' }[] = [
  { value: 'compressed', label: 'Overview', icon: 'compress' },
  { value: 'expanded', label: 'Details', icon: 'expand' },
];

/**
 * Global density control. The values stay `compressed` / `expanded` (state,
 * events and CSS hooks); only the labels read Overview / Details.
 */
export function DensityToggle() {
  const density = useUi((s) => s.density);
  const setDensity = useUi((s) => s.setDensity);

  return (
    <div className="segmented segmented--sm" role="group" aria-label="Level of detail">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented-option"
          aria-pressed={density === o.value}
          onClick={() => {
            if (density === o.value) return;
            setDensity(o.value);
            track('density_change', { value: o.value });
          }}
        >
          <Icon name={o.icon} size={14} />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
