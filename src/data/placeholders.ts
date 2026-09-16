import type { SectorId } from './types';

/**
 * Deterministic placeholder art. Everything here is seeded by the node id, so
 * a given node always shows the same generated image: no flicker between
 * renders and stable screenshots. Missing copy is left blank rather than
 * filled with stand-in text.
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

/* ── sector motifs ──────────────────────────────────── */

function helixArt(w: number, h: number, c: string): string {
  const mid = h * 0.52;
  const amp = h * 0.2;
  const k = (Math.PI * 2) / (w * 0.36);
  const a: string[] = [];
  const b: string[] = [];
  let rungs = '';
  for (let x = 0; x <= w; x += 6) {
    const y1 = mid + amp * Math.sin(k * x);
    const y2 = mid + amp * Math.sin(k * x + Math.PI);
    a.push(`${x},${y1.toFixed(1)}`);
    b.push(`${x},${y2.toFixed(1)}`);
    if (x % 30 === 0) {
      const o = (0.2 + 0.5 * Math.abs(Math.cos(k * x))).toFixed(2);
      rungs += `<line x1="${x}" y1="${y1.toFixed(1)}" x2="${x}" y2="${y2.toFixed(1)}"
        stroke="${c}" stroke-width="1.2" opacity="${o}"/>`;
    }
  }
  return `${rungs}
    <polyline points="${a.join(' ')}" fill="none" stroke="${c}" stroke-width="2" opacity="0.9"/>
    <polyline points="${b.join(' ')}" fill="none" stroke="${c}" stroke-width="2" opacity="0.5"/>`;
}

