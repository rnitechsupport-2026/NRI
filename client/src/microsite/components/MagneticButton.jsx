import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const VARIANTS = {
  solid: 'bg-ink text-white hover:bg-charcoal',
  outline: 'border border-ink/25 text-ink hover:border-ink',
  light: 'bg-white text-ink hover:bg-cream',
  gold: 'bg-gold text-ink hover:brightness-95',
  ghost: 'border border-white/40 text-white hover:border-white',
};

/**
 * A button that subtly pulls toward the cursor while hovered, then springs
 * back to center on leave — the "magnetic" micro-interaction from the brief.
 */
export default function MagneticButton({ children, onClick, href, variant = 'solid', className = '', icon: Icon }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });

  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * 0.28);
    y.set(relY * 0.35);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  const Tag = href ? motion.a : motion.button;

  return (
    <Tag
      ref={ref}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-colors duration-300 ${VARIANTS[variant]} ${className}`}
    >
      {children}
      {Icon && <Icon size={16} strokeWidth={1.75} />}
    </Tag>
  );
}
