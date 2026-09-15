import { useState } from 'react';
import { FocusFrame } from '../../components/FocusFrame';
import { Icon } from '../../components/Icon';
import { SectorTag } from '../../components/SectorTag';
import { StageTag } from '../../components/StageTag';
import { VideoPlayer } from '../../components/VideoPlayer';
import { getCopy, placeholderGallery, placeholderImage } from '../../data';
import { cn } from '../../lib/cn';
import type { FocusViewProps } from '../types';
import { ProductsGallery } from './ProductsGallery';
import { ProductsLightbox } from './ProductsLightbox';
import { CategoryMix } from './ProductsNode';
import { getSectorProductStats } from './productStats';
import { CATEGORY_ICON } from './categoryIcon';
import './products.css';

/**
 * Product focus: the environment photo (or a generated scene) fills the whole
 * focus area; the text sits on a glass panel over it. Extras carry the video
 * placeholder and the gallery strip; the gallery's lightbox takes over the
 * same area the expanded video uses.
 *
 * A sector summary (primary) uses the same scene and panel with the sector's
 * product counts and category mix in place of the stage and gallery; its
 * products are listed by the related strip.
 */
export function ProductsFocus({ node, onClose }: FocusViewProps) {
  // Keyed by node id so an open lightbox never carries across to a sibling.
  const [lb, setLb] = useState<{ id: string; index: number } | null>(null);
  const lightbox = lb && lb.id === node.id ? lb.index : null;
  const setLightbox = (index: number | null) =>
    setLb(index === null ? null : { id: node.id, index });

  if (node.layerId !== 'products') return null;

  const copy = getCopy(node);
  const sector = node.sector;
  const slated = node.stage === 'slated';

  const hasScene = node.backgroundImage.length > 0;
  const scene = hasScene
    ? node.backgroundImage
    : placeholderImage({ seed: `${node.id}:scene`, sector, variant: 'scene', width: 1600, height: 900 });

  const sceneLayer = (
    <div className="products-focus-scene" aria-hidden="true">
      <img className="products-focus-scene-img" src={scene} alt="" />
      <span className="products-focus-scene-scrim" />
      {hasScene ? null : <span className="sc-placeholder-tag">placeholder</span>}
    </div>
  );

  if (node.tier === 'primary') {
    const stats = getSectorProductStats(node);
    return (
      <div className="products-focus products-focus--sector" data-sector={sector}>
        {sceneLayer}
        <FocusFrame
          node={node}
          onClose={onClose}
          className="products-focus-frame"
          eyebrow={
            <span className="products-focus-eyebrow">
              <span className="products-focus-category">Products</span>
              <SectorTag sector={sector} />
              <span className="products-focus-stats">
                {stats.total} {stats.total === 1 ? 'product' : 'products'} · {stats.active} active ·{' '}
                {stats.slated} slated
              </span>
            </span>
          }
          subtitle={copy.tagline}
          body={<p>{copy.blurb}</p>}
          bullets={copy.bullets}
          extras={
            <>
              <VideoPlayer node={node} />
              <CategoryMix stats={stats} className="products-mix--focus" />
            </>
          }
        />
      </div>
    );
  }

  const hasGallery = node.gallery.length > 0;
  const gallery = hasGallery ? node.gallery : placeholderGallery(node.id, sector, 0);

  const eyebrow = (
    <span className="products-focus-eyebrow">
      {node.category ? (
        <span className="products-focus-category">
          <Icon name={CATEGORY_ICON[node.category]} size={15} />
          {node.category}
        </span>
      ) : null}
      <SectorTag sector={sector} />
      {node.stage ? <StageTag stage={node.stage} /> : null}
    </span>
  );

  return (
    <div
      className={cn('products-focus', slated && 'products-focus--slated')}
      data-sector={sector}
      data-stage={node.stage}
    >
      {sceneLayer}

      <FocusFrame
        node={node}
        onClose={onClose}
        className="products-focus-frame"
        eyebrow={eyebrow}
        subtitle={copy.tagline}
        body={
          <>
            {slated ? (
              <p className="products-focus-slated">
                Slated: this product is not yet in market. Details are directional.
              </p>
            ) : null}
            <p>{copy.blurb}</p>
          </>
        }
        bullets={copy.bullets}
        extras={
          <>
            <VideoPlayer node={node} />
            <ProductsGallery images={gallery} placeholder={!hasGallery} onOpen={setLightbox} />
          </>
        }
      />

      <ProductsLightbox
        images={gallery}
        index={lightbox}
        title={node.title}
        sector={sector}
        placeholder={!hasGallery}
        onChange={setLightbox}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
