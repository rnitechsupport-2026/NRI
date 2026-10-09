import { Star } from '../../../components/Icons.jsx';
import Section, { SectionHeading } from '../Section.jsx';
import Card from '../Card.jsx';
import { Stagger } from '../motion.jsx';

export default function Testimonials({ anchorId = 'ms-testimonials', data = {}, settings = {} }) {
  const items = Array.isArray(data.items) ? data.items.filter((t) => t?.text) : [];
  if (!items.length) return null;
  const tone = settings.tone || 'light';

  return (
    <Section id={anchorId} tone={tone}>
      <SectionHeading eyebrow="In their words" title={data.heading || 'What People Say'} className="mb-10 sm:mb-14" />
      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((t, i) => (
          <Card key={i} className="flex h-full flex-col gap-4 p-6">
            <span className="ms-display ms-accent text-5xl leading-none opacity-70" aria-hidden="true">“</span>
            <p className="-mt-4 flex-1 text-[15.5px] leading-relaxed">{t.text}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{t.name || 'Anonymous'}</span>
              <span className="ms-accent flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, s) => <Star key={s} style={{ width: 13, height: 13 }} />)}
              </span>
            </div>
          </Card>
        ))}
      </Stagger>
    </Section>
  );
}
