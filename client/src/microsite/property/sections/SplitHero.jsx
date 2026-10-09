import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Shield, Cube, ArrowRight } from '../../../components/Icons.jsx';
import { priceLabel, money, PURPOSE_LABEL, TYPE_LABEL } from '../../../utils/format.js';
import ThemedButton from '../ThemedButton.jsx';
import { priceDisplay } from '../theme.js';
import { EASE } from '../motion.jsx';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } } };
const rise = { hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } } };

/** A bold two-panel hero — text on a solid brand-color panel, photo filling
 *  the other half — instead of text-over-photo. Structurally different from
 *  Hero.jsx, not just a recolor, so a template built on this reads as a
 *  genuinely different layout rather than a palette swap. */
export default function SplitHero({ anchorId = 'ms-hero', property: p, data = {}, settings = {} }) {
  const bg = settings.backgroundImage || p.cover_image || p.images?.[0]?.url;
  const imageLeft = settings.imagePosition === 'left';
  const price = priceDisplay(p, priceLabel, money);
  const address = [p.locality, p.city].filter(Boolean).join(', ');
  const title = data.title || p.title;
  const long = String(title).length > 44;
  const still = useReducedMotion();

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  return (
    <section id={anchorId} ref={ref} className="grid min-h-[92svh] w-full grid-cols-1 overflow-hidden lg:grid-cols-2">
      <motion.div
        variants={stagger} initial="hidden" animate="show"
        className={`ms-tone-dark ms-invert relative flex flex-col justify-center gap-6 px-6 pb-16 pt-28 sm:px-10 lg:px-16 ${imageLeft ? 'lg:order-2' : ''}`}
      >
        <motion.div variants={rise} className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
          <span className="rounded-full px-3 py-1.5" style={{ background: 'var(--ms-secondary)', color: 'var(--ms-on-secondary)' }}>
            {PURPOSE_LABEL[p.purpose] || 'For Sale'}
          </span>
          {p.is_verified && <span className="ms-chip"><Shield style={{ width: 12, height: 12 }} /> Verified</span>}
          {p.tour_url && <span className="ms-chip"><Cube style={{ width: 12, height: 12 }} /> 3D Tour</span>}
        </motion.div>

        <h1 className="ms-display break-words font-semibold" style={{ fontSize: long ? 'clamp(2rem, 1.2rem + 3.4vw, 3.75rem)' : 'clamp(2.6rem, 1.3rem + 5vw, 5.5rem)', lineHeight: 1.02, letterSpacing: '-0.03em', textWrap: 'balance' }}>
          <span className="block overflow-hidden pb-[0.14em]">
            <motion.span className="block" variants={{ hidden: { y: '105%' }, show: { y: 0, transition: { duration: 1.1, ease: EASE } } }}>{title}</motion.span>
          </span>
        </h1>

        <motion.p variants={rise} className="ms-muted flex items-center gap-2">
          <MapPin style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--ms-secondary)' }} />
          {data.subtitle || `${TYPE_LABEL[p.property_type] || ''}${address ? ' in ' + address : ''}`}
        </motion.p>

        <motion.div variants={rise} className="flex flex-wrap items-end gap-x-8 gap-y-5 pt-2">
          <div>
            <div className="ms-muted text-[11px] font-semibold uppercase tracking-[0.2em]">{p.price_range ? 'Price range' : 'Price'}</div>
            <div className="ms-display ms-accent mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
              {price.main} <span className="ms-muted text-base font-medium">{price.suffix}</span>
            </div>
          </div>
          <ThemedButton href={data.buttonLink || '#ms-enquiry'} icon={ArrowRight}>{data.buttonText || 'Enquire Now'}</ThemedButton>
        </motion.div>
      </motion.div>

      <div className={`relative min-h-[48svh] overflow-hidden ${imageLeft ? 'lg:order-1' : ''}`}
           style={bg ? undefined : { background: 'linear-gradient(135deg, var(--ms-secondary), var(--ms-primary))' }}>
        {bg && (
          // the photo is unveiled by a wipe, then eases back from a slight push-in
          <motion.div
            className="absolute inset-0"
            initial={still ? false : { clipPath: imageLeft ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' }}
            animate={{ clipPath: 'inset(0 0 0 0)' }}
            transition={{ duration: 1.3, ease: EASE, delay: 0.15 }}
          >
            <motion.img
              src={bg} alt={p.title} fetchpriority="high"
              style={{ y: photoY }}
              initial={{ scale: 1.2 }} animate={{ scale: 1.06 }} transition={{ duration: 2.4, ease: EASE }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
