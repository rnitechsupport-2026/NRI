import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from '../../../components/Icons.jsx';
import { toneStyle, headingFontClass } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

const COL_CLASS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' };

export default function Gallery({ property: p, data = {}, settings = {}, theme }) {
  const images = (p.images?.length ? p.images.map((i) => i.url) : (p.cover_image ? [p.cover_image] : []));
  const [open, setOpen] = useState(-1);
  if (!images.length) return null;
  const tone = settings.tone || 'light';
  const cols = COL_CLASS[settings.columns] || COL_CLASS[3];
  const radius = settings.imageRadius === false ? '0px' : 'var(--ms-radius)';

  return (
    <section id="ms-gallery" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'Gallery'}</h2>
        </FadeIn>
        <div className={`grid grid-cols-2 gap-3 ${cols}`}>
          {images.map((src, i) => (
            <FadeIn key={i} delay={Math.min(i * 0.05, 0.4)}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group relative block aspect-[4/3] w-full overflow-hidden"
                style={{ borderRadius: radius }}
              >
                <motion.img
                  src={src} alt={`${p.title} photo ${i + 1}`} loading="lazy"
                  className="h-full w-full object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                />
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
              </button>
              {settings.showCaptions && <div className="mt-1 text-xs opacity-60">Photo {i + 1}</div>}
            </FadeIn>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open >= 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6"
            onClick={() => setOpen(-1)}
          >
            <button type="button" className="absolute right-5 top-5 text-white/80 hover:text-white" onClick={() => setOpen(-1)}>
              <X style={{ width: 26, height: 26 }} />
            </button>
            {images.length > 1 && (
              <>
                <button type="button" className="absolute left-4 text-white/70 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); setOpen((o) => (o - 1 + images.length) % images.length); }}>
                  <ChevronLeft style={{ width: 34, height: 34 }} />
                </button>
                <button type="button" className="absolute right-4 text-white/70 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); setOpen((o) => (o + 1) % images.length); }}>
                  <ChevronRight style={{ width: 34, height: 34 }} />
                </button>
              </>
            )}
            <motion.img
              key={open}
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              src={images[open]} alt="" onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] rounded object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
