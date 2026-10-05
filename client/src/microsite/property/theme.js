const RADIUS = { none: '0px', sm: '6px', md: '12px', lg: '20px', full: '999px' };
const SPACING = { compact: '2.5rem', normal: '4.5rem', spacious: '7rem' };

/** Turns a Microsite's theme doc into CSS custom properties + a couple of shared class helpers.
 *  Every section reads colors from these vars rather than hardcoding a palette, so the same
 *  section component looks right whichever template (or custom theme) it's rendered under. */
export function resolveTheme(theme = {}) {
  const t = {
    primaryColor: theme.primaryColor || '#0e2a4e',
    secondaryColor: theme.secondaryColor || '#e4a11b',
    backgroundColor: theme.backgroundColor || '#ffffff',
    textColor: theme.textColor || '#111827',
    buttonStyle: theme.buttonStyle || 'solid',
    borderRadius: theme.borderRadius || 'md',
    fontStyle: theme.fontStyle || 'modern',
    sectionSpacing: theme.sectionSpacing || 'normal',
  };

  const cssVars = {
    '--ms-primary': t.primaryColor,
    '--ms-secondary': t.secondaryColor,
    '--ms-bg': t.backgroundColor,
    '--ms-text': t.textColor,
    '--ms-radius': RADIUS[t.borderRadius] || RADIUS.md,
    '--ms-pad-y': SPACING[t.sectionSpacing] || SPACING.normal,
  };

  return { ...t, cssVars };
}

/** True if a hex color is dark enough that it needs light (not dark) text on
 *  top of it. Used by the navbar, which can't assume its own background is
 *  light the way the rest of a themed section can (tone: 'light'/'dark'). */
export function isDarkColor(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
}

export function headingFontClass(theme) {
  return theme.fontStyle === 'modern' ? '' : 'ms-serif';
}

/** tone: 'light' uses backgroundColor/textColor; 'dark' inverts onto primaryColor with white text. */
export function toneStyle(theme, tone) {
  if (tone === 'dark') return { background: theme.primaryColor, color: '#ffffff' };
  return { background: theme.backgroundColor, color: theme.textColor };
}

export function primaryButtonStyle(theme) {
  const radius = 'var(--ms-radius)';
  if (theme.buttonStyle === 'outline') {
    return { background: 'transparent', color: theme.primaryColor, border: `1.5px solid ${theme.primaryColor}`, borderRadius: radius };
  }
  if (theme.buttonStyle === 'pill') {
    return { background: theme.primaryColor, color: '#fff', borderRadius: '999px' };
  }
  return { background: theme.primaryColor, color: '#fff', borderRadius: radius };
}

/** A single listing has one price; a project has a range across its unit
 *  types. `p.price_range` (set only by the project hydrator) switches this
 *  to "₹X – ₹Y" instead of the usual single priceLabel() output. */
export function priceDisplay(p, priceLabel, money) {
  if (p.price_range) {
    return { main: `${money(p.price_range.min)} – ${money(p.price_range.max)}`, suffix: '' };
  }
  return priceLabel(p.purpose, p.price);
}

export function secondaryButtonStyle(theme) {
  const radius = theme.buttonStyle === 'pill' ? '999px' : 'var(--ms-radius)';
  return { background: 'transparent', color: theme.secondaryColor, border: `1.5px solid ${theme.secondaryColor}`, borderRadius: radius };
}

/** A soft elevated card that adapts to whichever tone (light/dark) it sits on —
 *  used everywhere a fact/amenity/testimonial needs to read as a distinct tile
 *  rather than flat text sitting on the section background. */
export function cardStyle(tone) {
  return tone === 'dark'
    ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--ms-radius)' }
    : { background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 'var(--ms-radius)', boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)' };
}
