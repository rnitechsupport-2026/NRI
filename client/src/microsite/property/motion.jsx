import { motion } from 'framer-motion';

// One easing and one reveal for the whole microsite, so every section moves
// the same way. Reduced-motion is handled once, by <MotionConfig
// reducedMotion="user"> in MicrositeRenderer: it drops the movement and keeps
// the fade, so nothing here needs its own check.
export const EASE = [0.16, 1, 0.3, 1];

// A low threshold on purpose: a tall block on a phone can be several screens
// high, and it must still reveal as soon as its top edge scrolls in.
const VIEWPORT = { once: true, amount: 0.12 };

export const revealItem = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

/** Rise-and-fade a single block when it scrolls into view. */
export function Reveal({ children, delay = 0, y = 28, className = '', style, as = 'div' }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.85, delay, ease: EASE }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

/** Reveals its <StaggerItem> children one after another. */
export function Stagger({ children, className = '', style, gap = 0.07, delay = 0, as = 'div', ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className = '', style, as = 'div', ...rest }) {
  const Tag = motion[as] || motion.div;
  return <Tag variants={revealItem} className={className} style={style} {...rest}>{children}</Tag>;
}
