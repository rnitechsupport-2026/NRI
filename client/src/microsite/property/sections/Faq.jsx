import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from '../../../components/Icons.jsx';
import { toneStyle, headingFontClass, cardStyle } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function Faq({ data = {}, settings = {}, theme }) {
  const items = Array.isArray(data.items) ? data.items.filter((f) => f?.question) : [];
  const [open, setOpen] = useState(0);
  if (!items.length) return null;
  const tone = settings.tone || 'light';

  return (
    <section id="ms-faq" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-3xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'Frequently Asked Questions'}</h2>
        </FadeIn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((f, i) => (
            <FadeIn key={i} delay={Math.min(i * 0.06, 0.3)}>
              <div style={cardStyle(tone)}>
                <button
                  type="button"
                  onClick={() => setOpen((cur) => (cur === i ? -1 : i))}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold"
                >
                  {f.question}
                  <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                    <ChevronDown style={{ width: 16, height: 16, flexShrink: 0 }} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && f.answer && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}
                    >
                      <p className="px-4 pb-4 text-sm opacity-80">{f.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
