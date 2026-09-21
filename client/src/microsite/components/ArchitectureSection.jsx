import { motion } from 'framer-motion';
import SectionLabel from './SectionLabel.jsx';
import ImageReveal from './ImageReveal.jsx';

export default function ArchitectureSection({ architecture }) {
  return (
    <section id="architecture" className="relative overflow-hidden bg-cream py-28 md:py-36">
      {/* blueprint-style grid, purely decorative */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
        <defs>
          <pattern id="blueprint" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M64 0H0V64" fill="none" stroke="#111111" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprint)" />
      </svg>

      <div className="relative mx-auto max-w-[1440px] px-6 md:px-12">
        <SectionLabel>Architecture</SectionLabel>
        <h2 className="ms-serif mt-6 max-w-2xl whitespace-pre-line text-4xl leading-[1.15] text-ink sm:text-5xl md:text-6xl">
          {architecture.heading}
        </h2>

        <div className="mt-16 grid gap-14 md:grid-cols-2 md:gap-16">
          <ImageReveal src={architecture.image} alt="Architecture" ratio="aspect-[4/5]" />

          <div className="flex flex-col justify-center gap-10">
            {architecture.principles.map((p, i) => (
              <motion.div
                key={p.index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="flex items-baseline gap-6 border-b border-ink/10 pb-6"
              >
                <span className="ms-serif text-lg text-gold">{p.index}</span>
                <h3 className="ms-serif text-2xl text-ink md:text-3xl">{p.title}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
