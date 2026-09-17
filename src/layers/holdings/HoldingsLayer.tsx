import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '../../components/Icon';
import {
  isProduct,
  isService,
  SECTOR_IDS,
  SECTOR_LABEL,
  type HoldingKind,
  type Node,
  type ProductNode,
  type SectorId,
  type ServiceNode,
} from '../../data/types';
import { HOLDINGS_EXAMPLES_CLICKABLE } from '../../lib/flags';
import { useLayerState } from '../helpers';
import type { LayerViewProps } from '../types';
import { CompanyLogo, ServicesNode } from '../services/ServicesNode';
import { ProductsNode } from '../products/ProductsNode';
import './holdings.css';

/** Company order within a sector: SynBio, NatSec, Systems, then content order. */
const COMPANY_ORDER = ['growth-curve-bio', 'fountain-city-partners'];

interface Band {
  sector: SectorId;
  /** The sector's product summary node, if the content has one. */
  primary: ProductNode | undefined;
  /** Service companies in this sector; their offerings lead the grid. */
  companies: ServiceNode[];
  offerings: ServiceNode[];
  products: ProductNode[];
  active: number;
  slated: number;
}

function buildBands(nodes: Node[]): Band[] {
  const services = nodes.filter(isService);
  const products = nodes.filter(isProduct);
  const rank = (id: string) => {
    const i = COMPANY_ORDER.indexOf(id);
    return i === -1 ? COMPANY_ORDER.length : i;
  };
  return SECTOR_IDS.map((sector) => {
    const companies = services
      .filter((n) => n.tier === 'primary' && n.sector === sector)
      .sort((a, b) => rank(a.id) - rank(b.id) || a.order - b.order);
    const companyIds = new Set(companies.map((c) => c.id));
    // Offerings follow their company's order, then content order.
    const offerings = companies.flatMap((c) =>
      services.filter((n) => n.tier === 'secondary' && n.company === c.id),
    );
    // An offering whose company is missing still belongs to its sector.
    const orphans = services.filter(
      (n) => n.tier === 'secondary' && n.sector === sector && !(n.company && companyIds.has(n.company)),
    );
    const mine = products.filter((n) => n.tier === 'secondary' && n.sector === sector);
    return {
      sector,
      primary: products.find((n) => n.tier === 'primary' && n.sector === sector),
      companies,
      offerings: [...offerings, ...orphans],
      products: mine,
      active: mine.filter((n) => n.stage === 'active').length,
      slated: mine.filter((n) => n.stage === 'slated').length,
    };
  }).filter((b) => b.primary || b.companies.length > 0 || b.offerings.length > 0 || b.products.length > 0);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Stands in for `onSelect` on a card that must not open. */
const noSelect = () => {};

interface GroupProps {
  kind: HoldingKind;
  icon: IconName;
  title: string;
  summary: string;
  count: number;
  children: ReactNode;
}

/** One labelled row of hero cards on the Overview: the companies, then the sector summaries. */
function OverviewGroup({ kind, icon, title, summary, count, children }: GroupProps) {
  return (
    <section
      className="holdings-group"
      data-kind={kind}
      aria-label={title}
      style={{ '--holdings-cols': count } as CSSProperties}
    >
      <header className="holdings-group-head">
        <span className="holdings-group-title">
          <Icon name={icon} size={13} />
          {title}
        </span>
        <span className="holdings-group-rule" aria-hidden="true" />
        <span className="holdings-group-summary">{summary}</span>
      </header>
      <div className="holdings-group-grid">{children}</div>
    </section>
  );
}

/**
 * Our Holdings: the service companies and the products, one layer.
 *
 * Overview (Compressed): two labelled rows of hero cards, the companies
 * above the sector product summaries, each row tagged by kind.
 *
 * Examples (Expanded): the product layout, a band per sector with a coloured
 * rule and a grid of cards; the band title opens the sector's product
 * summary and a chip beside it opens each company in that sector. The
 * company's offerings lead the grid, styled apart, and the products follow.
 */
export function HoldingsLayer({ layer, nodes, focusedId, onSelect }: LayerViewProps) {
  const { isCollapsed } = useLayerState(layer);
  const bands = useMemo(() => buildBands(nodes), [nodes]);

  const companies = bands.flatMap((b) => b.companies);
  const primaries = bands.flatMap((b) => (b.primary ? [b.primary] : []));
  const secondaries = bands.flatMap((b) => [...b.offerings, ...b.products]);
  const heroes = companies.length + primaries.length;

  const examplesCollapsed = secondaries.length > 0 && secondaries.every(isCollapsed);
  const showOverview = examplesCollapsed && heroes > 0;

  // The Examples cards open nothing while HOLDINGS_EXAMPLES_CLICKABLE is off;
  // they keep their hover and focus styling, so the band reads unchanged.
  const selectExample = HOLDINGS_EXAMPLES_CLICKABLE ? onSelect : noSelect;

  const offeringCount = bands.reduce((n, b) => n + b.offerings.length, 0);
  const productCount = bands.reduce((n, b) => n + b.products.length, 0);

  return (
    <div className="holdings-layer" data-collapsed={showOverview ? 'true' : undefined}>
      {heroes > 0 ? (
        <div
          className="holdings-overview"
          data-hidden={showOverview ? undefined : 'true'}
          inert={!showOverview}
        >
          {companies.length > 0 ? (
            <OverviewGroup
              kind="service"
              icon="briefcase"
              title="Services"
              summary={`${plural(companies.length, 'company', 'companies')} · ${plural(offeringCount, 'offering')}`}
              count={companies.length}
            >
              {companies.map((company) => (
                <ServicesNode
                  key={company.id}
                  node={company}
                  collapsed={!showOverview}
                  active={company.id === focusedId}
                  onSelect={onSelect}
                />
              ))}
            </OverviewGroup>
          ) : null}

          {primaries.length > 0 ? (
            <OverviewGroup
              kind="product"
              icon="box"
              title="Products"
              summary={`${plural(primaries.length, 'sector')} · ${plural(productCount, 'product')}`}
              count={primaries.length}
            >
              {primaries.map((primary) => (
                <ProductsNode
                  key={primary.id}
                  node={primary}
                  collapsed={!showOverview}
                  active={primary.id === focusedId}
                  onSelect={onSelect}
                />
              ))}
            </OverviewGroup>
          ) : null}
        </div>
      ) : null}

      <div
        className="products-bands"
        data-hidden={showOverview ? 'true' : undefined}
        // Drops the pointer cursor on the Examples cards while they open
        // nothing; holdings.css keeps the hover lift.
        data-locked={HOLDINGS_EXAMPLES_CLICKABLE ? undefined : 'true'}
        inert={showOverview}
      >
        {bands.map((band) => (
          <section
            key={band.sector}
            className="products-band"
            data-sector={band.sector}
            aria-label={`${SECTOR_LABEL[band.sector]} holdings`}
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

              {band.companies.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  className="holdings-band-company"
                  aria-pressed={company.id === focusedId}
                  onClick={() => onSelect(company)}
                >
                  <span className="holdings-band-company-logo">
                    <CompanyLogo node={company} size="card" />
                  </span>
                  {company.title}
                </button>
              ))}

              <span className="products-band-rule" aria-hidden="true" />
              <span className="products-band-count">
                {band.offerings.length > 0 ? (
                  <>
                    {plural(band.offerings.length, 'service')}
                    <span className="products-band-count-sep">·</span>
                  </>
                ) : null}
                {plural(band.products.length, 'product')}
                <span className="products-band-count-sep">·</span>
                {band.active} active
                <span className="products-band-count-sep">·</span>
                {band.slated} slated
              </span>
            </header>

            <div className="products-grid">
              {band.offerings.map((node) => (
                <ServicesNode
                  key={node.id}
                  node={node}
                  collapsed={isCollapsed(node)}
                  active={node.id === focusedId}
                  onSelect={selectExample}
                />
              ))}
              {band.products.map((node) => (
                <ProductsNode
                  key={node.id}
                  node={node}
                  collapsed={isCollapsed(node)}
                  active={node.id === focusedId}
                  onSelect={selectExample}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
