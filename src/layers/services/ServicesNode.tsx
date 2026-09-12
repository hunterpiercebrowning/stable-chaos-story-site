import type { Ref } from 'react';
import { NodeCard } from '../../components/NodeCard';
import { Placeholder } from '../../components/Placeholder';
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

/** Company logo from the normalized `logoFile`; Triangulum has none and gets a placeholder. */
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
 * (secondary) is a compact card carrying its own sector tag.
 */
export function ServicesNode({ node, dimmed, collapsed, active, onSelect, ref }: ServicesNodeProps) {
  if (!isService(node)) return null;

  if (node.tier === 'primary') {
    return (
      <div
        ref={ref}
        className={cn('services-company', dimmed && 'is-dimmed', active && 'is-active')}
        data-sector={node.sector}
      >
        <NodeCard
          node={node}
          size="md"
          className="services-company-card"
          dimmed={dimmed}
          active={active}
          onSelect={onSelect}
          media={
            <span className="services-logo-tile">
              <CompanyLogo node={node} size="card" />
            </span>
          }
          subtitle=""
        />
        <WebsiteLink node={node} variant="chip" className="services-company-link" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn('services-offering', dimmed && 'is-dimmed', collapsed && 'is-collapsed')}
      data-sector={node.sector}
    >
      <NodeCard
        node={node}
        size="sm"
        className="services-offering-card"
        dimmed={dimmed}
        collapsed={collapsed}
        active={active}
        onSelect={onSelect}
        subtitle=""
      />
    </div>
  );
}