function radarArt(w: number, h: number, c: string): string {
  const cx = w * 0.8;
  const cy = h * 0.96;
  let arcs = '';
  for (let r = 50, i = 0; r < w * 0.72; r += 48, i++) {
    const dash = i % 2 ? ' stroke-dasharray="6 10"' : '';
    arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}"
      stroke-width="${i % 3 === 0 ? 1.8 : 1}" opacity="${(0.8 - i * 0.07).toFixed(2)}"${dash}/>`;
  }
  const sweep = `<line x1="${cx}" y1="${cy}" x2="${(cx - w * 0.62).toFixed(1)}"
    y2="${(cy - h * 0.58).toFixed(1)}" stroke="${c}" stroke-width="1.4" opacity="0.7"/>`;
  const s = h * 0.17;
  const sx = w * 0.3;
  const sy = h * 0.4;
  const shield = `<path d="M ${sx} ${sy - s} L ${sx + s * 0.85} ${sy - s * 0.65} L ${sx + s * 0.85} ${sy + s * 0.1}
    Q ${sx + s * 0.85} ${sy + s * 0.75} ${sx} ${sy + s * 1.05}
    Q ${sx - s * 0.85} ${sy + s * 0.75} ${sx - s * 0.85} ${sy + s * 0.1} L ${sx - s * 0.85} ${sy - s * 0.65} Z"
    fill="none" stroke="${c}" stroke-width="1.8" opacity="0.85"/>`;
  return arcs + sweep + shield;
}

function blockArt(w: number, h: number, c: string): string {
  const bw = 88;
  const bh = 46;
  const r = 7;
  // Block centres. The flow runs left to right: intake → two parallel stages
  // → merge → decision → two outputs, with a dashed return loop underneath.
  // The right two thirds carry the detail: the CSS masks fade the left edge out.
  const B = {
    intake: [92, h * 0.5],
    stageA: [232, h * 0.28],
    stageB: [232, h * 0.72],
    merge: [372, h * 0.5],
    outA: [w - 84, h * 0.24],
    outB: [w - 84, h * 0.76],
  } as const;
  const D: [number, number] = [468, h * 0.5];
  const ds = 22;

  const block = ([x, y]: readonly [number, number], hub = false) => {
    const x0 = (x - bw / 2).toFixed(1);
    const y0 = (y - bh / 2).toFixed(1);
    const l1 = `<line x1="${(x - bw / 2 + 14).toFixed(1)}" y1="${(y - 6).toFixed(1)}" x2="${(x + bw / 2 - 26).toFixed(1)}" y2="${(y - 6).toFixed(1)}" stroke="${c}" stroke-width="1.6" opacity="0.55"/>`;
    const l2 = `<line x1="${(x - bw / 2 + 14).toFixed(1)}" y1="${(y + 6).toFixed(1)}" x2="${(x + bw / 2 - 40).toFixed(1)}" y2="${(y + 6).toFixed(1)}" stroke="${c}" stroke-width="1.6" opacity="0.35"/>`;
    return `<rect x="${x0}" y="${y0}" width="${bw}" height="${bh}" rx="${r}" fill="${c}" fill-opacity="${hub ? 0.14 : 0.07}"
      stroke="${c}" stroke-width="${hub ? 2 : 1.4}" opacity="${hub ? 0.95 : 0.8}"/>${l1}${l2}`;
  };
  const port = (x: number, y: number) =>
    `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${c}" opacity="0.9"/>`;
  // Orthogonal connector: out of the right edge of `a`, elbow at the midpoint, into the left edge of `b`.
  const link = (a: readonly [number, number], b: readonly [number, number], dashed = false, aw = bw, bwid = bw) => {
    const x1 = a[0] + aw / 2;
    const x2 = b[0] - bwid / 2;
    const mx = (x1 + x2) / 2;
    return `<path d="M ${x1.toFixed(1)} ${a[1].toFixed(1)} H ${mx.toFixed(1)} V ${b[1].toFixed(1)} H ${(x2 - 5).toFixed(1)}"
      fill="none" stroke="${c}" stroke-width="1.4" opacity="0.7" stroke-linejoin="round"${dashed ? ' stroke-dasharray="5 6"' : ''} marker-end="url(#ah)"/>`;
  };

  const diamond = `<path d="M ${D[0]} ${D[1] - ds} L ${D[0] + ds} ${D[1]} L ${D[0]} ${D[1] + ds} L ${D[0] - ds} ${D[1]} Z"
    fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-width="1.6" opacity="0.85" stroke-linejoin="round"/>`;

  // The return loop: out of the bottom output, down and back along the floor, up into the intake.
  const floor = h * 0.94;
  const loop = `<path d="M ${B.outB[0]} ${(B.outB[1] + bh / 2).toFixed(1)} V ${floor.toFixed(1)} H ${B.intake[0]} V ${(B.intake[1] + bh / 2 + 5).toFixed(1)}"
    fill="none" stroke="${c}" stroke-width="1.2" opacity="0.45" stroke-dasharray="4 7" stroke-linejoin="round" marker-end="url(#ah)"/>`;

  const defs = `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${c}"/></marker></defs>`;

  return (
    defs +
    link(B.intake, B.stageA) +
    link(B.intake, B.stageB) +
    link(B.stageA, B.merge) +
    link(B.stageB, B.merge) +
    link(B.merge, D, false, bw, ds * 2) +
    link(D, B.outA, false, ds * 2, bw) +
    link(D, B.outB, true, ds * 2, bw) +
    loop +
    block(B.intake) +
    block(B.stageA) +
    block(B.stageB) +
    block(B.merge, true) +
    diamond +
    block(B.outA, true) +
    block(B.outB) +
    port(B.intake[0] + bw / 2, B.intake[1]) +
    port(B.merge[0] - bw / 2, B.merge[1]) +
    port(B.merge[0] + bw / 2, B.merge[1]) +
    port(B.outA[0] - bw / 2, B.outA[1]) +
    port(B.outB[0] - bw / 2, B.outB[1])
  );
}

/**
 * Transparent line art for the sector bands and company cards under Compressed
 * density: a double helix for SynBio, radar arcs and a shield for Security, a
 * block-diagram workflow for Systems (and for anything without a sector). Drawn
 * in the sector colour; the CSS sets the opacity and the fade.
 */
/** `_seed` is kept for callers: every sector's motif is now a fixed drawing, so it is unused. */
export function placeholderMotif(sector: SectorId | null, _seed = 'motif'): string {
  const w = 640;
  const h = 360;
  const c = sectorHex(sector);
  const art =
    sector === 'synbio' ? helixArt(w, h, c) : sector === 'security' ? radarArt(w, h, c) : blockArt(w, h, c);
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${art}</svg>`,
  );
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
