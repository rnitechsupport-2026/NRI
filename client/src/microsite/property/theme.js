const RADIUS = { none: '0px', sm: '6px', md: '12px', lg: '20px', full: '28px' };
const SPACING = { compact: 'clamp(3rem, 6vw, 4.5rem)', normal: 'clamp(4rem, 8vw, 6.5rem)', spacious: 'clamp(5rem, 11vw, 9rem)' };

/** True if a hex color is dark enough that it needs light (not dark) text on
 *  top of it. */
export function isDarkColor(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return false;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) < 150;
}

/** The text colour that stays readable on top of `hex`. */
export const onColor = (hex) => (isDarkColor(hex) ? '#ffffff' : '#111111');

/** Turns a Microsite's theme doc into CSS custom properties. Every section
 *  reads its colours from these (through premium.css) rather than hardcoding
 *  a palette, so the same section looks right under any template or custom
 *  theme. `data` holds the attributes that switch the type and button style. */
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
    '--ms-on-primary': onColor(t.primaryColor),
    '--ms-on-secondary': onColor(t.secondaryColor),
    '--ms-radius': RADIUS[t.borderRadius] || RADIUS.md,
    '--ms-pad-y': SPACING[t.sectionSpacing] || SPACING.normal,
  };

  const data = { 'data-ms-font': t.fontStyle, 'data-ms-button': t.buttonStyle };

  return { ...t, cssVars, data };
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
