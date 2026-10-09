import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from '../../../components/Icons.jsx';
import Section, { SectionHeading } from '../Section.jsx';
import Card from '../Card.jsx';
import { Stagger, EASE } from '../motion.jsx';

export default function Faq({ anchorId = 'ms-faq', data = {}, settings = {} }) {
  const items = Array.isArray(data.items) ? data.items.filter((f) => f?.question) : [];
  const [open, setOpen] = useState(0);
  if (!items.length) return null;
  const tone = settings.tone || 'light';

  return (
    <Section id={anchorId} tone={tone} width="max-w-3xl">
      <SectionHeading eyebrow="Good to know" title={data.heading || 'Frequently Asked Questions'} className="mb-10" />
      <Stagger gap={0.06} className="flex flex-col gap-3">
        {items.map((f, i) => {
          const on = open === i;
          return (
            <Card key={i} lift={-2} style={on ? { borderColor: 'color-mix(in srgb, var(--ms-accent) 45%, transparent)' } : undefined}>
              <button
                type="button"
                onClick={() => setOpen(on ? -1 : i)}
                aria-expanded={on} aria-controls={`${anchorId}-a${i}`} id={`${anchorId}-q${i}`}
                className="ms-focus flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15.5px] font-semibold"
                style={{ background: 'none', border: 0, color: 'inherit' }}
              >
                {f.question}
                <motion.span animate={{ rotate: on ? 45 : 0 }} transition={{ duration: 0.3, ease: EASE }} className="ms-accent shrink-0">
                  <Plus style={{ width: 18, height: 18 }} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {on && f.answer && (
                  <motion.div
                    id={`${anchorId}-a${i}`} role="region" aria-labelledby={`${anchorId}-q${i}`}
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }} style={{ overflow: 'hidden' }}
                  >
                    <p className="ms-muted px-5 pb-5 text-[15px] leading-relaxed">{f.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </Stagger>
    </Section>
  );
}
