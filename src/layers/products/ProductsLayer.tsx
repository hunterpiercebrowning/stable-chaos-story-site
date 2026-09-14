import { useMemo, type CSSProperties } from 'react';
import { SECTOR_IDS, SECTOR_LABEL, type Node, type ProductNode, type SectorId } from '../../data/types';
import { useLayerState } from '../helpers';
import type { LayerViewProps } from '../types';
import { ProductsNode } from './ProductsNode';
import './products.css';

interface Band {
  sector: SectorId;
  /** The sector's summary node, if the content has one. */
  primary: ProductNode | undefined;
  nodes: ProductNode[];
  active: number;
  slated: number;
}

function buildBands(nodes: Node[]): Band[] {
  const products = nodes.filter((n): n is ProductNode => n.layerId === 'products');
  return SECTOR_IDS.map((sector) => {
    const mine = products.filter((n) => n.tier === 'secondary' && n.sector === sector);
    return {
      sector,
      primary: products.find((n) => n.tier === 'primary' && n.sector === sector),
      nodes: mine,
      active: mine.filter((n) => n.stage === 'active').length,
      slated: mine.filter((n) => n.stage === 'slated').length,
    };
  }).filter((b) => b.primary || b.nodes.length > 0);
}

/**
 * Two views over the same three sectors — SynBio, Security, Systems.
 * Expanded: a band per sector, a coloured header rule and a grid of product
 * cards; the band title opens the sector's summary node. Compressed: the
 * products fold away and the three sector summary cards stand alone, centred.
 */
export function ProductsLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const { isCollapsed } = useLayerState(layer);
  const bands = useMemo(() => buildBands(nodes), [nodes]);
  const primaries = bands.flatMap((b) => (b.primary ? [b.primary] : []));

  const products = bands.flatMap((b) => b.nodes);
  const productsCollapsed = products.length > 0 && products.every(isCollapsed);
  const showSummaries = productsCollapsed && primaries.length > 0;

  return (
    <div className="products-layer" data-collapsed={showSummaries ? 'true' : undefined}>
      {primaries.length > 0 ? (
        <div
          className="products-sectors"
          data-hidden={showSummaries ? undefined : 'true'}
          inert={!showSummaries}
          style={{ '--products-cols': primaries.length } as CSSProperties}
        >
          {primaries.map((primary) => (
            <ProductsNode
              key={primary.id}
              node={primary}
              collapsed={!showSummaries}
              active={primary.id === focusedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}

      <div
        className="products-bands"
        data-hidden={showSummaries ? 'true' : undefined}
        inert={showSummaries}
      >
        {bands.map((band) => (
          <section
            key={band.sector}
            className="products-band"
            data-sector={band.sector}
            aria-label={`${SECTOR_LABEL[band.sector]} products`}
          >
            <header className="products-band-head">
              {band.primary ? (
                <button
                  type="button"
                  className="products-band-title products-band-title--link"
                  aria-pressed={band.primary.id === focusedId}
                  onClick={() => onSelect(band.primary!)}
                >
                  {band.primary.title}
                </button>
              ) : (
                <span className="products-band-title">{SECTOR_LABEL[band.sector]}</span>
              )}
              <span className="products-band-rule" aria-hidden="true" />
              <span className="products-band-count">
                {band.nodes.length} {band.nodes.length === 1 ? 'product' : 'products'}
                <span className="products-band-count-sep">·</span>
                {band.active} active
                <span className="products-band-count-sep">·</span>
                {band.slated} slated
              </span>
            </header>

            <div className="products-grid">
              {band.nodes.map((node) => (
                <ProductsNode
                  key={node.id}
                  node={node}
                  collapsed={isCollapsed(node)}
                  active={node.id === focusedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
