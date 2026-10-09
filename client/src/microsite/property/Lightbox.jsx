import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Expand } from '../../components/Icons.jsx';
import { EASE } from './motion.jsx';

/** A photo that opens the lightbox: zoom on hover, with an "open" action. */
export function PhotoTile({ src, alt, label, onOpen, className = '', style }) {
  return (
    <button type="button" onClick={onOpen} aria-label={`Open ${alt}`} className={`ms-tile ms-focus ${className}`} style={style}>
      <img src={src} alt={alt} loading="lazy" />
      <span className="ms-tile-veil" aria-hidden="true">
        <span className="text-xs font-semibold tracking-wide">{label}</span>
        <span className="ms-tile-action"><Expand style={{ width: 16, height: 16 }} /></span>
      </span>
    </button>
  );
}

/**
 * The one full-screen viewer for every photo section (gallery, masonry, floor
 * plan). `index` < 0 = closed. Arrow keys step, Escape closes, focus moves to
 * the close button on open and returns to the page on close.
 */
export default function Lightbox({ images, index, onIndex, onClose, title = '' }) {
  const open = index >= 0 && index < images.length;
  const closeRef = useRef(null);
  // Sections are their own stacking contexts, so the viewer is portaled up to
  // the microsite root (found from a marker left where the section renders it)
  // to sit above the navbar and every other section.
  const [host, setHost] = useState(null);
  const count = images.length;

  useEffect(() => {
    if (!open) return undefined;
    const doc = closeRef.current?.ownerDocument || document;
    const previous = doc.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && count > 1) onIndex((index + 1) % count);
      else if (e.key === 'ArrowLeft' && count > 1) onIndex((index - 1 + count) % count);
    };
    doc.addEventListener('keydown', onKey);
    const overflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    return () => {
      doc.removeEventListener('keydown', onKey);
      doc.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, index, count, onClose, onIndex]);

  const marker = <span hidden ref={(node) => { if (node && !host) setHost(node.closest('.msb')); }} />;
  if (!host) return marker;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-modal="true" aria-label={`${title} photos`.trim()}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="ms-lightbox fixed inset-0 z-[130] flex flex-col"
          onClick={onClose}
        >
          <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-medium tabular-nums opacity-80">
              {String(index + 1).padStart(2, '0')} <span className="opacity-50">/ {String(count).padStart(2, '0')}</span>
            </span>
            <button ref={closeRef} type="button" className="ms-lightbox-btn ms-focus" onClick={onClose} aria-label="Close photos">
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 sm:px-20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={images[index]}
                src={images[index]} alt={`${title} photo ${index + 1}`.trim()}
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: EASE }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full object-contain shadow-2xl"
                style={{ borderRadius: 'var(--ms-radius)' }}
              />
            </AnimatePresence>
            {count > 1 && (
              <>
                <button type="button" className="ms-lightbox-btn ms-focus absolute left-3 sm:left-5" aria-label="Previous photo"
                        onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + count) % count); }}>
                  <ChevronLeft style={{ width: 22, height: 22 }} />
                </button>
                <button type="button" className="ms-lightbox-btn ms-focus absolute right-3 sm:right-5" aria-label="Next photo"
                        onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % count); }}>
                  <ChevronRight style={{ width: 22, height: 22 }} />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="ms-noscrollbar flex justify-start gap-2 overflow-x-auto px-4 py-4 sm:justify-center" onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                <button key={src + i} type="button" className="ms-thumb ms-focus" aria-label={`Show photo ${i + 1}`} aria-current={i === index} onClick={() => onIndex(i)}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    host
  );
}
