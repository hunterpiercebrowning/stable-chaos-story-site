import type { ReactElement } from 'react';

/**
 * Line-icon sprite in the marketing site's stroke style: 24×24 box, 1.7px
 * stroke, round caps and joins, no fills.
 *
 * To add an icon: drop another entry in `PATHS` (paths only, no attributes) —
 * later workstreams append here and never reformat existing entries.
 */
const PATHS: Record<string, ReactElement> = {
  /* ── navigation ── */
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-down': <path d="M12 5v14M18 13l-6 6-6-6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  'external-link': (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
    </>
  ),

  /* ── shell chrome ── */
  'panel-left': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9.5 4v16" />
    </>
  ),
  'panel-right': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M14.5 4v16" />
    </>
  ),
  compress: <path d="M9 4v5H4M15 20v-5h5M9 20v-5H4M15 4v5h5" />,
  expand: <path d="M4 9V4h5M20 15v5h-5M4 15v5h5M20 9V4h-5" />,
  presentation: (
    <>
      <rect x="3" y="4" width="18" height="11" rx="1.5" />
      <path d="M12 15v5M8.5 20h7" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  play: <path d="M8 5.5l10 6.5-10 6.5z" />,
  pause: <path d="M9.5 5v14M14.5 5v14" />,

  /* ── context item types ── */
  article: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
      <path d="M14 3v4h4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-4.5 4.5 4 3-2.5L20 18" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="12" height="12" rx="2" />
      <path d="M15 11l6-3.5v9L15 13z" />
    </>
  ),
  quote: <path d="M9 7c-2.5 1-4 3.2-4 6v4h5v-5H7c0-2 .8-3.3 2.6-4zM19 7c-2.5 1-4 3.2-4 6v4h5v-5h-3c0-2 .8-3.3 2.6-4z" />,
  link: (
    <>
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.6 6.7" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.5-1.5" />
    </>
  ),

  /* ── product categories ── */
  bioproduct: (
    <>
      <path d="M6 20c0-7 4-12 12-16" />
      <path d="M18 4c-7.5 0-12 4-12 9 5 1 10-2 12-9z" />
    </>
  ),
  hardware: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </>
  ),
  software: <path d="M9 8l-5 4 5 4M15 8l5 4-5 4M13 5l-2 14" />,

  /* ── beliefs ── */
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3.5M15 12v2.5" />
    </>
  ),
  shield: <path d="M12 3l7.5 3v6c0 4.5-3 7.8-7.5 9.5C7.5 19.8 4.5 16.5 4.5 12V6z" />,
  consilience: <path d="M3 5l7 7-7 7M3 12h18M21 5l-7 7 7 7" />,
  atom: (
    <>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(120 12 12)" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  chip: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M11 11h2v2h-2z" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </>
  ),
  castle: (
    <>
      <path d="M4 20V8l3 2 2.5-3 2.5 3 2.5-3L17 10l3-2v12z" />
      <path d="M10 20v-4h4v4" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.6 3 4 5.8 4 9s-1.4 6-4 9c-2.6-3-4-5.8-4-9s1.4-6 4-9z" />
    </>
  ),
  node: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="12" cy="21" r="2" />
      <path d="M6.5 6.5l3.3 3.3M17.5 6.5l-3.3 3.3M12 15v4" />
    </>
  ),
  spark: <path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M18 18l-3-3M18 6l-3 3M6 18l3-3" />,

  /* ── WS7 ── */
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

// eslint-disable-next-line react/only-export-components -- the sprite's index belongs with it
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 18, className, title }: IconProps) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}
