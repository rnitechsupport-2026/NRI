import { motion } from 'framer-motion';
import { Star } from '../../../components/Icons.jsx';
import { toneStyle, headingFontClass, cardStyle } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function Testimonials({ data = {}, settings = {}, theme }) {
  const items = Array.isArray(data.items) ? data.items.filter((t) => t?.text) : [];
  if (!items.length) return null;
  const tone = settings.tone || 'light';

  return (
    <section id="ms-testimonials" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'What People Say'}</h2>
        </FadeIn>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {items.map((t, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <motion.div whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="h-full p-5" style={cardStyle(tone)}>
                <div className="mb-2 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} style={{ width: 14, height: 14, color: theme.secondaryColor }} />
                  ))}
                </div>
                <p className="mb-3 text-sm italic opacity-90">"{t.text}"</p>
                <div className="text-xs font-semibold opacity-70">{t.name || 'Anonymous'}</div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
