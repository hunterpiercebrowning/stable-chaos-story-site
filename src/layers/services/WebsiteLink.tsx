import { Icon } from '../../components/Icon';
import type { ServiceNode } from '../../data/types';
import { cn } from '../../lib/cn';
import { track } from '../../lib/track';

export interface WebsiteLinkProps {
  node: ServiceNode;
  /** `chip` is the small corner link on the card; `button` is the focus-frame CTA. */
  variant?: 'chip' | 'button';
  className?: string;
}

/** "growthcurvebio.com" from "https://growthcurvebio.com/". */
function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}

/**
 * A company's website, opened in a new tab. Every click is tracked as an
 * `external_link` event so the admin can see which portfolio sites a viewer
 * went on to visit.
 */
export function WebsiteLink({ node, variant = 'chip', className }: WebsiteLinkProps) {
  const url = node.website;
  if (!url) return null;
  const host = displayHost(url);

  return (
    <a
      className={cn('services-link', `services-link--${variant}`, className)}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${node.title} website (opens in a new tab)`}
      onClick={(e) => {
        e.stopPropagation();
        track('external_link', { nodeId: node.id, url });
      }}
    >
      <span className="services-link-text">{variant === 'button' ? `Visit ${host}` : host}</span>
      <Icon name="external-link" size={variant === 'button' ? 15 : 12} />
    </a>
  );
}
