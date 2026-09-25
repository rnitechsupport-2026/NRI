import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Menu, X } from '../../components/Icons.jsx';
import ThemedButton from './ThemedButton.jsx';

export default function MicrositeNavbar({ property: p, navbar = {}, theme }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const items = (navbar.items || []).filter((i) => i.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sticky = navbar.sticky !== false;

  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sticky]);

  const bg = navbar.background || '#ffffff';

  return (
    <header
      className={`${sticky ? 'sticky top-0' : ''} z-40 flex items-center justify-between px-6 py-3 transition-shadow duration-300`}
      style={{
        background: scrolled ? bg : `${bg}f2`,
        backdropFilter: 'saturate(160%) blur(10px)',
        WebkitBackdropFilter: 'saturate(160%) blur(10px)',
        borderBottom: '1px solid rgba(127,127,127,0.12)',
        boxShadow: scrolled ? '0 6px 24px -12px rgba(0,0,0,0.18)' : 'none',
      }}
    >
      <div className="flex items-center gap-2 font-semibold">
        {navbar.showLogo && navbar.logoUrl ? (
          <img src={navbar.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
        ) : (
          <span style={{ color: theme.primaryColor }}>{p.title}</span>
        )}
      </div>

      <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
        {items.map((i) => (
          <a key={i.key} href={`#${i.key}`} className="relative opacity-80 transition-opacity hover:opacity-100">
            {i.label}
          </a>
        ))}
      </nav>

      <div className="hidden items-center gap-2 lg:flex">
        {p.owner_phone && <ThemedButton theme={theme} variant="secondary" href={`tel:${p.owner_phone}`} icon={Phone}>Call</ThemedButton>}
        <ThemedButton theme={theme} href="#ms-enquiry">Enquire</ThemedButton>
      </div>

      <button type="button" className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
        {open ? <X /> : <Menu />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full flex flex-col gap-3 border-t p-4 lg:hidden"
            style={{ background: bg, borderColor: 'rgba(127,127,127,0.15)' }}
          >
            {items.map((i) => (
              <a key={i.key} href={`#${i.key}`} onClick={() => setOpen(false)} className="text-sm font-medium">{i.label}</a>
            ))}
            <div className="flex gap-2">
              {p.owner_phone && <ThemedButton theme={theme} variant="secondary" href={`tel:${p.owner_phone}`} icon={Phone}>Call</ThemedButton>}
              <ThemedButton theme={theme} href="#ms-enquiry">Enquire</ThemedButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
