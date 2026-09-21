import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import SectionLabel from './SectionLabel.jsx';

export default function ExperienceSection({ experience }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const count = experience.moments.length;
  const x = useTransform(scrollYProgress, [0, 1], ['0%', `-${(count - 1) * 100}%`]);

  return (
    <section id="experience" className="relative bg-charcoal text-white">
      <div className="px-6 pt-24 md:px-12">
        <SectionLabel dark>Experience</SectionLabel>
        <h2 className="ms-serif mt-6 max-w-2xl text-4xl leading-[1.15] sm:text-5xl md:text-6xl">
          {experience.heading}
        </h2>
      </div>

      {/* Desktop: pinned horizontal scroll driven by vertical scroll progress */}
      <div ref={ref} className="relative hidden lg:block" style={{ height: `${count * 100}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <motion.div style={{ x }} className="flex">
            {experience.moments.map((m) => (
              <div key={m.index} className="relative flex h-screen w-screen shrink-0 items-end px-12 pb-24">
                <img src={m.image} alt={m.title} className="absolute inset-0 h-full w-full object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/20 to-transparent" />
                <div className="relative z-10 max-w-lg">
                  <span className="ms-serif text-gold text-2xl">{m.index}</span>
                  <h3 className="ms-serif mt-3 text-4xl">{m.title}</h3>
                  <p className="mt-4 text-lg text-white/75">{m.text}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Mobile: vertical stacked cards */}
      <div className="flex flex-col gap-4 px-6 py-14 lg:hidden">
        {experience.moments.map((m, i) => (
          <motion.div
            key={m.index}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, delay: i * 0.05 }}
            className="relative h-[70vh] overflow-hidden rounded-sm"
          >
            <img src={m.image} alt={m.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/10 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-6">
              <span className="ms-serif text-gold text-xl">{m.index}</span>
              <h3 className="ms-serif mt-2 text-3xl text-white">{m.title}</h3>
              <p className="mt-3 text-white/75">{m.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
