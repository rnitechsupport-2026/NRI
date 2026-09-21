import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import MagneticButton from './MagneticButton.jsx';

const LINKS = [
  { id: 'story', label: 'Story' },
  { id: 'experience', label: 'Experience' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'floorplan', label: 'Floor Plan' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location' },
];

export default function StickyNavigation({ propertyName }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function go(id) {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-cream/85 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.06)]'
            /* Not scrolled yet = nav sits directly over the hero photo. White text alone
               isn't reliable against an arbitrary photo, so a permanent scrim guarantees
               contrast instead of depending on hover or where the photo happens to be light. */
            : 'bg-gradient-to-b from-ink/55 via-ink/20 to-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-5 md:px-12">
          <button onClick={() => go('hero')} className={`ms-serif text-lg tracking-wide ${scrolled ? 'text-ink' : 'text-white drop-shadow-sm'}`}>
            {propertyName}
          </button>

          <nav className="hidden lg:flex items-center gap-9">
            {LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className={`text-xs uppercase tracking-[0.2em] transition-colors ${
                  scrolled ? 'text-ink/70 hover:text-ink' : 'text-white/90 drop-shadow-sm hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:block">
            <MagneticButton onClick={() => go('visit')} variant={scrolled ? 'solid' : 'ghost'} className={scrolled ? '' : 'text-white'}>
              Schedule Visit
            </MagneticButton>
          </div>

          <button
            onClick={() => setOpen(true)}
            className={`lg:hidden ${scrolled ? 'text-ink' : 'text-white drop-shadow-sm'}`}
            aria-label="Open menu"
          >
            <Menu size={26} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[60] flex flex-col bg-ink px-8 py-7 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="ms-serif text-lg text-white">{propertyName}</span>
              <button onClick={() => setOpen(false)} className="text-white" aria-label="Close menu">
                <X size={26} strokeWidth={1.5} />
              </button>
            </div>
            <nav className="mt-16 flex flex-1 flex-col gap-7">
              {LINKS.map((l, i) => (
                <motion.button
                  key={l.id}
                  onClick={() => go(l.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.4 }}
                  className="ms-serif text-left text-3xl text-white/90"
                >
                  {l.label}
                </motion.button>
              ))}
            </nav>
            <MagneticButton onClick={() => go('visit')} variant="gold" className="w-full">
              Schedule Visit
            </MagneticButton>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
