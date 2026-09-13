import type { Rect, RectMap } from '../lib/measure';
import type { SectorId } from '../data/types';
import './connector-layer.css';

export interface Connection {
  id: string;
  /** Keys into the rect map produced by `useRects()`. */
  from: string;
  to: string;
  /** Sector color for the curve; falls back to a neutral stroke. */
  sector?: SectorId;
}

export interface ConnectorLayerProps {
  connections: Connection[];
  rects: RectMap;
  className?: string;
}

function anchor(rect: Rect, side: 'top' | 'bottom') {
  return { x: rect.x + rect.width / 2, y: side === 'top' ? rect.y : rect.y + rect.height };
}

/**
 * SVG overlay drawing vertical bezier curves between measured node rects.
 * Absolutely positioned, `pointer-events: none`; the parent must be relative
 * and share the coordinate space used by `useRects()`.
 */
export function ConnectorLayer({ connections, rects, className }: ConnectorLayerProps) {
  const paths = connections
    .map((c) => {
      const a = rects[c.from];
      const b = rects[c.to];
      if (!a || !b) return null;
      // Always draw from the upper rect's bottom to the lower rect's top.
      const upperFirst = a.y <= b.y;
      const start = anchor(upperFirst ? a : b, 'bottom');
      const end = anchor(upperFirst ? b : a, 'top');
      const dy = Math.max(24, (end.y - start.y) * 0.5);
      const d = `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x} ${end.y - dy}, ${end.x} ${end.y}`;
      return { ...c, d };
    })
    .filter((p): p is Connection & { d: string } => p !== null);

  return (
    <svg className={`connector-layer ${className ?? ''}`} aria-hidden="true">
      {paths.map((p) => (
        <path
          key={p.id}
          className="connector"
          d={p.d}
          data-sector={p.sector}
        />
      ))}
    </svg>
  );
}
