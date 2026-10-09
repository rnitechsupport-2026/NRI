import { amenityMeta } from '../amenityMeta.js';
import Section, { SectionHeading } from '../Section.jsx';
import Card from '../Card.jsx';
import { Stagger } from '../motion.jsx';

export default function Amenities({ anchorId = 'ms-amenities', property: p, data = {}, settings = {} }) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  if (!amenities.length) return null;
  const tone = settings.tone || 'dark';

  return (
    <Section id={anchorId} tone={tone}>
      <SectionHeading
        eyebrow="Life here"
        title={data.heading || 'Amenities'}
        lead={`${amenities.length} ${amenities.length === 1 ? 'amenity' : 'amenities'} come with this ${p.entity_type === 'project' ? 'project' : 'property'}.`}
        className="mb-10 sm:mb-14"
      />
      <Stagger gap={0.05} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {amenities.map((a) => {
          const meta = amenityMeta(a);
          const Icon = meta.icon;
          return (
            <Card key={a} className="flex flex-col gap-4 p-4 sm:p-5">
              <span className="ms-icon"><Icon /></span>
              <div>
                <div className="text-[15px] font-semibold leading-snug">{a}</div>
                <div className="ms-muted mt-1 text-[12.5px] leading-relaxed">{meta.blurb}</div>
              </div>
            </Card>
          );
        })}
      </Stagger>
    </Section>
  );
}
