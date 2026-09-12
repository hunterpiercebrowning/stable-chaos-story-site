/**
 * Client-side event tracking.
 *
 * WS0 queues events in memory and logs them in dev. WS8 replaces the transport
 * (`send()`) with a batched `navigator.sendBeacon('/api/track', …)` — the
 * public surface (`track`, `flush`) must not change.
 */

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export interface TrackedEvent {
  name: string;
  ts: number;
  props: TrackProps;
}

const MAX_QUEUE = 50;
const queue: TrackedEvent[] = [];

const isDev = Boolean(import.meta.env?.DEV);

/** Replaced by WS8. Returning false keeps the event queued. */
let send: (events: TrackedEvent[]) => boolean = () => true;

export function setTransport(fn: (events: TrackedEvent[]) => boolean): void {
  send = fn;
}

export function track(name: string, props: TrackProps = {}): void {
  const event: TrackedEvent = { name, ts: Date.now(), props };
  queue.push(event);
  if (isDev) console.debug('[track]', name, props);
  if (queue.length >= MAX_QUEUE) flush();
}

export function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  if (!send(batch)) queue.unshift(...batch);
}

/** Test/debug helper — the pending queue. */
export function pending(): readonly TrackedEvent[] {
  return queue;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
