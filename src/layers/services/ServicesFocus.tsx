import { useNavigate } from 'react-router';
import { FocusFrame } from '../../components/FocusFrame';
import { SectorTag } from '../../components/SectorTag';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy, getNode } from '../../data';
import type { Node, ServiceNode } from '../../data/types';
import { cn } from '../../lib/cn';
import { track } from '../../lib/track';
import { useUi } from '../../store/ui';
import { GenericFocus } from '../GenericFocus';
import type { FocusViewProps } from '../types';
import { CompanyLogo } from './ServicesNode';
import { WebsiteLink } from './WebsiteLink';
import './services.css';

const isService = (node: Node): node is ServiceNode => node.layerId === 'services';

/**
 * Company focus: large logo, website button, blurb, bullets and video.
 * Offering focus: company eyebrow that jumps to the parent, blurb,
 * bullets and video, over the offering's scene photo when it has one.
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
  const scene = node.backgroundImage ?? '';

  // With a scene the offering focus mirrors the products layer: the photo
  // fills the focus area and the glass panel sits over it, left-aligned.
  const frame = (
    <FocusFrame
      node={node}
      onClose={onClose}
      className={cn('services-focus services-focus--offering', scene && 'services-focus-frame')}
      eyebrow={
        <span className="services-focus-eyebrow">
          {company ? (
            <button
              type="button"
              className="services-focus-company"
              onClick={() => {
                track('related_click', { fromNodeId: node.id, toNodeId: company.id });
                const path = `/${company.layerId}/${company.id}`;
                useUi.getState().setNavIntent('related', path);
                navigate(path);
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

  if (!scene) return frame;
  return (
    <div className="services-focus-stage" data-sector={node.sector}>
      <div className="services-focus-scene" aria-hidden="true">
        <img className="services-focus-scene-img" src={scene} alt="" />
        <span className="services-focus-scene-scrim" />
      </div>
      {frame}
    </div>
  );
}
