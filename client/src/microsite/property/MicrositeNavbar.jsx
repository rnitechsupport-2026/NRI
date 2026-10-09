import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from '../../components/Icons.jsx';
import ThemedButton from './ThemedButton.jsx';
import { isDarkColor, onColor } from './theme.js';
import { EASE } from './motion.jsx';

/**
 * Sticky navbar. Over a photo hero it starts transparent and turns into a
 * solid glass bar once the page scrolls; anywhere else it is solid from the
 * start. Links only show for sections that are actually on the page, and the
 * one in view is marked.
 */
export default function MicrositeNavbar({ property: p, navbar = {}, theme, overHero = false }) {
  const barRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Ids of linkable sections found on the page, comma-joined; null = not looked yet.
  const [present, setPresent] = useState(null);
  const [active, setActive] = useState('');
  const sticky = navbar.sticky !== false;

  const saved = (navbar.items || []).filter((i) => i.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const itemKeys = saved.map((i) => i.key).join(',');
  const found = present === null ? null : present.split(',');
  // Saved links follow the page: a link whose section was removed, hidden or
  // has nothing to show (no amenities, no photos…) drops out by itself.
  const items = found ? saved.filter((i) => found.includes(i.key)) : saved;

  // Which link targets exist right now — re-checked whenever the page's
  // sections change (the builder adds, hides and removes them live).
  useEffect(() => {
    const root = barRef.current?.closest('.ms-root');
    const win = root?.ownerDocument?.defaultView;
    if (!root || !win) return undefined;
    const scan = () => {
      const keys = [...(itemKeys ? itemKeys.split(',') : []), 'ms-enquiry'];
      setPresent([...new Set(keys)].filter((k) => root.querySelector(`[id="${k}"]`)).join(','));
    };
    scan();
    if (!win.MutationObserver) return undefined;
    const watcher = new win.MutationObserver(scan);
    watcher.observe(root, { childList: true });
    return () => watcher.disconnect();
  }, [itemKeys]);

  // Scroll state + the section currently in view.
  useEffect(() => {
    const root = barRef.current?.closest('.ms-root');
    const win = root?.ownerDocument?.defaultView;
    if (!root || !win) return undefined;

    const onScroll = () => setScrolled(win.scrollY > 24);
    onScroll();
    win.addEventListener('scroll', onScroll, { passive: true });

    const targets = (present || '').split(',').filter(Boolean).map((k) => root.querySelector(`[id="${k}"]`)).filter(Boolean);
    let observer;
    if (win.IntersectionObserver && targets.length) {
      // The section crossing the middle of the screen is the current one.
      observer = new win.IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }),
        { rootMargin: '-45% 0px -50% 0px' }
      );
      targets.forEach((el) => observer.observe(el));
    }
    return () => { win.removeEventListener('scroll', onScroll); observer?.disconnect(); };
  }, [present]);

  const bg = navbar.background || '#ffffff';
  const clear = overHero && !scrolled && !open; // transparent over the hero photo
  const dark = clear || isDarkColor(bg);
  const text = clear ? '#ffffff' : onColor(bg);
  // The title keeps the brand colour only where that colour is readable.
  const titleColor = clear || isDarkColor(bg) === isDarkColor(theme.primaryColor) ? text : theme.primaryColor;

  // The logo is the one uploaded for this microsite, else the lister's own
  // company/profile logo — never a stock image.
  const logoSrc = navbar.showLogo !== false ? (navbar.logoUrl || p.owner_avatar || '') : '';
  const ctaLabel = navbar.ctaLabel || 'Enquire Now';
  // The default button jumps to the enquiry form; without one on the page it calls instead.
  const hasForm = !found || found.includes('ms-enquiry');
  const ctaLink = navbar.ctaLink || (hasForm ? '#ms-enquiry' : (p.owner_phone ? `tel:${p.owner_phone}` : ''));

  const bar = (
    <header
      ref={barRef}
      className={`${dark ? 'ms-invert' : ''} flex items-center justify-between gap-4 px-5 transition-[padding,background-color,box-shadow,color] duration-500 lg:px-8 ${scrolled ? 'py-2.5' : 'py-4'}`}
      style={{
        color: text,
        background: clear ? 'linear-gradient(180deg, color-mix(in srgb, var(--ms-shade) 45%, transparent), transparent)' : `color-mix(in srgb, ${bg} ${scrolled ? 86 : 100}%, transparent)`,
        backdropFilter: clear ? 'none' : 'saturate(160%) blur(16px)',
        WebkitBackdropFilter: clear ? 'none' : 'saturate(160%) blur(16px)',
        borderBottom: `1px solid ${clear ? 'transparent' : 'color-mix(in srgb, currentColor 10%, transparent)'}`,
        boxShadow: scrolled ? '0 18px 40px -28px color-mix(in srgb, var(--ms-shade) 55%, transparent)' : 'none',
      }}
    >
      <a href="#ms-hero" className="flex min-w-0 shrink items-center gap-3 font-semibold lg:max-w-[30%]" style={{ textDecoration: 'none', color: 'inherit' }}>
        {logoSrc && (
          <img src={logoSrc} alt={p.owner_company || p.owner_name || ''} data-ms-logo
               className="h-9 w-9 shrink-0 object-cover" style={{ borderRadius: 'min(var(--ms-radius), 10px)' }}
               onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <span className="ms-display truncate text-[15px]" style={{ color: titleColor }}>{p.title}</span>
      </a>

      <nav aria-label="Sections" className="hidden shrink-0 items-center gap-7 text-[13.5px] font-medium lg:flex">
        {items.map((i) => (
          <a key={i.key} href={`#${i.key}`} className="ms-nav-link" aria-current={active === i.key ? 'true' : undefined} style={{ color: 'inherit' }}>
            {i.label}
            {active === i.key && (
              <motion.span layoutId="ms-nav-active" className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full"
                           style={{ background: 'var(--ms-secondary)' }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
            )}
          </a>
        ))}
      </nav>

      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        {p.owner_phone && <ThemedButton variant="secondary" size="sm" href={`tel:${p.owner_phone}`} icon={Phone}>Call</ThemedButton>}
        {ctaLink && <ThemedButton size="sm" href={ctaLink}>{ctaLabel}</ThemedButton>}
      </div>

      <button type="button" className="ms-focus relative h-10 w-10 shrink-0 lg:hidden" onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="ms-mobile-menu"
              style={{ color: 'inherit', background: 'none', border: 0 }}>
        {/* two bars that cross into an X */}
        <motion.span className="absolute left-2 right-2 top-1/2 h-[1.5px] rounded" style={{ background: 'currentColor' }}
                     animate={open ? { y: 0, rotate: 45 } : { y: -4, rotate: 0 }} transition={{ duration: 0.35, ease: EASE }} />
        <motion.span className="absolute left-2 right-2 top-1/2 h-[1.5px] rounded" style={{ background: 'currentColor' }}
                     animate={open ? { y: 0, rotate: -45 } : { y: 4, rotate: 0 }} transition={{ duration: 0.35, ease: EASE }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="ms-mobile-menu"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute inset-x-0 top-full flex max-h-[80vh] flex-col gap-1 overflow-y-auto p-5 lg:hidden"
            style={{ background: bg, color: onColor(bg), borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)', boxShadow: '0 30px 60px -30px color-mix(in srgb, var(--ms-shade) 60%, transparent)' }}
          >
            {items.map((i, n) => (
              <motion.a
                key={i.key} href={`#${i.key}`} onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.04 * n, ease: EASE }}
                className="ms-display flex items-center justify-between py-3 text-2xl font-semibold"
                style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid color-mix(in srgb, currentColor 8%, transparent)' }}
              >
                {i.label}
                <span className="text-xs tabular-nums opacity-50">{String(n + 1).padStart(2, '0')}</span>
              </motion.a>
            ))}
            <div className={`mt-4 flex gap-2 ${isDarkColor(bg) ? 'ms-invert' : ''}`}>
              {p.owner_phone && <ThemedButton variant="secondary" href={`tel:${p.owner_phone}`} icon={Phone} className="flex-1">Call</ThemedButton>}
              {ctaLink && <ThemedButton href={ctaLink} onClick={() => setOpen(false)} className="flex-1">{ctaLabel}</ThemedButton>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );

  // Over a hero the bar must not push the photo down: a zero-height holder
  // keeps it in the flow (and sticky) while the bar itself floats on top.
  if (overHero) {
    return <div className={`${sticky ? 'sticky' : 'relative'} top-0 z-40 h-0`}><div className="absolute inset-x-0 top-0">{bar}</div></div>;
  }
  return <div className={`${sticky ? 'sticky' : 'relative'} top-0 z-40`}>{bar}</div>;
}
