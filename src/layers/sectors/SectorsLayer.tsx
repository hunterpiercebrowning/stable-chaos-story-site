import { useEffect, useMemo } from 'react';
import { ConnectorLayer, type Connection } from '../../components/ConnectorLayer';
import { nodeSectors } from '../../data';
import type { Node, SectorId } from '../../data/types';
import { cn } from '../../lib/cn';
import { useRects } from '../../lib/measure';
import { useUi } from '../../store/ui';
import { useLayerState } from '../helpers';
import type { LayerViewProps } from '../types';
import { SectorsNode } from './SectorsNode';
import './sectors.css';

/**
 * Domain lattice columns. Sectors sit across the top in three equal bands;
 * the domain grid beneath has five columns — one under each sector plus two
 * narrower "gutter" columns that straddle the sector boundaries, where the
 * dual-sector domains sit between their two parents.
 *
 *   1 synbio · 2 synbio+security · 3 security · 4 security+systems · 5 systems
 *
 * Synbio+systems (Cloud Lab) has no adjacent boundary; it takes the left gutter
 * and its connector to Systems arcs across.
 */
const LANE_COLUMN: Record<string, number> = {
  synbio: 1,
  'synbio+security': 2,
  'synbio+systems': 2,
  security: 3,
  'security+systems': 4,
  systems: 5,
};

const SECTOR_ORDER: SectorId[] = ['synbio', 'security', 'systems'];

function laneOf(node: Node): string {
  const sectors = [...nodeSectors(node)].sort(
    (a, b) => SECTOR_ORDER.indexOf(a) - SECTOR_ORDER.indexOf(b),
  );
  return sectors.join('+') || 'systems';
}

interface Placed {
  node: Node;
  column: number;
  row: number;
}

function placeDomains(domains: Node[]): Placed[] {
  const depth = new Map<number, number>();
  return domains.map((node) => {
    const column = LANE_COLUMN[laneOf(node)] ?? 3;
    const row = (depth.get(column) ?? 0) + 1;
    depth.set(column, row);
    return { node, column, row };
  });
}

/** Re-measure timings after a UI change: now, mid-animation, and after `--dur-slow`. */
const REMEASURE_AT = [0, 200, 420, 720];

export function SectorsLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const { isCollapsed } = useLayerState(layer);
  const { containerRef, register, rects, measure } = useRects();

  const density = useUi((s) => s.density);
  const leftOpen = useUi((s) => s.leftOpen);
  const rightOpen = useUi((s) => s.rightOpen);

  const sectors = useMemo(
    () =>
      nodes
        .filter((n) => n.tier === 'primary')
        .sort((a, b) => {
          const sa = nodeSectors(a)[0];
          const sb = nodeSectors(b)[0];
          return SECTOR_ORDER.indexOf(sa) - SECTOR_ORDER.indexOf(sb);
        }),
    [nodes],
  );
  const domains = useMemo(() => placeDomains(nodes.filter((n) => n.tier === 'secondary')), [nodes]);
  const sectorById = useMemo(
    () => new Map(sectors.map((s) => [nodeSectors(s)[0], s] as const)),
    [sectors],
  );

  const domainsCollapsed = domains.length > 0 && domains.every((d) => isCollapsed(d.node));

  // ResizeObserver covers resize and the panel width animation (the board's
  // size changes). Density changes can move cards without resizing the board,
  // so re-measure explicitly across the animation window.
  useEffect(() => {
    const timers = REMEASURE_AT.map((ms) => window.setTimeout(measure, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [measure, density, leftOpen, rightOpen]);

  // One curve per (domain, related sector), in that sector's color. Under
  // Compressed the paths stay mounted and the whole SVG fades out with the cards
  // (see sectors.css), so collapsing does not pop the lines away a frame early.
  const connections: Connection[] = [];
  {
    for (const { node } of domains) {
      for (const sector of nodeSectors(node)) {
        const sectorNode = sectorById.get(sector);
        if (!sectorNode) continue;
        connections.push({
          id: `${node.id}->${sector}`,
          from: sectorNode.id,
          to: node.id,
          sector,
        });
      }
    }
  }

  return (
    <div className="sectors-layer" data-density={density}>
      <div className="sectors-board" ref={containerRef}>
        <ConnectorLayer
          connections={connections}
          rects={rects}
          className={cn('sectors-connectors', domainsCollapsed && 'sectors-connectors--hidden')}
        />

        <div className="sectors-row" role="group" aria-label="Sectors">
          {sectors.map((node) => (
            <SectorsNode
              key={node.id}
              ref={register(node.id)}
              node={node}
              active={node.id === focusedId}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div
          className="sectors-domains"
          role="group"
          aria-label="Domains"
          data-collapsed={domainsCollapsed ? 'true' : undefined}
          aria-hidden={domainsCollapsed || undefined}
        >
          {domains.map(({ node, column, row }) => (
            <div
              key={node.id}
              className="sectors-cell"
              data-lane={laneOf(node)}
              style={{ gridColumn: column, gridRow: row }}
            >
              <SectorsNode
                ref={register(node.id)}
                node={node}
                collapsed={isCollapsed(node)}
                active={node.id === focusedId}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
