import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Icon } from '../../components/Icon';
import type { SectorId } from '../../data/types';
import { cn } from '../../lib/cn';
import { useUi } from '../../store/ui';
import './products.css';

export interface ProductsLightboxProps {
  images: string[];
  /** Index of the open image, or `null` when closed. */
  index: number | null;
  title: string;
  sector: SectorId | null;
  placeholder: boolean;
  onChange: (index: number) => void;
  onClose: () => void;
}

/**
 * Gallery lightbox. Takes over the whole product focus area (the same region
 * the expanded video uses). ← → step, Esc closes; keys are captured on window
 * and stopped so the global keyboard map and the Stage's own Esc handler never
 * see them while the lightbox is open.
 */
export function ProductsLightbox({
  images,
  index,
  title,
  sector,
  placeholder,
  onChange,
  onClose,
}: ProductsLightboxProps) {
  const reduced = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = index !== null && images.length > 0;
  const count = images.length;

  const step = (delta: number) => {
    if (index === null || count === 0) return;
    onChange((index + delta + count) % count);
  };

  // The global key map (mounted before this listener, also in the capture
  // phase) must stand down while the lightbox owns ← → Esc.
  const setModalOpen = useUi((s) => s.setModalOpen);
  useEffect(() => {
    if (!open) return;
    setModalOpen(true);
    return () => setModalOpen(false);
  }, [open, setModalOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.stopPropagation();
          e.preventDefault();
          onClose();
          break;
        case 'ArrowLeft':
          e.stopPropagation();
          e.preventDefault();
          step(-1);
          break;
        case 'ArrowRight':
          e.stopPropagation();
          e.preventDefault();
          step(1);
          break;
        case 'Home':
          e.stopPropagation();
          e.preventDefault();
          onChange(0);
          break;
        case 'End':
          e.stopPropagation();
          e.preventDefault();
          onChange(count - 1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // `step` closes over index/count, both in the dep list via `index`/`count`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, count, onClose, onChange]);

  // Move focus into the dialog on open; give it back to the thumb on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previous?.focus?.();
    };
  }, [open]);

  const fade = reduced ? { duration: 0 } : { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] as const };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={dialogRef}
          className="products-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} gallery, image ${index + 1} of ${count}`}
          tabIndex={-1}
          data-sector={sector ?? undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          onClick={(e) => {
            // Click on the scrim (not the image or controls) closes.
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <img
            className="products-lightbox-backdrop"
            src={images[index]}
            alt=""
            aria-hidden="true"
          />

          <div className="products-lightbox-top">
            <span className="sc-label products-lightbox-title">{title}</span>
            <span className="products-lightbox-counter">
              {index + 1} / {count}
            </span>
          </div>

          <button
            type="button"
            className="products-lightbox-close"
            onClick={onClose}
            aria-label="Close gallery"
          >
            <Icon name="close" size={18} />
          </button>

          {count > 1 ? (
            <button
              type="button"
              className="products-lightbox-arrow products-lightbox-arrow--prev"
              onClick={() => step(-1)}
              aria-label="Previous image"
            >
              <Icon name="arrow-left" size={20} />
            </button>
          ) : null}

          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={index}
              className="products-lightbox-figure"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.985 }}
              transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <img className="products-lightbox-img" src={images[index]} alt="" />
              {placeholder ? <span className="sc-placeholder-tag">placeholder</span> : null}
            </motion.figure>
          </AnimatePresence>

          {count > 1 ? (
            <button
              type="button"
              className="products-lightbox-arrow products-lightbox-arrow--next"
              onClick={() => step(1)}
              aria-label="Next image"
            >
              <Icon name="arrow-right" size={20} />
            </button>
          ) : null}

          {count > 1 ? (
            <div className="products-lightbox-dots" role="tablist" aria-label="Gallery images">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className={cn('products-lightbox-dot', i === index && 'is-current')}
                  onClick={() => onChange(i)}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
