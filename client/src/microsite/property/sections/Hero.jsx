import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Shield, Cube, ChevronLeft, ChevronRight, ArrowRight, Phone } from '../../../components/Icons.jsx';
import { priceLabel, money, area, titleCase, PURPOSE_LABEL, TYPE_LABEL } from '../../../utils/format.js';
import ThemedButton from '../ThemedButton.jsx';
import { priceDisplay } from '../theme.js';
import { heroSlides } from '../media.js';
import { EASE } from '../motion.jsx';

const AUTOPLAY_MS = 5000;

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.11, delayChildren: 0.35 } } };
const rise = { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } };
const pop = { hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE } } };

/** The few facts worth reading at a glance over the photo — only the ones
 *  this listing actually has. */
function keyDetails(p) {
  if (p.entity_type === 'project') {
    return [
      p.configuration && ['Configuration', p.configuration],
      p.total_units && ['Units', `${p.total_units}`],
      (p.min_area && p.max_area) && ['Area', `${p.min_area}–${p.max_area} sqft`],
    ].filter(Boolean);
  }
  return [
    p.bhk && ['Bedrooms', `${p.bhk} BHK`],
    p.built_up_area && ['Built-up', area(p.built_up_area, p.area_unit)],
    p.furnishing && ['Furnishing', titleCase(p.furnishing).replace('-', ' ')],
    p.possession && ['Possession', titleCase(p.possession).replace(/-/g, ' ')],
  ].filter(Boolean);
}

// A long listing title must not fill the whole screen at display size.
function titleSize(text) {
  const n = String(text || '').length;
  if (n > 70) return 'clamp(1.7rem, 1.1rem + 2.6vw, 3rem)';
  if (n > 38) return 'clamp(2.1rem, 1.2rem + 4vw, 4.25rem)';
  return 'clamp(2.6rem, 1.2rem + 6.4vw, 6.25rem)';
}

