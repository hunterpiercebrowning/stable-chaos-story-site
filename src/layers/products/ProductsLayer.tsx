import { SECTOR_IDS, SECTOR_LABEL, type Node, type ProductNode, type SectorId } from '../../data/types';
import type { LayerViewProps } from '../types';
import { ProductsNode } from './ProductsNode';
import './products.css';

interface Band {
  sector: SectorId;
  nodes: ProductNode[];
  active: number;
  slated: number;
}

function buildBands(nodes: Node[]): Band[] {
  return SECTOR_IDS.map((sector) => {
    const mine = nodes.filter(
      (n): n is ProductNode => n.layerId === 'products' && n.sector === sector,
    );
    return {
      sector,
      nodes: mine,
      active: mine.filter((n) => n.stage === 'active').length,
      slated: mine.filter((n) => n.stage === 'slated').length,
    };
  }).filter((b) => b.nodes.length > 0);
}

/**
 * Three sector bands — SynBio, Security, Systems — each with a coloured header
 * rule and a grid of product cards. Products has no density.
 */
export function ProductsLayer({ nodes, focusedId, onSelect }: LayerViewProps) {
  const bands = buildBands(nodes);

  return (
    <div className="products-layer">
      {bands.map((band) => {
        return (
          <section
            key={band.sector}
            className="products-band"
            data-sector={band.sector}
            aria-label={`${SECTOR_LABEL[band.sector]} products`}
          >
            <header className="products-band-head">
              <span className="products-band-title">{SECTOR_LABEL[band.sector]}</span>
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
                  active={node.id === focusedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
