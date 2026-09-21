import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import SectionLabel from './SectionLabel.jsx';

// Percentage positions around the center marker — purely presentational,
// tuned to look balanced on a wide map canvas. Swap this whole visual for a
// real Google Maps / Mapbox embed later; the data shape stays the same.
const POSITIONS = [
  { top: '14%', left: '20%' },
  { top: '22%', left: '72%' },
  { top: '48%', left: '85%' },
  { top: '72%', left: '68%' },
  { top: '78%', left: '22%' },
  { top: '46%', left: '10%' },
];

export default function LocationSection({ location }) {
  return (
    <section id="location" className="bg-charcoal py-28 text-white md:py-36">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <SectionLabel dark>Location</SectionLabel>
        <h2 className="ms-serif mt-6 max-w-2xl whitespace-pre-line text-4xl leading-[1.15] sm:text-5xl md:text-6xl">
          {location.heading}
        </h2>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
          {/* map placeholder */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[#141414] md:aspect-[16/10]">
            <svg className="absolute inset-0 h-full w-full opacity-[0.15]" aria-hidden="true">
              <defs>
                <pattern id="mapgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="#B89B5E" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapgrid)" />
            </svg>

            {/* center marker */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.span
                animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }}
                className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-gold"
              />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ink">
                <MapPin size={18} strokeWidth={2} />
              </span>
            </div>

            {/* floating location chips, desktop only */}
            {location.places.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                style={POSITIONS[i % POSITIONS.length]}
                className="absolute hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs backdrop-blur-md md:flex"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span className="whitespace-nowrap text-white/90">{p.name}</span>
                <span className="text-gold">{p.time}</span>
              </motion.div>
            ))}
          </div>

          {/* location advantage panel */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 text-gold">
              <Navigation size={16} />
              <span className="text-xs uppercase tracking-[0.3em]">Location Advantage</span>
            </div>
            <ul className="mt-6 divide-y divide-white/10">
              {location.places.map((p) => (
                <li key={p.name} className="flex items-center justify-between py-4">
                  <span className="text-white/80">{p.name}</span>
                  <span className="ms-serif text-lg text-white">{p.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
