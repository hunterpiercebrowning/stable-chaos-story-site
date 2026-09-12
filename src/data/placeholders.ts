import type { ContextItem, ContextItemType, SectorId } from './types';

/**
 * Deterministic placeholder content. Everything here is seeded by the node id,
 * so a given node always shows the same lorem and the same generated image —
 * no flicker between renders and stable screenshots.
 *
 * These hex values mirror `src/styles/tokens.css`; SVG data URIs are generated
 * in TS and cannot read CSS custom properties. Keep the two in sync.
 */
const SECTOR_HEX: Record<SectorId, string> = {
  synbio: '#5A9E6F',
  security: '#E0945A',
  systems: '#9B8ABF',
};
const NEUTRAL_HEX = '#7EBF8A';
const GROUND_HEX = '#141414';

export function sectorHex(sector?: SectorId | null): string {
  return sector ? SECTOR_HEX[sector] : NEUTRAL_HEX;
}

/* ── seeded RNG ─────────────────────────────────────── */

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, stable across platforms. */
export function makeRng(seed: string): () => number {
  let a = hashString(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
  'eiusmod', 'tempor', 'incididunt', 'labore', 'dolore', 'magna', 'aliqua', 'enim', 'minim',
  'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'commodo',
  'consequat', 'duis', 'aute', 'irure', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum',
  'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'proident', 'sunt',
  'culpa', 'officia', 'deserunt', 'mollit', 'animid', 'laborum', 'perspiciatis', 'unde', 'omnis',
  'iste', 'natus', 'error', 'accusantium', 'doloremque', 'laudantium', 'totam', 'rem', 'aperiam',
];

function pickWords(rng: () => number, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(WORDS[Math.floor(rng() * WORDS.length)]);
  return out;
}

function between(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function sentenceCase(words: string[]): string {
  const s = words.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── text placeholders ──────────────────────────────── */

/** 6–10 words. */
export function loremTagline(seed: string): string {
  const rng = makeRng(`${seed}:tagline`);
  return sentenceCase(pickWords(rng, between(rng, 6, 10)));
}

/** 45–70 words, split into 2–3 sentences. */
export function loremBlurb(seed: string): string {
  const rng = makeRng(`${seed}:blurb`);
  const total = between(rng, 45, 70);
  const sentences: string[] = [];
  let left = total;
  while (left > 0) {
    const take = Math.min(left, between(rng, 14, 24));
    sentences.push(`${sentenceCase(pickWords(rng, take))}.`);
    left -= take;
  }
  return sentences.join(' ');
}

/** 4–6 bullets of 8–14 words. */
export function loremBullets(seed: string): string[] {
  const rng = makeRng(`${seed}:bullets`);
  const count = between(rng, 4, 6);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(sentenceCase(pickWords(rng, between(rng, 8, 14))));
  }
  return out;
}

const CONTEXT_TYPES: ContextItemType[] = ['article', 'video', 'link', 'pdf', 'image', 'quote'];
const SOURCES = ['Nature', 'DARPA', 'Lawfare', 'IEEE Spectrum', 'CSIS', 'The Economist', 'RAND'];

/** Three deterministic lorem context items; used until real ones are authored. */
export function loremContextItems(seed: string, count = 3): ContextItem[] {
  const rng = makeRng(`${seed}:context`);
  const items: ContextItem[] = [];
  for (let i = 0; i < count; i++) {
    const type = CONTEXT_TYPES[Math.floor(rng() * CONTEXT_TYPES.length)];
    const year = 2021 + Math.floor(rng() * 5);
    items.push({
      type,
      title: sentenceCase(pickWords(rng, between(rng, 5, 9))),
      source: SOURCES[Math.floor(rng() * SOURCES.length)],
      url: '',
      thumbnail: '',
      blurb: sentenceCase(pickWords(rng, between(rng, 12, 20))) + '.',
      date: String(year),
    });
  }
  return items;
}

/* ── image placeholders ─────────────────────────────── */

export type PlaceholderVariant = 'image' | 'logo' | 'headshot' | 'scene' | 'thumb';

export interface PlaceholderOptions {
  seed: string;
  sector?: SectorId | null;
  variant?: PlaceholderVariant;
  width?: number;
  height?: number;
  /** Two-or-three letter monogram drawn in the middle (logo/headshot). */
  label?: string;
}

function svgUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function monogram(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Inline SVG data URI in the node's sector color. No network calls, so the
 * site stays fully private and buildable offline.
 */
export function placeholderImage(opts: PlaceholderOptions): string {
  const { seed, sector = null, variant = 'image', label = '' } = opts;
  const w = opts.width ?? (variant === 'headshot' || variant === 'logo' ? 480 : 960);
  const h = opts.height ?? (variant === 'headshot' || variant === 'logo' ? 480 : 540);
  const rng = makeRng(`${seed}:img`);
  const c = sectorHex(sector);
  const uid = hashString(seed).toString(36);
  const a = Math.round(rng() * 100);
  const b = Math.round(rng() * 100);

  const grain = `
    <filter id="n${uid}">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${a}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
    </filter>`;

  const defs = `
    <defs>
      <radialGradient id="g${uid}" cx="${20 + a * 0.6}%" cy="${20 + b * 0.5}%" r="90%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.55"/>
        <stop offset="55%" stop-color="${c}" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="${GROUND_HEX}" stop-opacity="1"/>
      </radialGradient>
      ${grain}
    </defs>`;

  const ground = `<rect width="${w}" height="${h}" fill="${GROUND_HEX}"/>
    <rect width="${w}" height="${h}" fill="url(#g${uid})"/>`;

  let art = '';
  if (variant === 'headshot') {
    const cx = w / 2;
    art = `
      <circle cx="${cx}" cy="${h * 0.38}" r="${w * 0.15}" fill="${c}" opacity="0.35"/>
      <path d="M ${cx - w * 0.26} ${h} a ${w * 0.26} ${h * 0.3} 0 0 1 ${w * 0.52} 0 z"
            fill="${c}" opacity="0.28"/>`;
  } else if (variant === 'logo') {
    const m = monogram(label);
    art = `
      <circle cx="${w / 2}" cy="${h / 2}" r="${w * 0.3}" fill="none" stroke="${c}"
              stroke-width="${w * 0.012}" opacity="0.5"/>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
            font-family="Axiforma, sans-serif" font-weight="600" font-size="${w * 0.22}"
            fill="${c}" opacity="0.85">${m}</text>`;
  } else if (variant === 'scene') {
    const horizon = h * (0.55 + rng() * 0.12);
    art = `
      <path d="M0 ${horizon} L${w * 0.22} ${horizon - h * 0.18} L${w * 0.41} ${horizon}
               L${w * 0.63} ${horizon - h * 0.26} L${w * 0.84} ${horizon} L${w} ${horizon - h * 0.1}
               L${w} ${h} L0 ${h} Z" fill="${c}" opacity="0.16"/>
      <line x1="0" y1="${horizon}" x2="${w}" y2="${horizon}" stroke="${c}" stroke-width="1.4"
            opacity="0.45"/>`;
  } else {
    const bars = 5;
    let g = '';
    for (let i = 0; i < bars; i++) {
      const bw = w * (0.08 + rng() * 0.16);
      const bx = w * (0.06 + (i / bars) * 0.84);
      const bh = h * (0.12 + rng() * 0.4);
      g += `<rect x="${bx.toFixed(1)}" y="${(h - bh - h * 0.12).toFixed(1)}" width="${bw.toFixed(1)}"
            height="${bh.toFixed(1)}" rx="3" fill="${c}" opacity="${(0.1 + rng() * 0.18).toFixed(2)}"/>`;
    }
    art = g;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"
      viewBox="0 0 ${w} ${h}" role="img">
      ${defs}${ground}${art}
      <rect width="${w}" height="${h}" filter="url(#n${uid})" opacity="0.5"/>
    </svg>`;
  return svgUri(svg);
}

/** 16:9 video poster in the node's sector color. */
export function placeholderPoster(seed: string, sector?: SectorId | null): string {
  return placeholderImage({ seed, sector, variant: 'scene', width: 1280, height: 720 });
}

/** A deterministic set of gallery thumbs for a product with no gallery yet. */
export function placeholderGallery(seed: string, sector?: SectorId | null, count = 4): string[] {
  const rng = makeRng(`${seed}:gallery`);
  const n = count || 3 + Math.floor(rng() * 3);
  return Array.from({ length: n }, (_, i) =>
    placeholderImage({ seed: `${seed}:g${i}`, sector, variant: 'thumb', width: 480, height: 320 }),
  );
}
