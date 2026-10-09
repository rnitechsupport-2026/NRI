import { motion } from 'framer-motion';
import { revealItem } from './motion.jsx';

/** Reports the pointer position to CSS (--mx / --my) for the card's spotlight. */
function trackPointer(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  el.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

/**
 * The microsite's one card: themed surface, hover lift and a soft light that
 * follows the pointer. Inside a <Stagger> it reveals in turn (`reveal`).
 */
export default function Card({ children, className = '', style, hover = true, reveal = true, lift = -6, ...rest }) {
  return (
    <motion.div
      variants={reveal ? revealItem : undefined}
      whileHover={hover ? { y: lift } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onPointerMove={hover ? trackPointer : undefined}
      data-hover={hover ? '' : undefined}
      className={`ms-card ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
