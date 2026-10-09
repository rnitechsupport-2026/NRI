import { useEffect, useRef, useState } from 'react';
import { MotionConfig, motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import '../microsite.css';
import './premium.css';
import { SECTION_REGISTRY } from './registry.js';
import { resolveTheme } from './theme.js';
import MicrositeNavbar from './MicrositeNavbar.jsx';
import ThemedButton from './ThemedButton.jsx';
import { Phone } from '../../components/Icons.jsx';

/** Thin reading-progress line across the top of a full-page microsite. */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  return <motion.div aria-hidden="true" className="ms-scrollbar-progress" style={{ scaleX }} />;
}

/** Phones: Call + Enquire stay one thumb away once the hero has scrolled off,
 *  and step aside again when the enquiry form itself is on screen. */
function MobileActionBar({ rootRef, property: p, navbar, hasEnquiry }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const win = root?.ownerDocument?.defaultView;
    if (!root || !win) return undefined;
    const update = () => {
      const form = root.querySelector('#ms-enquiry');
      const rect = form?.getBoundingClientRect();
      const formOnScreen = rect ? rect.top < win.innerHeight * 0.8 && rect.bottom > 0 : false;
      setShow(win.scrollY > win.innerHeight * 0.6 && !formOnScreen);
    };
    update();
    win.addEventListener('scroll', update, { passive: true });
    win.addEventListener('resize', update);
    return () => { win.removeEventListener('scroll', update); win.removeEventListener('resize', update); };
  }, [rootRef]);

  // On a full page the floating assistant moves up to make room (premium.css).
  useEffect(() => {
    const root = rootRef.current;
    const body = root?.ownerDocument?.body;
    if (!body || root.parentElement?.tagName !== 'MAIN') return undefined;
    body.classList.toggle('ms-has-bar', show);
    return () => body.classList.remove('ms-has-bar');
  }, [show, rootRef]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="ms-glass-panel ms-invert fixed inset-x-3 bottom-3 z-50 flex items-center gap-2 p-2 md:hidden"
          style={{ background: 'color-mix(in srgb, var(--ms-primary) 88%, transparent)', color: 'var(--ms-on-primary)' }}
        >
          {p.owner_phone && (
            <ThemedButton variant="ghost" size="sm" href={`tel:${p.owner_phone}`} icon={Phone} className="flex-1">Call</ThemedButton>
          )}
          {(navbar.ctaLink || hasEnquiry) && (
            <ThemedButton size="sm" href={navbar.ctaLink || '#ms-enquiry'} className="flex-[1.4]">{navbar.ctaLabel || 'Enquire Now'}</ThemedButton>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The one renderer shared by template previews, the drag-and-drop builder's
 * live canvas, and the published public page. It reads the property once and
 * paints whichever sections/theme/navbar it's handed — swapping those is the
 * only thing that should ever change the output (see registry.js).
 */
export default function MicrositeRenderer({ property, sections = [], theme: themeInput, navbar = {}, className = '' }) {
  const rootRef = useRef(null);
  const [fullPage, setFullPage] = useState(false);
  const theme = resolveTheme(themeInput);

  // Rendered straight into <main> = this IS the page (not a builder or
  // template preview). Only then does it own page-level things: the progress
  // line, and the assistant launcher (which lives outside this tree, so the
  // theme colours are mirrored onto <body> for it — see premium.css).
  useEffect(() => {
    const root = rootRef.current;
    const body = root?.ownerDocument?.body;
    if (!body || root.parentElement?.tagName !== 'MAIN') return undefined;
    setFullPage(true);
    body.classList.add('ms-themed');
    body.style.setProperty('--ms-primary', theme.primaryColor);
    body.style.setProperty('--ms-on-primary', theme.cssVars['--ms-on-primary']);
    return () => {
      body.classList.remove('ms-themed');
      body.style.removeProperty('--ms-primary');
      body.style.removeProperty('--ms-on-primary');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.primaryColor]);

  if (!property) return null;
  const visible = sections.filter((s) => s.isVisible !== false).sort((a, b) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0));
  const hasEnquiry = visible.some((s) => s.sectionType === 'enquiryForm');

  // Each section gets a unique id: the first of its anchor keeps the plain
  // one (what links point at), later ones are numbered.
  const seen = {};
  const anchorFor = (type) => {
    const anchor = SECTION_REGISTRY[type]?.anchor;
    if (!anchor) return undefined;
    seen[anchor] = (seen[anchor] || 0) + 1;
    return seen[anchor] === 1 ? anchor : `${anchor}-${seen[anchor]}`;
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={`ms-root msb ${className}`} style={theme.cssVars} {...theme.data}>
        {fullPage && <ScrollProgress />}
        <MicrositeNavbar property={property} navbar={navbar} theme={theme} overHero={visible[0]?.sectionType === 'hero'} />
        {visible.map((s, i) => {
          const entry = SECTION_REGISTRY[s.sectionType];
          if (!entry) return null;
          const Comp = entry.component;
          return (
            <Comp
              key={s.id || `${s.sectionType}-${i}`}
              anchorId={anchorFor(s.sectionType)}
              property={property}
              data={s.sectionData || {}}
              settings={s.settings || {}}
              theme={theme}
            />
          );
        })}
        {(hasEnquiry || property.owner_phone) && <MobileActionBar rootRef={rootRef} property={property} navbar={navbar} hasEnquiry={hasEnquiry} />}
      </div>
    </MotionConfig>
  );
}
