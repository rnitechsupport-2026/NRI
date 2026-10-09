import { motion } from 'framer-motion';

/**
 * The microsite's one button. Colours, radius and the solid / outline / pill
 * style all come from the theme through CSS (premium.css `.ms-btn*`), so it
 * also adapts on its own when it sits on the brand colour or over a photo.
 * variant: 'primary' | 'secondary' (outline) | 'ghost' (glass, for photos).
 */
export default function ThemedButton({ variant = 'primary', size, href, onClick, children, icon: Icon, className = '', ...rest }) {
  const Tag = href ? motion.a : motion.button;
  const external = href && href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Tag
      href={href}
      type={href ? undefined : 'button'}
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`ms-btn ms-btn-${variant} ${size === 'sm' ? 'ms-btn-sm' : ''} ${className}`}
      {...external}
      {...rest}
    >
      {children}
      {Icon && <Icon />}
    </Tag>
  );
}
