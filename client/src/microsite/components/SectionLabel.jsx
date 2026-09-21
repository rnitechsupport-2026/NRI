import { motion } from 'framer-motion';

export default function SectionLabel({ children, dark = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`flex items-center gap-3 text-xs tracking-[0.35em] uppercase font-medium ${
        dark ? 'text-white/70' : 'text-stone'
      }`}
    >
      <span className="h-px w-8 bg-gold" />
      {children}
    </motion.div>
  );
}
