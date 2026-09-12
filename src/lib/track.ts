/**
 * Client-side event tracking.
 *
 * Public surface: `track(name, props)` and `flush()`. Everything else here is
 * the transport: events are batched and posted to `POST /api/track` as a JSON
 * array of `{ type, ts, layerId?, nodeId?, props }` via `navigator.sendBeacon`
 * (falling back to `fetch` with `keepalive`).
 *
 * - flush every 5s, at 20 queued events, and when the tab is hidden/unloaded
 * - `heartbeat` every 30s while the tab is visible, carrying the current
 *   layer/node from `setContextGetter()` (the shell must call it — see the
 *   WS8 handoff note)
 * - one `session_start` per page load with device class, viewport, a
 *   fingerprint-lite hash (UA + screen + tz + lang), tz, lang and referrer
 *
 * Tracking is inert on `/gate` and `/admin*` (no investor session there) and
 * outside the browser (tests, SSR).
 */

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export interface TrackedEvent {
  name: string;
  ts: number;
  props: TrackProps;
}

/** Wire shape accepted by `POST /api/track`. */
export interface WireEvent {
  type: string;
  ts: number;
  layerId?: string;
  nodeId?: string;
  props: TrackProps;
}

export interface TrackContext {
  layerId?: string;
  nodeId?: string;
}

const MAX_QUEUE = 50;
const FLUSH_AT = 20;
const FLUSH_EVERY_MS = 5_000;
const HEARTBEAT_EVERY_MS = 30_000;
const ENDPOINT = '/api/track';

const queue: TrackedEvent[] = [];
const isDev = Boolean(import.meta.env?.DEV);
const inBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

let getContext: () => TrackContext = () => ({});

/**
 * Tell the tracker where the visitor is. The shell should call this once with
 * a getter that reads the current route, e.g.
 * `setContextGetter(() => ({ layerId, nodeId }))`. Heartbeats carry the result.
 */
export function setContextGetter(fn: () => TrackContext): void {
  getContext = fn;
}

export function toWire(e: TrackedEvent): WireEvent {
  const wire: WireEvent = { type: e.name, ts: e.ts, props: e.props };
  const layerId = e.props.layerId;
  const nodeId = e.props.nodeId;
  if (typeof layerId === 'string') wire.layerId = layerId;
  if (typeof nodeId === 'string') wire.nodeId = nodeId;
  return wire;
}

/** Default transport: sendBeacon (text/plain so it never preflights), else fetch keepalive. */
function beaconTransport(events: TrackedEvent[]): boolean {
  const body = JSON.stringify(events.map(toWire));
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }))) return true;
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

let send: (events: TrackedEvent[]) => boolean = inBrowser ? beaconTransport : () => true;

/** Swap the transport (tests, or a future non-beacon sink). Return false to keep events queued. */
export function setTransport(fn: (events: TrackedEvent[]) => boolean): void {
  send = fn;
}

export function track(name: string, props: TrackProps = {}): void {
  const event: TrackedEvent = { name, ts: Date.now(), props };
  queue.push(event);
  if (isDev) console.debug('[track]', name, props);
  if (queue.length >= FLUSH_AT) flush();
}

export function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0, Math.min(queue.length, MAX_QUEUE));
  if (!send(batch)) queue.unshift(...batch);
  if (queue.length >= MAX_QUEUE) flush();
}

/** Test/debug helper — the pending queue. */
export function pending(): readonly TrackedEvent[] {
  return queue;
}

// ---- session_start helpers ---------------------------------------------------

export function deviceClassFromUa(ua: string): 'desktop' | 'mobile' | 'tablet' {
  const s = ua.toLowerCase();
  if (/ipad|tablet|kindle|silk|playbook/.test(s)) return 'tablet';
  if (/android/.test(s) && !/mobile/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|windows phone|blackberry|opera mini/.test(s)) return 'mobile';
  return 'desktop';
}

function fallbackHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** SHA-256 (first 32 hex chars) of UA + screen + tz + lang; djb2 when SubtleCrypto is unavailable. */
export async function fingerprintLite(parts: string[]): Promise<string> {
  const input = parts.join('|');
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    }
  } catch {
    /* insecure context — fall through */
  }
  return fallbackHash(input);
}

function isTrackablePath(pathname: string): boolean {
  return !(pathname === '/gate' || pathname === '/admin' || pathname.startsWith('/admin/'));
}

async function sendSessionStart(): Promise<void> {
  const ua = navigator.userAgent ?? '';
  const screenSig = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    /* ignore */
  }
  const lang = navigator.language ?? '';
  const fingerprint = await fingerprintLite([ua, screenSig, tz, lang]);
  track('session_start', {
    deviceClass: deviceClassFromUa(ua),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    fingerprint,
    tz,
    lang,
    referrer: document.referrer ? document.referrer.slice(0, 512) : '',
  });
  flush();
}

let started = false;

/** Idempotent: wires timers + listeners and sends `session_start`. Runs on import in the browser. */
export function startTracking(): void {
  if (started || !inBrowser) return;
  if (!isTrackablePath(window.location.pathname)) return;
  started = true;

  void sendSessionStart();

  window.setInterval(flush, FLUSH_EVERY_MS);
  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const ctx = getContext();
    track('heartbeat', { layerId: ctx.layerId ?? null, nodeId: ctx.nodeId ?? null });
  }, HEARTBEAT_EVERY_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}

startTracking();
