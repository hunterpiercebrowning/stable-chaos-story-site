import type { Ref } from 'react';
import { NodeCard } from '../../components/NodeCard';
import { Placeholder } from '../../components/Placeholder';
import { SectorTag } from '../../components/SectorTag';
import { getBackdrop, getChildCount, getCopy } from '../../data';
import type { Node, ServiceNode } from '../../data/types';
import { cn } from '../../lib/cn';
import type { NodeViewProps } from '../types';
import { WebsiteLink } from './WebsiteLink';
import './services.css';

export interface ServicesNodeProps extends NodeViewProps {
  /** Measured by the layer for the company → offering connectors. */
  ref?: Ref<HTMLDivElement>;
}

function isService(node: Node): node is ServiceNode {
  return node.layerId === 'services';
}

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
 * Services nodes. A company (primary) is the card plus a sibling external link
 * — anchors may not nest inside the card's `<button>` — and an offering
 * (secondary) is a compact card carrying its own sector tag. Under Compressed
 * the company cards stand alone, so they carry the tagline, the offering
 * count and a sector motif backdrop (revealed by services.css).
 */
export function ServicesNode({ node, collapsed, active, onSelect, ref }: ServicesNodeProps) {
  if (!isService(node)) return null;

  if (node.tier === 'primary') {
    const { tagline } = getCopy(node);
    const backdrop = getBackdrop(node);
    const offerings = getChildCount(node);
    return (
      <div
        ref={ref}
        className={cn('services-company', active && 'is-active')}
        data-sector={node.sector}
      >
        <NodeCard
          node={node}
          size="md"
          className="services-company-card"
          active={active}
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
            <span className="services-company-tagline">
              {tagline}
              {node.tagline ? null : <span className="sc-placeholder-tag services-company-ph">placeholder</span>}
            </span>
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

  return (
    <div
      ref={ref}
      className={cn('services-offering', collapsed && 'is-collapsed')}
      data-sector={node.sector}
    >
      <NodeCard
        node={node}
        size="sm"
        className="services-offering-card"
        collapsed={collapsed}
        active={active}
        onSelect={onSelect}
        subtitle=""
      />
    </div>
  );
}
