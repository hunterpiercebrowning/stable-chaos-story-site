import { useEffect, useMemo, type CSSProperties } from 'react';
import { ConnectorLayer, type Connection } from '../../components/ConnectorLayer';
import type { Node, ServiceNode } from '../../data/types';
import { cn } from '../../lib/cn';
import { useRects } from '../../lib/measure';
import { useUi } from '../../store/ui';
import { useLayerState } from '../helpers';
import type { LayerViewProps } from '../types';
import { ServicesNode } from './ServicesNode';
import './services.css';

/**
 * Company order across the top: SynBio, SynBio, Security, Systems — a single
 * colour sweep left to right. Companies not listed here (none today) follow
 * in content order.
 */
const COMPANY_ORDER = [
  'growth-curve-bio',
  'triangulum-bio',
  'starling-intel',
  'fountain-city-partners',
];

const isService = (node: Node): node is ServiceNode => node.layerId === 'services';

interface Column {
  company: ServiceNode;
  offerings: ServiceNode[];
}

function buildColumns(nodes: Node[]): { columns: Column[]; orphans: ServiceNode[] } {
  const services = nodes.filter(isService);
  const rank = (id: string) => {
    const i = COMPANY_ORDER.indexOf(id);
    return i === -1 ? COMPANY_ORDER.length : i;
  };
  const companies = services
    .filter((n) => n.tier === 'primary')
    .sort((a, b) => rank(a.id) - rank(b.id) || a.order - b.order);

  const columns: Column[] = companies.map((company) => ({ company, offerings: [] }));
  const byCompany = new Map(columns.map((c) => [c.company.id, c]));
  const orphans: ServiceNode[] = [];
  for (const n of services) {
    if (n.tier !== 'secondary') continue;
    const col = n.company ? byCompany.get(n.company) : undefined;
    if (col) col.offerings.push(n);
    else orphans.push(n);
  }
  return { columns, orphans };
}

/**
 * Services: four company cards across the top, their offerings in columns
 * beneath, joined by connectors in the company's sector colour. Emphasis dims
 * by sector (never hides); Compressed density folds the offerings away.
 */
export function ServicesLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const { isDimmed, isCollapsed } = useLayerState(layer);
  const { columns, orphans } = useMemo(() => buildColumns(nodes), [nodes]);
  const { containerRef, register, rects, measure } = useRects();

  const offeringsCollapsed =
    columns.some((c) => c.offerings.length > 0) &&
    columns.every((c) => c.offerings.every(isCollapsed));

  // The container's ResizeObserver catches most layout changes; these settle
  // the measurement after the panel / density / emphasis animations finish.
  const density = useUi((s) => s.density);
  const emphasis = useUi((s) => s.emphasis);
  const leftOpen = useUi((s) => s.leftOpen);
  const rightOpen = useUi((s) => s.rightOpen);
  const presentation = useUi((s) => s.presentation);
  useEffect(() => {
    measure();
    const t1 = window.setTimeout(measure, 360);
    const t2 = window.setTimeout(measure, 700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [measure, density, emphasis, leftOpen, rightOpen, presentation]);

  const connections: Connection[] = columns.flatMap(({ company, offerings }) =>
    offerings.map((offering) => ({
      id: `${company.id}->${offering.id}`,
      from: company.id,
      to: offering.id,
      sector: company.sector,
      dimmed: isDimmed(company) || isDimmed(offering),
    })),
  );

  const gridStyle = { '--services-cols': columns.length } as CSSProperties;

  return (
    <div className="services-layer sc-scroll">
      <div
        className="services-canvas"
        ref={containerRef}
        onTransitionEnd={() => measure()}
        style={gridStyle}
        data-collapsed={offeringsCollapsed ? 'true' : undefined}
      >
        <ConnectorLayer
          connections={connections}
          rects={rects}
          className={cn('services-connectors', offeringsCollapsed && 'is-collapsed')}
        />

        <div className="services-grid services-grid--companies">
          {columns.map(({ company }) => (
            <ServicesNode
              key={company.id}
              ref={register(company.id)}
              node={company}
              dimmed={isDimmed(company)}
              active={company.id === focusedId}
              onSelect={onSelect}
            />
          ))}
        </div>

        <div
          className="services-offerings"
          data-collapsed={offeringsCollapsed ? 'true' : undefined}
          inert={offeringsCollapsed}
        >
          <div className="services-grid services-grid--offerings">
            {columns.map(({ company, offerings }) => (
              <div className="services-column" key={company.id} data-sector={company.sector}>
                {offerings.map((offering) => (
                  <ServicesNode
                    key={offering.id}
                    ref={register(offering.id)}
                    node={offering}
                    dimmed={isDimmed(offering)}
                    collapsed={isCollapsed(offering)}
                    active={offering.id === focusedId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            ))}
          </div>

          {orphans.length > 0 ? (
            <div className="services-grid services-grid--orphans">
              {orphans.map((offering) => (
                <ServicesNode
                  key={offering.id}
                  node={offering}
                  dimmed={isDimmed(offering)}
                  collapsed={isCollapsed(offering)}
                  active={offering.id === focusedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
