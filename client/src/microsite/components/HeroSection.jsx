import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import MagneticButton from './MagneticButton.jsx';

export default function HeroSection({ property }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0, 0.55]);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section id="hero" ref={ref} className="relative h-[100svh] w-full overflow-hidden bg-ink">
      <motion.div style={{ scale, y }} className="absolute inset-0">
        <img src={property.heroImage} alt={property.name} className="h-full w-full object-cover" />
      </motion.div>
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 bg-ink" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-ink/40" />

      <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 flex h-full flex-col justify-end px-6 pb-28 md:px-12 md:pb-32">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-xs uppercase tracking-[0.4em] text-white/70"
        >
          {property.label}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="ms-serif mt-4 max-w-3xl text-4xl leading-[1.08] text-white sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Where Life Finds Its Finest Address.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mt-8 flex flex-col gap-2"
        >
          <span className="ms-serif text-2xl text-gold md:text-3xl">{property.name}</span>
          <span className="text-sm uppercase tracking-[0.3em] text-white/70">{property.location}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.7 }}
          className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/80"
        >
          <span>{property.type}</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>{property.area}</span>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <span>Possession {property.possession}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="mt-3 ms-serif text-xl text-white md:text-2xl"
        >
          Starting from {property.price}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.7 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <MagneticButton variant="gold" onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore Property
          </MagneticButton>
          <MagneticButton variant="ghost" className="text-white" onClick={() => document.getElementById('visit')?.scrollIntoView({ behavior: 'smooth' })}>
            Schedule a Visit
          </MagneticButton>
        </motion.div>
      </motion.div>

      {/* floating glass info panel */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.8 }}
        className="absolute bottom-28 right-6 z-10 hidden w-56 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl md:right-12 md:block"
      >
        <ul className="space-y-3 text-sm text-white">
          <li className="flex items-center justify-between border-b border-white/15 pb-3">
            <span className="text-white/60">Configuration</span><span>{property.type.replace(' Villas', '')}</span>
          </li>
          <li className="flex items-center justify-between border-b border-white/15 pb-3">
            <span className="text-white/60">Area</span><span>{property.area}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-white/60">Units</span><span>{property.units}</span>
          </li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 text-white/70"
      >
        <span className="text-[10px] uppercase tracking-[0.35em]">Scroll to discover</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
          <ChevronDown size={18} strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </section>
  );
}
