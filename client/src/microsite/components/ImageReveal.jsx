import { motion } from 'framer-motion';

/**
 * A large image that reveals via a rising panel + slow scale-out, triggered
 * once when it enters the viewport. Used anywhere a "this image matters"
 * moment is needed rather than a plain <img>.
 */
export default function ImageReveal({ src, alt = '', className = '', ratio = 'aspect-[4/5]' }) {
  return (
    <div className={`relative overflow-hidden ${ratio} ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        initial={{ scale: 1.25 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <motion.div
        initial={{ scaleY: 1 }}
        whileInView={{ scaleY: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        style={{ originY: 0 }}
        className="absolute inset-0 bg-cream"
      />
    </div>
  );
}
