import { motion } from 'framer-motion';
import { Check } from '../../../components/Icons.jsx';
import { toneStyle, headingFontClass, cardStyle } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function Highlights({ data = {}, settings = {}, theme }) {
  const items = Array.isArray(data.items) ? data.items.filter(Boolean) : [];
  if (!items.length) return null;
  const tone = settings.tone || 'light';

  return (
    <section id="ms-highlights" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'Highlights'}</h2>
        </FadeIn>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((item, i) => (
            <FadeIn key={i} delay={Math.min(i * 0.06, 0.4)}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex h-full items-start gap-3 p-4"
                style={cardStyle(tone)}
              >
                <Check style={{ width: 18, height: 18, color: theme.secondaryColor, flexShrink: 0, marginTop: 2 }} />
                <span className="text-sm">{item}</span>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
