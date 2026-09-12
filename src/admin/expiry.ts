/** Expiry presets shared by the new-link modal and the detail page. */

export type ExpiryPreset = 'none' | '7d' | '30d' | '90d' | 'custom';

export const EXPIRY_OPTIONS: { value: ExpiryPreset; label: string }[] = [
  { value: 'none', label: 'Never' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Pick a date' },
];

const DAY = 86_400_000;

/** Resolve a preset (+ optional yyyy-mm-dd) to an epoch-ms expiry, or null for never. */
export function resolveExpiry(preset: ExpiryPreset, customDate: string, from = Date.now()): number | null {
  switch (preset) {
    case 'none':
      return null;
    case '7d':
      return from + 7 * DAY;
    case '30d':
      return from + 30 * DAY;
    case '90d':
      return from + 90 * DAY;
    case 'custom': {
      if (!customDate) return null;
      // End of the chosen local day.
      const d = new Date(`${customDate}T23:59:59`);
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    }
  }
}

/** yyyy-mm-dd for `<input type="date">` from epoch ms. */
export function toDateInput(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
