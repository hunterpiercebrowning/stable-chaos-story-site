import { getLayer, getNode } from '../data';
import type { AdminEvent } from './api';

/* ── time ─────────────────────────────────────────────── */

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const DATE_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const TIME_S = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function fmtDate(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return (sameYear ? DATE : DATE_YEAR).format(d);
}

export function fmtDateTime(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return '—';
  return `${fmtDate(ms, now)} · ${TIME.format(new Date(ms))}`;
}

export function fmtTime(ms: number, seconds = false): string {
  return (seconds ? TIME_S : TIME).format(new Date(ms));
}

/** "just now", "4m ago", "3h ago", "2d ago", else a date. */
export function fmtAgo(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return 'never';
  const diff = now - ms;
  if (diff < 45_000) return 'just now';
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(diff / 3_600_000);
  if (h < 36) return `${h}h ago`;
  const d = Math.round(diff / 86_400_000);
  if (d < 14) return `${d}d ago`;
  return fmtDate(ms, now);
}

/** "in 3d", "in 5h", "expired 2d ago" style for expiry columns. */
export function fmtUntil(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return 'never';
  const diff = ms - now;
  if (diff <= 0) return fmtAgo(ms, now);
  const h = Math.round(diff / 3_600_000);
  if (h < 36) return `in ${Math.max(1, h)}h`;
  const d = Math.round(diff / 86_400_000);
  return `in ${d}d`;
}

/** 42s · 3m 10s · 1h 04m */
export function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms < 1000) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, '0')}m`;
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/* ── user agents ──────────────────────────────────────── */

/** "Chrome 128 · macOS" from a raw UA string. */
export function shortUa(ua: string): string {
  if (!ua) return 'Unknown browser';
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Linux/.test(ua)
              ? 'Linux'
              : '';
  let browser = '';
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Edg\/(\d+)/))) browser = `Edge ${m[1]}`;
  else if ((m = ua.match(/OPR\/(\d+)/))) browser = `Opera ${m[1]}`;
  else if ((m = ua.match(/Firefox\/(\d+)/))) browser = `Firefox ${m[1]}`;
  else if ((m = ua.match(/Chrome\/(\d+)/))) browser = `Chrome ${m[1]}`;
  else if ((m = ua.match(/Version\/(\d+).*Safari/))) browser = `Safari ${m[1]}`;
  else if (/Safari/.test(ua)) browser = 'Safari';
  else browser = ua.split(' ')[0] ?? 'Browser';
  return os ? `${browser} · ${os}` : browser;
}

export function fmtLocation(s: { country: string | null; region: string | null; city: string | null }): string {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown location';
}

/* ── ids → titles ─────────────────────────────────────── */

export function nodeTitle(id: string | null | undefined): string {
  if (!id) return '';
  return getNode(id)?.title ?? id;
}

export function layerTitle(id: string | null | undefined): string {
  if (!id) return '';
  return getLayer(id)?.title ?? id;
}

export function nodeLayerTitle(id: string | null | undefined): string {
  const node = getNode(id ?? undefined);
  return node ? layerTitle(node.layerId) : '';
}

const VALUE_LABEL: Record<string, string> = {
  all: 'All',
  synbio: 'SynBio',
  security: 'Security',
  systems: 'Systems',
  compressed: 'Overview',
  expanded: 'Examples',
};

function labelFor(v: unknown): string {
  const s = String(v ?? '');
  return VALUE_LABEL[s] ?? s;
}

function host(url: unknown): string {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, '');
  } catch {
    return String(url ?? '');
  }
}

/* ── event → sentence ─────────────────────────────────── */

export type EventTone = 'default' | 'muted' | 'accent' | 'video';

export interface DescribedEvent {
  text: string;
  /** Secondary detail after the " · ". */
  detail?: string;
  tone: EventTone;
  /** The node the event is about, when there is one (for linking). */
  nodeId?: string;
}

const NUM = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function describeEvent(e: AdminEvent): DescribedEvent {
  const p = e.props;
  const nodeId = (typeof p.nodeId === 'string' && p.nodeId) || e.nodeId || undefined;
  const node = nodeTitle(nodeId);
  const pct = NUM(p.pct);
  switch (e.type) {
    case 'session_start':
      return {
        text: 'Session started',
        detail: [p.deviceClass, p.viewport].filter(Boolean).join(' · ') || undefined,
        tone: 'accent',
      };
    case 'heartbeat':
      return {
        text: 'Heartbeat',
        detail: node ? `on ${node}` : layerTitle((p.layerId as string) ?? e.layerId) || undefined,
        tone: 'muted',
      };
    case 'layer_view':
      return {
        text: `Viewed ${layerTitle((p.layerId as string) ?? e.layerId) || 'a layer'}`,
        detail: p.via ? `via ${String(p.via)}` : undefined,
        tone: 'default',
      };
    case 'node_focus':
      return { text: `Focused ${node}`, detail: p.via ? `via ${String(p.via)}` : undefined, tone: 'default', nodeId };
    case 'node_blur':
      return { text: `Left ${node}`, detail: `after ${fmtDuration(NUM(p.dwellMs))}`, tone: 'default', nodeId };
    case 'emphasis_change':
      return { text: `Emphasis → ${labelFor(p.value)}`, tone: 'default' };
    case 'density_change':
      return { text: `Density → ${labelFor(p.value)}`, tone: 'default' };
    case 'search': {
      const n = NUM(p.resultCount);
      return {
        text: `Searched '${String(p.q ?? '')}'`,
        detail: n === null ? undefined : `${n} result${n === 1 ? '' : 's'}`,
        tone: 'default',
      };
    }
    case 'related_click':
      return {
        text: `Related: ${nodeTitle(String(p.fromNodeId ?? ''))} → ${nodeTitle(String(p.toNodeId ?? ''))}`,
        tone: 'default',
        nodeId: typeof p.toNodeId === 'string' ? p.toNodeId : nodeId,
      };
    case 'context_item_open': {
      const title = typeof p.title === 'string' && p.title ? p.title : null;
      const what = title ?? [p.itemType, host(p.url)].filter(Boolean).join(' · ');
      return { text: `Opened context item: ${what}`, detail: node ? `on ${node}` : undefined, tone: 'default', nodeId };
    }
    case 'external_link':
      return { text: `Opened external link`, detail: host(p.url), tone: 'default', nodeId };
    case 'video_play':
      return { text: `Played ${node} video`, detail: pct ? `${pct}%` : undefined, tone: 'video', nodeId };
    case 'video_pause':
      return { text: `Paused ${node} video`, detail: pct !== null ? `${pct}%` : undefined, tone: 'video', nodeId };
    case 'video_progress':
      return { text: `${node} video`, detail: pct !== null ? `${pct}%` : undefined, tone: 'video', nodeId };
    case 'video_complete':
      return { text: `Completed ${node} video`, detail: '100%', tone: 'video', nodeId };
    case 'presentation_toggle':
      return { text: `Presentation mode ${p.on ? 'on' : 'off'}`, tone: 'default' };
    default: {
      const extra = Object.entries(p)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' ');
      return { text: e.type, detail: extra || undefined, tone: 'muted' };
    }
  }
}
