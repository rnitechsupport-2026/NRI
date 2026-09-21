import { motion } from 'framer-motion';
import SectionLabel from './SectionLabel.jsx';
import AnimatedCounter from './AnimatedCounter.jsx';

export default function BuilderSection({ builderInfo }) {
  const initials = builderInfo.name.split(' ').map((w) => w[0]).join('').slice(0, 2);

  return (
    <section className="bg-cream py-28 md:py-36">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <SectionLabel>The Builder</SectionLabel>

        <div className="mt-6 flex flex-wrap items-center gap-5">
          <span className="ms-serif flex h-14 w-14 items-center justify-center rounded-full border border-ink/15 text-lg text-ink">
            {initials}
          </span>
          <span className="text-sm uppercase tracking-[0.3em] text-stone">{builderInfo.name}</span>
        </div>

        <h2 className="ms-serif mt-6 max-w-2xl text-4xl leading-[1.15] text-ink sm:text-5xl md:text-6xl">
          {builderInfo.heading}
        </h2>

        <div className="mt-16 grid grid-cols-2 gap-8 border-y border-ink/10 py-10 md:grid-cols-4 md:gap-6">
          {builderInfo.stats.map((s) => (
            <div key={s.label}>
              <div className="ms-serif text-4xl text-ink md:text-5xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} decimals={s.decimals || 0} />
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-stone">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="ms-scrollbar mt-14 flex gap-5 overflow-x-auto pb-4">
          {builderInfo.projects.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="h-40 w-64 shrink-0 overflow-hidden rounded-sm"
            >
              <img src={src} alt={`Project ${i + 1}`} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
