import { motion } from 'framer-motion';
import { primaryButtonStyle, secondaryButtonStyle } from './theme.js';

export default function ThemedButton({ theme, variant = 'primary', href, onClick, children, icon: Icon, className = '' }) {
  const style = variant === 'secondary' ? secondaryButtonStyle(theme) : primaryButtonStyle(theme);
  const shadow = variant === 'secondary' ? {} : { boxShadow: `0 8px 24px -10px ${theme.primaryColor}66` };
  const Tag = href ? motion.a : motion.button;
  const extra = href && href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Tag
      href={href}
      onClick={onClick}
      style={{ ...style, ...shadow }}
      whileHover={{ scale: 1.035, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold ${className}`}
      {...extra}
    >
      {children}
      {Icon && <Icon style={{ width: 16, height: 16 }} />}
    </Tag>
  );
}
