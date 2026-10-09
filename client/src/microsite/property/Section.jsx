import { Stagger, StaggerItem } from './motion.jsx';

/**
 * The frame every content section sits in: tone (light = page background,
 * dark = brand colour), layered backdrop, spacing and max width all come from
 * here (premium.css), so sections only describe their content.
 */
export default function Section({ id, tone = 'light', width = 'max-w-6xl', className = '', children, after }) {
  return (
    <section id={id} data-tone={tone} className={`ms-section ms-tone-${tone} ${tone === 'dark' ? 'ms-invert' : ''} ${className}`}>
      <div className={`ms-container ${width}`}>{children}</div>
      {after}
    </section>
  );
}

/** Eyebrow + title + optional lead, revealed in sequence. */
export function SectionHeading({ eyebrow, title, lead, align = 'left', className = '', children }) {
  const centered = align === 'center';
  return (
    <Stagger className={`flex flex-col gap-4 ${centered ? 'items-center text-center' : 'items-start'} ${className}`}>
      {eyebrow && <StaggerItem as="span" className="ms-eyebrow">{eyebrow}</StaggerItem>}
      {title && <StaggerItem as="h2" className="ms-h2">{title}</StaggerItem>}
      {lead && <StaggerItem as="p" className={`ms-lead ${centered ? 'mx-auto' : ''}`}>{lead}</StaggerItem>}
      {children && <StaggerItem>{children}</StaggerItem>}
    </Stagger>
  );
}
