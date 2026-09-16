import { NodeCard } from '../../components/NodeCard';
import { Placeholder } from '../../components/Placeholder';
import { SectorTag } from '../../components/SectorTag';
import { getBackdrop, getChildCount, getCopy, getNode } from '../../data';
import { isService, type ServiceNode } from '../../data/types';
import { cn } from '../../lib/cn';
import type { NodeViewProps } from '../types';
import { WebsiteLink } from './WebsiteLink';
import './services.css';

/** Company logo from the normalized `logoFile`; a company without one gets a placeholder. */
export function CompanyLogo({ node, size }: { node: ServiceNode; size: 'card' | 'focus' }) {
  if (node.logoFile) {
    return <img className={`services-logo services-logo--${size}`} src={node.logoFile} alt="" />;
  }
  return (
    <Placeholder
      seed={node.id}
      variant="logo"
      sector={node.sector}
      label={node.title}
      className={`services-logo services-logo--${size}`}
      // The dev-only "placeholder" tag does not fit in a 40px tile; the focus view shows it.
      bare={size === 'card'}
    />
  );
}

/**
 * Service nodes on the Our Holdings layer. A company (primary) is the Overview
 * hero card: sector motif backdrop, logo tile, tagline, offering count and a
 * sibling external link (anchors may not nest inside the card's `<button>`).
 * The Overview's "Services" divider names the kind, so the card carries no
 * kind tag of its own.
 * An offering (secondary) is a grid card that sits ahead of the products in
 * its sector band: the parent company's logo where a product shows its
 * category icon, the company name as the subtitle, a "Service" tag, and the
 * offering's scene photo revealed on hover / focus.
 */
export function ServicesNode({ node, collapsed, active, onSelect }: NodeViewProps) {
  if (!isService(node)) return null;

  if (node.tier === 'primary') {
    const { tagline } = getCopy(node);
    const backdrop = getBackdrop(node);
    const offerings = getChildCount(node);
    return (
      <div className={cn('services-company', active && 'is-active')} data-sector={node.sector}>
        <NodeCard
          node={node}
          size="md"
          className="services-company-card"
          collapsed={collapsed}
          active={active}
          // A hidden card should not be the origin of the grow-into-focus transition.
          layoutId={collapsed ? null : undefined}
          onSelect={onSelect}
        >
          <span
            className="services-company-backdrop"
            style={{ backgroundImage: `url("${backdrop.src}")` }}
            aria-hidden="true"
          />
          <span className="node-card-media">
            <span className="services-logo-tile">
              <CompanyLogo node={node} size="card" />
            </span>
          </span>
          <span className="node-card-body">
            <span className="node-card-title">{node.title}</span>
            {tagline ? <span className="services-company-tagline">{tagline}</span> : null}
          </span>
          <span className="node-card-tags">
            <SectorTag sector={node.sector} />
            {offerings > 0 ? (
              <span className="services-company-meta">
                {offerings} {offerings === 1 ? 'offering' : 'offerings'}
              </span>
            ) : null}
          </span>
        </NodeCard>
        <WebsiteLink node={node} variant="chip" className="services-company-link" />
      </div>
    );
  }

  const company = getNode(node.company);
  return (
    <NodeCard
      node={node}
      size="md"
      className="services-offering-card"
      collapsed={collapsed}
      active={active}
      onSelect={onSelect}
      backdrop={
        node.backgroundImage ? (
          <span
            className="services-offering-backdrop"
            style={{ backgroundImage: `url("${node.backgroundImage}")` }}
            aria-hidden="true"
          />
        ) : null
      }
      media={
        company && isService(company) ? (
          <span className="services-offering-logo" title={company.title}>
            <CompanyLogo node={company} size="card" />
          </span>
        ) : null
      }
      subtitle={company?.title ?? 'Offering'}
    />
  );
}
