import Section, { SectionHeading } from '../Section.jsx';
import Card from '../Card.jsx';
import { Stagger } from '../motion.jsx';

export default function Highlights({ anchorId = 'ms-highlights', data = {}, settings = {} }) {
  const items = Array.isArray(data.items) ? data.items.filter(Boolean) : [];
  if (!items.length) return null;
  const tone = settings.tone || 'light';

  return (
    <Section id={anchorId} tone={tone}>
      <SectionHeading eyebrow="Why it stands out" title={data.heading || 'Highlights'} className="mb-10 sm:mb-14" />
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <Card key={i} className="flex flex-col gap-5 p-6">
            {/* oversized index numeral, the way a brochure numbers its selling points */}
            <span className="ms-display ms-accent text-4xl font-semibold leading-none opacity-80" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <hr className="ms-rule" />
            <p className="text-[15.5px] leading-relaxed">{item}</p>
          </Card>
        ))}
      </Stagger>
    </Section>
  );
}
