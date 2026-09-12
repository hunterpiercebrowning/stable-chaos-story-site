import { Icon } from '../../components/Icon';
import './products.css';

export interface ProductsGalleryProps {
  images: string[];
  /** True when `images` are generated placeholders. */
  placeholder: boolean;
  onOpen: (index: number) => void;
}

/** 3–5 thumbnail strip under the focus body; each thumb opens the lightbox. */
export function ProductsGallery({ images, placeholder, onOpen }: ProductsGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="products-gallery">
      <div className="products-gallery-head">
        <span className="sc-label">Gallery</span>
        <span className="products-gallery-count">{images.length}</span>
      </div>
      <div className="products-gallery-strip" role="list">
        {images.map((src, i) => (
          <button
            key={`${i}:${src.slice(0, 40)}`}
            type="button"
            role="listitem"
            className="products-thumb"
            data-gallery-index={i}
            onClick={() => onOpen(i)}
            aria-label={`Open image ${i + 1} of ${images.length}`}
          >
            <img className="products-thumb-img" src={src} alt="" loading="lazy" />
            <span className="products-thumb-zoom" aria-hidden="true">
              <Icon name="expand" size={14} />
            </span>
            {placeholder ? <span className="sc-placeholder-tag">placeholder</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
