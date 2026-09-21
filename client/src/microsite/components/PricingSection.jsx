import { motion } from 'framer-motion';
import { FileText, CalendarCheck } from 'lucide-react';
import MagneticButton from './MagneticButton.jsx';

export default function PricingSection({ pricing }) {
  return (
    <section className="bg-ink py-28 text-white md:py-36">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8 }}
          className="ms-serif whitespace-pre-line text-5xl leading-[1.1] sm:text-6xl md:text-7xl"
        >
          {'Your next address\nstarts here.'}
        </motion.h2>

        <div className="mt-16 divide-y divide-white/15 border-y border-white/15">
          {pricing.map((p, i) => (
            <motion.div
              key={p.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex items-center justify-between py-8"
            >
              <span className="text-xl uppercase tracking-[0.15em] text-white/70 md:text-2xl">{p.type}</span>
              <span className="ms-serif text-3xl text-gold md:text-4xl">{p.price}</span>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-sm uppercase tracking-[0.3em] text-white/50">Limited residences available</p>

        <div className="mt-12 flex flex-wrap gap-4">
          <MagneticButton variant="gold" icon={FileText}>Get Complete Price</MagneticButton>
          <MagneticButton variant="outline" className="text-white border-white/25 hover:border-white" icon={FileText}>
            Download Brochure
          </MagneticButton>
          <MagneticButton variant="ghost" className="text-white" icon={CalendarCheck}
            onClick={() => document.getElementById('visit')?.scrollIntoView({ behavior: 'smooth' })}>
            Check Availability
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
