import { motion } from 'framer-motion';
import { MapPin, Shield, Cube } from '../../../components/Icons.jsx';
import { priceLabel, PURPOSE_LABEL, TYPE_LABEL } from '../../../utils/format.js';
import ThemedButton from '../ThemedButton.jsx';
import { headingFontClass } from '../theme.js';

/** A bold two-panel hero — text on a solid brand-color panel, photo filling
 *  the other half — instead of text-over-photo. Structurally different from
 *  Hero.jsx, not just a recolor, so a template built on this reads as a
 *  genuinely different layout rather than a palette swap. */
export default function SplitHero({ property: p, data = {}, settings = {}, theme }) {
  const bg = settings.backgroundImage || p.cover_image || p.images?.[0]?.url;
  const imageLeft = settings.imagePosition === 'left';
  const price = priceLabel(p.purpose, p.price);
  const address = [p.locality, p.city].filter(Boolean).join(', ');

  return (
    <section id="ms-hero" className="grid min-h-[90vh] w-full grid-cols-1 lg:grid-cols-2">
      <div
        className={`flex flex-col justify-center gap-5 px-8 py-20 lg:px-16 ${imageLeft ? 'lg:order-2' : ''}`}
        style={{ background: theme.primaryColor, color: '#fff' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]"
        >
          <span className="rounded-full px-3 py-1" style={{ background: theme.secondaryColor, color: '#1a1a1a' }}>
            {PURPOSE_LABEL[p.purpose] || 'For Sale'}
          </span>
          {p.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
              <Shield style={{ width: 12, height: 12 }} /> Verified
            </span>
          )}
          {p.tour_url && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
              <Cube style={{ width: 12, height: 12 }} /> 3D Tour
            </span>
          )}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
          className={`${headingFontClass(theme)} text-5xl font-bold leading-[1.03] md:text-7xl`}
        >
          {data.title || p.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center gap-1.5 text-white/80"
        >
          <MapPin style={{ width: 15, height: 15, flexShrink: 0 }} />
          {data.subtitle || `${TYPE_LABEL[p.property_type] || ''}${address ? ' in ' + address : ''}`}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-1 text-3xl font-bold tracking-tight"
          style={{ color: theme.secondaryColor }}
        >
          {price.main} {price.suffix}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} className="mt-4">
          <ThemedButton theme={theme} href={data.buttonLink || '#ms-enquiry'}>
            {data.buttonText || 'Enquire Now'}
          </ThemedButton>
        </motion.div>
      </div>

      <div className={`relative min-h-[45vh] overflow-hidden ${imageLeft ? 'lg:order-1' : ''}`}>
        {bg && (
          <motion.img
            src={bg} alt={p.title}
            initial={{ scale: 1.16 }} animate={{ scale: 1 }} transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
    </section>
  );
}
