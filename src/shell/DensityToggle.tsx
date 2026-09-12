import type { Density } from '../data/types';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import { Icon } from '../components/Icon';
import './controls.css';

const OPTIONS: { value: Density; label: string; icon: 'compress' | 'expand' }[] = [
  { value: 'compressed', label: 'Compressed', icon: 'compress' },
  { value: 'expanded', label: 'Expanded', icon: 'expand' },
];

/** Global Compressed/Expanded control. Affects layers with `hasDensity`. */
export function DensityToggle() {
  const density = useUi((s) => s.density);
  const setDensity = useUi((s) => s.setDensity);

  return (
    <div className="segmented segmented--sm" role="group" aria-label="Node density">
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
