import { useNavigate } from 'react-router';
import { FocusFrame } from '../../components/FocusFrame';
import { SectorTag } from '../../components/SectorTag';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy, getNode } from '../../data';
import type { Node, ServiceNode } from '../../data/types';
import { track } from '../../lib/track';
import { GenericFocus } from '../GenericFocus';
import type { FocusViewProps } from '../types';
import { CompanyLogo } from './ServicesNode';
import { WebsiteLink } from './WebsiteLink';
import './services.css';

const isService = (node: Node): node is ServiceNode => node.layerId === 'services';

/**
 * Company focus: large logo, website button, blurb, bullets and video; the
 * related strip (from `getRelated`) surfaces its offerings, president and
 * sector. Offering focus: company eyebrow that jumps to the parent, blurb,
 * bullets and video.
 */
export function ServicesFocus({ node, onClose }: FocusViewProps) {
  const navigate = useNavigate();
  if (!isService(node)) return <GenericFocus node={node} onClose={onClose} />;

  const copy = getCopy(node);

  if (node.tier === 'primary') {
    return (
      <FocusFrame
        node={node}
        onClose={onClose}
        className="services-focus services-focus--company"
        media={
          <div className="services-focus-logo" data-sector={node.sector}>
            <CompanyLogo node={node} size="focus" />
          </div>
        }
        eyebrow={
          <span className="services-focus-eyebrow">
            Company
            <SectorTag sector={node.sector} />
          </span>
        }
        subtitle={copy.tagline}
        body={<p>{copy.blurb}</p>}
        bullets={copy.bullets}
        extras={
          <>
            <WebsiteLink node={node} variant="button" />
            <VideoPlayer node={node} />
          </>
        }
      />
    );
  }

  const company = getNode(node.company);

  return (
    <FocusFrame
      node={node}
      onClose={onClose}
      className="services-focus services-focus--offering"
      eyebrow={
        <span className="services-focus-eyebrow">
          {company ? (
            <button
              type="button"
              className="services-focus-company"
              onClick={() => {
                track('related_click', { fromNodeId: node.id, toNodeId: company.id });
                navigate(`/${company.layerId}/${company.id}`);
              }}
            >
              {isService(company) ? (
                <span className="services-focus-company-logo">
                  <CompanyLogo node={company} size="card" />
                </span>
              ) : null}
              {company.title}
            </button>
          ) : (
            'Offering'
          )}
          <SectorTag sector={node.sector} />
        </span>
      }
      subtitle={copy.tagline}
      body={<p>{copy.blurb}</p>}
      bullets={copy.bullets}
      extras={<VideoPlayer node={node} />}
    />
  );
}