export default function Hero({ anchorId = 'ms-hero', property: p, data = {}, settings = {} }) {
  const slides = heroSlides(p, settings);
  const overlay = settings.overlay ?? 0.5;
  const left = settings.alignment === 'left';
  const tall = settings.height === 'tall';
  const price = priceDisplay(p, priceLabel, money);
  const address = [p.locality, p.city].filter(Boolean).join(', ');
  const details = keyDetails(p);
  const title = data.title || p.title;

  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false); // visitor prefers reduced motion
  const many = slides.length > 1;

  // Parallax: the photo drifts down a little slower than the page, the text a little faster.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const mediaY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);
  const contentFade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  function goTo(i) {
    const el = trackRef.current;
    if (!el) return;
    const next = (i + slides.length) % slides.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: still ? 'auto' : 'smooth' });
  }

  // The track is a real horizontal scroller (swipe / trackpad / arrows all
  // work), so the active slide follows its scroll position rather than a
  // separate index that could drift out of sync with what's on screen.
  function onScroll(e) {
    const el = e.currentTarget;
    setActive(Math.round(el.scrollLeft / (el.clientWidth || 1)));
  }

  useEffect(() => {
    setStill(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!many || paused || still) return undefined;
    const t = setTimeout(() => goTo(active + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, many, still, slides.length]);

  const scrim = `color-mix(in srgb, var(--ms-shade) ${Math.round(overlay * 100)}%, transparent)`;
  // the middle of the photo keeps a light veil so the title never sits on bare highlights
  const veil = `color-mix(in srgb, var(--ms-shade) ${Math.round(overlay * 42)}%, transparent)`;
  const floor = `color-mix(in srgb, color-mix(in srgb, var(--ms-primary) 40%, var(--ms-shade)) ${Math.min(Math.round(overlay * 100) + 38, 96)}%, transparent)`;

  return (
    <section
      id={anchorId}
      ref={sectionRef}
      className={`ms-invert relative flex w-full flex-col justify-end overflow-hidden ${tall ? 'min-h-[100svh]' : 'min-h-[78svh]'}`}
      style={{ background: 'var(--ms-primary)', color: 'var(--ms-paper)', '--ms-autoplay': `${AUTOPLAY_MS}ms` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* photo layer: cinematic entrance, slow push-in on the active slide, parallax on scroll */}
      <motion.div className="absolute inset-0" style={{ y: mediaY }}>
        <motion.div
          className="ms-hero-media absolute inset-0"
          initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
        >
          <div ref={trackRef} onScroll={onScroll} className="ms-noscrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden">
            {slides.map((src, i) => (
              <div key={src} data-hero-slide data-active={i === active} className="relative h-full w-full shrink-0 snap-center overflow-hidden">
                <img
                  src={src} alt={i === 0 ? p.title : `${p.title} photo ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : undefined}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* scrims: readable top bar, clear middle, a floor that melts into the brand colour */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${scrim} 0%, ${veil} 24%, ${veil} 38%, ${scrim} 66%, ${floor} 100%)` }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 80% at ${left ? '0%' : '50%'} 100%, ${scrim}, transparent 60%)` }} />

      {/* pointer-events-none so a swipe that starts on the text still reaches
          the photo track underneath; interactive pieces re-enable themselves. */}
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ y: contentY, opacity: contentFade }}
        className={`pointer-events-none relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 pb-28 pt-32 sm:px-8 lg:px-12 ${left ? 'items-start text-left' : 'items-center text-center'}`}
      >
        <motion.div variants={stagger} className={`flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${left ? '' : 'justify-center'}`}>
          <motion.span variants={pop} className="rounded-full px-3 py-1.5" style={{ background: 'var(--ms-secondary)', color: 'var(--ms-on-secondary)' }}>
            {PURPOSE_LABEL[p.purpose] || 'For Sale'}
          </motion.span>
          {p.is_verified && (
            <motion.span variants={pop} className="ms-glass-panel inline-flex items-center gap-1.5 !rounded-full px-3 py-1.5">
              <Shield style={{ width: 12, height: 12 }} /> Verified
            </motion.span>
          )}
          {p.tour_url && (
            <motion.span variants={pop} className="ms-glass-panel inline-flex items-center gap-1.5 !rounded-full px-3 py-1.5">
              <Cube style={{ width: 12, height: 12 }} /> 3D Tour
            </motion.span>
          )}
        </motion.div>

        {(data.subtitle || address || TYPE_LABEL[p.property_type]) && (
          <motion.p variants={rise} className="flex items-center gap-2 text-sm font-medium tracking-wide opacity-90 sm:text-base">
            <MapPin style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--ms-secondary)' }} />
            {data.subtitle || `${TYPE_LABEL[p.property_type] || ''}${address ? ' in ' + address : ''}`}
          </motion.p>
        )}

        {/* the title slides up from behind a mask */}
        <h1 className="ms-display max-w-5xl break-words font-semibold" style={{ fontSize: titleSize(title), lineHeight: 1.02, letterSpacing: '-0.03em', textWrap: 'balance', textShadow: '0 2px 30px color-mix(in srgb, var(--ms-shade) 45%, transparent)' }}>
          <span className="block overflow-hidden pb-[0.14em]">
            <motion.span className="block" variants={{ hidden: { y: '105%' }, show: { y: 0, transition: { duration: 1.1, ease: EASE } } }}>
              {title}
            </motion.span>
          </span>
        </h1>

        {/* price + key details + actions on one glass panel */}
        <motion.div variants={rise} className={`ms-glass-panel ms-glass-deep pointer-events-auto mt-3 flex w-full max-w-4xl flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8 ${left ? '' : 'lg:mx-auto'}`}>
          <div className={`shrink-0 ${left ? '' : 'lg:text-left'}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{p.price_range ? 'Price range' : 'Price'}</div>
            <div className="ms-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--ms-secondary)' }}>
              {price.main} <span className="text-base font-medium opacity-80" style={{ color: 'var(--ms-paper)' }}>{price.suffix}</span>
            </div>
          </div>

          {details.length > 0 && <span aria-hidden="true" className="hidden w-px self-stretch lg:block" style={{ background: 'var(--ms-glass-line)' }} />}
          {details.length > 0 && (
            <motion.dl variants={stagger} className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-left sm:flex sm:flex-wrap sm:gap-x-8" style={{ margin: 0 }}>
              {details.map(([label, value]) => (
                <motion.div key={label} variants={rise}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.18em] opacity-60">{label}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold" style={{ margin: 0 }}>{value}</dd>
                </motion.div>
              ))}
            </motion.dl>
          )}

          <div className="flex shrink-0 flex-wrap gap-2">
            <ThemedButton href={data.buttonLink || '#ms-enquiry'} icon={ArrowRight} className="flex-1 sm:flex-none">
              {data.buttonText || 'Enquire Now'}
            </ThemedButton>
            {p.owner_phone && (
              <ThemedButton variant="ghost" href={`tel:${p.owner_phone}`} icon={Phone} aria-label="Call the lister">Call</ThemedButton>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* kept to the left: the bottom-right corner belongs to the floating assistant */}
      {many && (
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-7xl items-center gap-3 px-5 pb-6 pr-24 sm:px-8 sm:pr-28 lg:px-12">
          <button type="button" aria-label="Previous photo" onClick={() => goTo(active - 1)} className="ms-lightbox-btn ms-focus !h-10 !w-10 shrink-0">
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </button>
          <button type="button" aria-label="Next photo" onClick={() => goTo(active + 1)} className="ms-lightbox-btn ms-focus !h-10 !w-10 shrink-0">
            <ChevronRight style={{ width: 18, height: 18 }} />
          </button>
          <span className="mx-1 shrink-0 text-xs font-medium tabular-nums opacity-80" aria-hidden="true">
            {String(active + 1).padStart(2, '0')} <span className="opacity-50">/ {String(slides.length).padStart(2, '0')}</span>
          </span>
          <div className="flex flex-1 items-center gap-2">
            {slides.map((src, i) => (
              <button
                key={src} type="button" aria-label={`Show photo ${i + 1}`} aria-current={i === active}
                onClick={() => goTo(i)}
                className="ms-focus flex h-8 flex-1 items-center" style={{ maxWidth: 56, background: 'none', border: 0, padding: 0 }}
              >
                <span key={`${i}-${active}`} className="ms-progress" data-state={i < active ? 'done' : i === active ? (paused || still ? 'hold' : 'run') : 'idle'}><i /></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
