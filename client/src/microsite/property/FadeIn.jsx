import { motion } from 'framer-motion';

/** Generic scroll-triggered rise+fade, used to give every section a bit of
 *  entrance motion instead of just popping into place. `y` controls how far
 *  it rises from; `delay` staggers a group of children. */
export default function FadeIn({ children, delay = 0, y = 22, className = '', style, as = 'div' }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
