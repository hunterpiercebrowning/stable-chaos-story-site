import { useCallback, useEffect, useRef, useState } from 'react';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RectMap = Record<string, Rect>;

export interface UseRects {
  /** Put this on the positioned wrapper that also hosts the ConnectorLayer. */
  containerRef: (el: HTMLElement | null) => void;
  /** Ref callback factory: `ref={register(node.id)}`. */
  register: (key: string) => (el: HTMLElement | null) => void;
  /** Rects of every registered element, in container-relative coordinates. */
  rects: RectMap;
  /** Force a re-measure (panel animations, density changes, …). */
  measure: () => void;
}

/**
 * Measures registered elements relative to a container and keeps the rects in
 * sync with resizes. Used by `ConnectorLayer` to draw curves between nodes.
 */
export function useRects(): UseRects {
  const containerEl = useRef<HTMLElement | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  const [rects, setRects] = useState<RectMap>({});
  const frame = useRef(0);

  const measure = useCallback(() => {
    const container = containerEl.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const next: RectMap = {};
    for (const [key, el] of elements.current) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      next[key] = { x: r.x - base.x, y: r.y - base.y, width: r.width, height: r.height };
    }
    setRects((prev) => (shallowEqualRects(prev, next) ? prev : next));
  }, []);

  const schedule = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  const observer = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => schedule());
    observer.current = ro;
    if (containerEl.current) ro.observe(containerEl.current);
    for (const el of elements.current.values()) ro.observe(el);
    schedule();
    return () => {
      ro.disconnect();
      observer.current = null;
    };
  }, [schedule]);

  const containerRef = useCallback(
    (el: HTMLElement | null) => {
      const ro = observer.current;
      if (containerEl.current && ro) ro.unobserve(containerEl.current);
      containerEl.current = el;
      if (el && ro) ro.observe(el);
      schedule();
    },
    [schedule],
  );

  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      const ro = observer.current;
      const prev = elements.current.get(key);
      if (prev && ro) ro.unobserve(prev);
      if (el) {
        elements.current.set(key, el);
        ro?.observe(el);
      } else {
        elements.current.delete(key);
      }
      schedule();
    },
    [schedule],
  );

  useEffect(() => {
    const onResize = () => schedule();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame.current);
    };
  }, [schedule]);

  return { containerRef, register, rects, measure: schedule };
}

function shallowEqualRects(a: RectMap, b: RectMap): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const x = a[k];
    const y = b[k];
    if (!y || x.x !== y.x || x.y !== y.y || x.width !== y.width || x.height !== y.height) {
      return false;
    }
  }
  return true;
}
