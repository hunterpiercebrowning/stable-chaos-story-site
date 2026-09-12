import { SECTOR_IDS, SECTOR_LABEL, type Emphasis } from '../data/types';
import { track } from '../lib/track';
import { useUi } from '../store/ui';
import './controls.css';

const OPTIONS: { value: Emphasis; label: string }[] = [
  { value: 'all', label: 'All' },
  ...SECTOR_IDS.map((id) => ({ value: id as Emphasis, label: SECTOR_LABEL[id] })),
];

/**
 * Presenter emphasis. Selecting a sector dims — never hides — everything that
 * does not belong to it. Shown only on layers with `hasEmphasis`.
 */
export function EmphasisControl() {
  const emphasis = useUi((s) => s.emphasis);
  const setEmphasis = useUi((s) => s.setEmphasis);

  return (
    <div className="segmented" role="group" aria-label="Sector emphasis">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className="segmented-option"
          data-sector={o.value === 'all' ? undefined : o.value}
          aria-pressed={emphasis === o.value}
          onClick={() => {
            if (emphasis === o.value) return;
            setEmphasis(o.value);
            track('emphasis_change', { value: o.value });
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
