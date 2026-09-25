import { motion } from 'framer-motion';
import { amenityMeta } from '../amenityMeta.js';
import { toneStyle, headingFontClass, cardStyle } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function Amenities({ property: p, data = {}, settings = {}, theme }) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  if (!amenities.length) return null;
  const tone = settings.tone || 'dark';

  return (
    <section id="ms-amenities" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'Amenities'}</h2>
        </FadeIn>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {amenities.map((a, i) => {
            const meta = amenityMeta(a);
            const Icon = meta.icon;
            return (
              <FadeIn key={a} delay={Math.min(i * 0.04, 0.4)}>
                <motion.div
                  whileHover={{ y: -4, borderColor: theme.secondaryColor }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex h-full flex-col gap-2.5 p-4"
                  style={cardStyle(tone)}
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: `${theme.secondaryColor}22` }}
                  >
                    <Icon style={{ width: 18, height: 18, color: theme.secondaryColor }} />
                  </span>
                  <b className="text-sm">{a}</b>
                  <span className="text-xs opacity-70">{meta.blurb}</span>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
