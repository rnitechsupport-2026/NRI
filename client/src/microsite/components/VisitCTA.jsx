import { motion } from 'framer-motion';
import { CalendarCheck, PhoneCall, MessageCircle } from 'lucide-react';
import MagneticButton from './MagneticButton.jsx';

export default function VisitCTA({ property }) {
  const digits = property.phone.replace(/[^\d]/g, '');

  return (
    <section id="visit" className="relative flex h-[100svh] items-center justify-center overflow-hidden bg-ink text-center text-white">
      <img src={property.ctaImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />

      <div className="relative z-10 flex max-w-2xl flex-col items-center px-6">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8 }}
          className="ms-serif text-4xl leading-tight sm:text-5xl md:text-6xl"
        >
          Come see it for yourself.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-6 text-lg leading-relaxed text-white/75"
        >
          Experience the space. Walk through the possibilities. Find your place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton variant="gold" icon={CalendarCheck}>Schedule a Site Visit</MagneticButton>
          <MagneticButton variant="ghost" className="text-white" icon={PhoneCall}>Talk to an Expert</MagneticButton>
          <MagneticButton
            variant="outline"
            className="border-white/30 text-white hover:border-white"
            icon={MessageCircle}
            href={`https://wa.me/${digits}`}
          >
            WhatsApp Us
          </MagneticButton>
        </motion.div>

        <p className="mt-8 text-sm uppercase tracking-[0.3em] text-white/50">{property.phone}</p>
      </div>
    </section>
  );
}
