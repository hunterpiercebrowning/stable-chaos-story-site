/** Event catalogue (build plan §6) and validation of the `/api/track` body. */

export const EVENT_TYPES = [
  'session_start',
  'heartbeat',
  'layer_view',
  'node_focus',
  'node_blur',
  'emphasis_change',
  'density_change',
  'search',
  'related_click',
  'context_item_open',
  'external_link',
  'video_play',
  'video_pause',
  'video_progress',
  'video_complete',
  'presentation_toggle',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

const TYPE_SET: ReadonlySet<string> = new Set(EVENT_TYPES);

export const MAX_BATCH = 50;
const MAX_PROPS_BYTES = 4096;
const MAX_ID_LEN = 128;
/** Reject timestamps more than a day in the past/future relative to the server. */
const TS_SKEW_MS = 24 * 60 * 60 * 1000;

export interface IncomingEvent {
  type: EventType;
  ts: number;
  layerId: string | null;
  nodeId: string | null;
  props: Record<string, unknown>;
}

export function isEventType(v: unknown): v is EventType {
  return typeof v === 'string' && TYPE_SET.has(v);
}

function idOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_ID_LEN ? v : null;
}

/** Normalise one client event; null when it cannot be accepted. */
export function normalizeEvent(raw: unknown, now = Date.now()): IncomingEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  // The client library calls the field `name`; the wire contract calls it `type`. Accept both.
  const type = r.type ?? r.name;
  if (!isEventType(type)) return null;

  let ts = typeof r.ts === 'number' && Number.isFinite(r.ts) ? Math.floor(r.ts) : now;
  if (Math.abs(ts - now) > TS_SKEW_MS) ts = now;

  const props: Record<string, unknown> =
    r.props && typeof r.props === 'object' && !Array.isArray(r.props) ? { ...(r.props as Record<string, unknown>) } : {};
  const layerId = idOrNull(r.layerId) ?? idOrNull(props.layerId);
  const nodeId = idOrNull(r.nodeId) ?? idOrNull(props.nodeId);

  // Keep props bounded so a hostile client cannot bloat the table.
  let serialized = JSON.stringify(props);
  if (serialized.length > MAX_PROPS_BYTES) {
    for (const k of Object.keys(props)) {
      if (typeof props[k] === 'string' && (props[k] as string).length > 256) props[k] = (props[k] as string).slice(0, 256);
    }
    serialized = JSON.stringify(props);
    if (serialized.length > MAX_PROPS_BYTES) return null;
  }

  return { type, ts, layerId, nodeId, props };
}

/** Parse a `/api/track` body: an array, or `{ events: [...] }`. Drops invalid entries. */
export function parseBatch(body: unknown, now = Date.now()): { events: IncomingEvent[]; dropped: number } | null {
  const list = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { events?: unknown }).events)
      ? ((body as { events: unknown[] }).events)
      : null;
  if (!list) return null;
  if (list.length > MAX_BATCH) return null;
  const events: IncomingEvent[] = [];
  let dropped = 0;
  for (const raw of list) {
    const ev = normalizeEvent(raw, now);
    if (ev) events.push(ev);
    else dropped++;
  }
  return { events, dropped };
}
