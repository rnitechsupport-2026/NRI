import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SectionLabel from './SectionLabel.jsx';

export default function AmenitiesExperience({ amenities }) {
  const [activeKey, setActiveKey] = useState(amenities[0].key);
  const active = amenities.find((a) => a.key === activeKey);

  return (
    <section id="amenities" className="bg-ink py-28 text-white md:py-36">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <SectionLabel dark>Amenities</SectionLabel>
        <h2 className="ms-serif mt-6 max-w-2xl text-4xl leading-[1.15] sm:text-5xl md:text-6xl">
          An amenity journey, not a checklist.
        </h2>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
            <AnimatePresence mode="wait">
              <motion.img
                key={active.key}
                src={active.image}
                alt={active.title}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />

            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-0 left-0 p-8"
              >
                <span className="text-xs uppercase tracking-[0.3em] text-gold">{active.title}</span>
                <p className="mt-3 max-w-sm text-white/85">{active.desc}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <ul className="ms-scrollbar flex flex-col divide-y divide-white/10 overflow-y-auto lg:max-h-[520px]">
            {amenities.map((a) => (
              <li key={a.key}>
                <button
                  onMouseEnter={() => setActiveKey(a.key)}
                  onFocus={() => setActiveKey(a.key)}
                  onClick={() => setActiveKey(a.key)}
                  className={`flex w-full items-center justify-between py-4 text-left transition-colors ${
                    activeKey === a.key ? 'text-gold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span className="ms-serif text-xl md:text-2xl">{a.title}</span>
                  <span className={`h-px flex-1 mx-4 ${activeKey === a.key ? 'bg-gold' : 'bg-transparent'}`} />
                  <span className="text-xs uppercase tracking-widest">{activeKey === a.key ? 'Viewing' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
