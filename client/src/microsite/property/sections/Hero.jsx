import { motion } from 'framer-motion';
import { MapPin, Shield, Cube, ChevronDown } from '../../../components/Icons.jsx';
import { priceLabel, PURPOSE_LABEL, TYPE_LABEL } from '../../../utils/format.js';
import ThemedButton from '../ThemedButton.jsx';
import { headingFontClass } from '../theme.js';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ property: p, data = {}, settings = {}, theme }) {
  const bg = settings.backgroundImage || p.cover_image || p.images?.[0]?.url;
  const overlay = settings.overlay ?? 0.5;
  const align = settings.alignment === 'left' ? 'items-start text-left' : 'items-center text-center';
  const tall = settings.height === 'tall' ? 'min-h-[88vh]' : 'min-h-[64vh]';
  const price = priceLabel(p.purpose, p.price);
  const address = [p.locality, p.city].filter(Boolean).join(', ');

  return (
    <section id="ms-hero" className={`relative flex ${tall} w-full flex-col justify-end overflow-hidden`}>
      {bg && (
        <motion.img
          src={bg} alt={p.title}
          initial={{ scale: 1.18 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, rgba(0,0,0,${overlay * 0.5}) 0%, rgba(0,0,0,${overlay}) 55%, rgba(0,0,0,${Math.min(overlay + 0.25, 0.9)}) 100%)` }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 pb-16 pt-24 text-white ${align}`}
      >
        <motion.div variants={item} className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <span className="rounded-full px-3 py-1 shadow-sm" style={{ background: theme.secondaryColor, color: '#1a1a1a' }}>
            {PURPOSE_LABEL[p.purpose] || 'For Sale'}
          </span>
          {p.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <Shield style={{ width: 12, height: 12 }} /> Verified
            </span>
          )}
          {p.tour_url && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <Cube style={{ width: 12, height: 12 }} /> 3D Tour
            </span>
          )}
        </motion.div>

        <motion.h1 variants={item} className={`${headingFontClass(theme)} text-4xl font-semibold leading-[1.08] drop-shadow-sm md:text-6xl`}>
          {data.title || p.title}
        </motion.h1>

        {(data.subtitle || address || TYPE_LABEL[p.property_type]) && (
          <motion.p variants={item} className="flex items-center gap-1.5 text-base text-white/85 md:text-lg">
            <MapPin style={{ width: 16, height: 16 }} />
            {data.subtitle || `${TYPE_LABEL[p.property_type] || ''}${address ? ' in ' + address : ''}`}
          </motion.p>
        )}

        <motion.div variants={item} className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          {price.main} {price.suffix}
        </motion.div>

        <motion.div variants={item} className="mt-4 flex flex-wrap gap-3">
          <ThemedButton theme={theme} href={data.buttonLink || '#ms-enquiry'}>
            {data.buttonText || 'Enquire Now'}
          </ThemedButton>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-white/70"
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ChevronDown style={{ width: 20, height: 20 }} />
      </motion.div>
    </section>
  );
}
