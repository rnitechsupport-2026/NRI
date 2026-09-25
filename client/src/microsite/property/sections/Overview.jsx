import { motion } from 'framer-motion';
import { Bed, Bath, Ruler, Sofa, Compass, Stairs, Clock } from '../../../components/Icons.jsx';
import { area, titleCase, rupees } from '../../../utils/format.js';
import { toneStyle, headingFontClass, cardStyle } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function Overview({ property: p, data = {}, settings = {}, theme }) {
  const tone = settings.tone || 'light';
  const facts = [
    { icon: Bed, label: 'Bedrooms', value: p.bhk ? `${p.bhk} BHK` : null },
    { icon: Bath, label: 'Bathrooms', value: p.bathrooms || null },
    { icon: Ruler, label: 'Built-up area', value: area(p.built_up_area, p.area_unit) },
    { icon: Sofa, label: 'Furnishing', value: p.furnishing ? titleCase(p.furnishing).replace('-', ' ') : null },
    { icon: Compass, label: 'Facing', value: p.facing || null },
    { icon: Stairs, label: 'Floor', value: p.floor_no ? `${p.floor_no} of ${p.total_floors || '—'}` : null },
    { icon: Clock, label: 'Possession', value: p.possession ? titleCase(p.possession) : null },
  ].filter((f) => f.value);

  const specs = [
    ['Property type', titleCase(p.property_type)],
    ['Carpet area', area(p.carpet_area, p.area_unit)],
    ['Age', p.age_years != null ? `${p.age_years} years` : null],
    ['Maintenance', p.maintenance ? `${rupees(p.maintenance)} / month` : null],
  ].filter(([, v]) => v);

  return (
    <section id="ms-overview" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'Property Overview'}</h2>
        </FadeIn>

        {facts.length > 0 && (
          <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {facts.map((f, i) => (
              <FadeIn key={f.label} delay={i * 0.05}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex h-full flex-col items-center gap-2 p-5 text-center"
                  style={cardStyle(tone)}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: `${theme.primaryColor}14` }}
                  >
                    <f.icon style={{ width: 20, height: 20, color: theme.primaryColor }} />
                  </span>
                  <b className="text-sm">{f.value}</b>
                  <span className="text-xs opacity-70">{f.label}</span>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        )}

        {p.description && (
          <FadeIn>
            <p className="mb-8 max-w-3xl whitespace-pre-line text-[15.5px] leading-[1.75] opacity-90">{p.description}</p>
          </FadeIn>
        )}

        {specs.length > 0 && (
          <FadeIn>
            <div className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
              {specs.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-2 text-sm" style={{ borderColor: 'rgba(127,127,127,0.15)' }}>
                  <span className="opacity-70">{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
