import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Maximize2, Download } from 'lucide-react';
import SectionLabel from './SectionLabel.jsx';
import MagneticButton from './MagneticButton.jsx';

export default function FloorPlanExplorer({ floorPlans }) {
  const [active, setActive] = useState(floorPlans.tabs[0].key);
  const [modalOpen, setModalOpen] = useState(false);
  const tab = floorPlans.tabs.find((t) => t.key === active);

  return (
    <section id="floorplan" className="bg-cream py-28 md:py-36">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <SectionLabel>Floor Plan</SectionLabel>
        <h2 className="ms-serif mt-6 max-w-2xl text-4xl leading-[1.15] text-ink sm:text-5xl md:text-6xl">
          {floorPlans.heading}
        </h2>

        <div className="mt-10 flex gap-3">
          {floorPlans.tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`relative rounded-full px-6 py-2.5 text-sm tracking-wide transition-colors ${
                active === t.key ? 'bg-ink text-white' : 'bg-transparent text-ink/60 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16"
          >
            <div className="group relative aspect-[4/3] overflow-hidden rounded-sm bg-white">
              <img src={tab.image} alt={tab.label} className="h-full w-full object-cover" />
              <button
                onClick={() => setModalOpen(true)}
                className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs uppercase tracking-wide text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
              >
                <Maximize2 size={13} /> Expand
              </button>
            </div>

            <div className="flex flex-col justify-center">
              <dl className="divide-y divide-ink/10">
                {tab.stats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between py-4">
                    <dt className="text-sm uppercase tracking-wide text-stone">{s.label}</dt>
                    <dd className="ms-serif text-xl text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-10 flex flex-wrap gap-4">
                <MagneticButton variant="solid" icon={Maximize2} onClick={() => setModalOpen(true)}>
                  View Full Plan
                </MagneticButton>
                <MagneticButton variant="outline" icon={Download} onClick={() => window.open(tab.image, '_blank')}>
                  Download Brochure
                </MagneticButton>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/90 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] max-w-4xl overflow-hidden rounded-sm bg-white"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 z-10 rounded-full bg-ink/80 p-2 text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <img src={tab.image} alt={tab.label} className="max-h-[85vh] w-full object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
