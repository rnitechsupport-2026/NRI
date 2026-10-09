import { Bed, Bath, Ruler, Sofa, Compass, Stairs, Clock, Grid, Building, Layers } from '../../../components/Icons.jsx';
import { area, titleCase, rupees, shortDate } from '../../../utils/format.js';
import Section, { SectionHeading } from '../Section.jsx';
import Card from '../Card.jsx';
import { Reveal, Stagger, StaggerItem } from '../motion.jsx';

export default function Overview({ anchorId = 'ms-overview', property: p, data = {}, settings = {} }) {
  const tone = settings.tone || 'light';
  const isProject = p.entity_type === 'project';

  const facts = isProject ? [
    { icon: Grid, label: 'Configuration', value: p.configuration || null },
    { icon: Building, label: 'Total units', value: p.total_units || null },
    { icon: Layers, label: 'Towers', value: p.towers || null },
    { icon: Ruler, label: 'Area range', value: (p.min_area && p.max_area) ? `${p.min_area}–${p.max_area} sqft` : null },
    { icon: Clock, label: 'Possession', value: p.possession_on ? shortDate(p.possession_on) : null },
  ].filter((f) => f.value) : [
    { icon: Bed, label: 'Bedrooms', value: p.bhk ? `${p.bhk} BHK` : null },
    { icon: Bath, label: 'Bathrooms', value: p.bathrooms || null },
    { icon: Ruler, label: 'Built-up area', value: p.built_up_area ? area(p.built_up_area, p.area_unit) : null },
    { icon: Sofa, label: 'Furnishing', value: p.furnishing ? titleCase(p.furnishing).replace('-', ' ') : null },
    { icon: Compass, label: 'Facing', value: p.facing || null },
    { icon: Stairs, label: 'Floor', value: p.floor_no ? `${p.floor_no} of ${p.total_floors || '—'}` : null },
    { icon: Clock, label: 'Possession', value: p.possession ? titleCase(p.possession).replace(/-/g, ' ') : null },
  ].filter((f) => f.value);

  const specs = isProject ? [
    ['Project type', titleCase(p.property_type)],
    ['RERA number', p.rera_no || null],
  ].filter(([, v]) => v) : [
    ['Property type', titleCase(p.property_type)],
    ['Carpet area', p.carpet_area ? area(p.carpet_area, p.area_unit) : null],
    ['Age', p.age_years != null ? `${p.age_years} years` : null],
    ['Maintenance', p.maintenance ? `${rupees(p.maintenance)} / month` : null],
  ].filter(([, v]) => v);

  return (
    <Section id={anchorId} tone={tone}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* the story stays in view on the left while the facts scroll past */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading eyebrow={isProject ? 'The project' : 'The property'} title={data.heading || (isProject ? 'Project Overview' : 'Property Overview')} />
          {p.description && (
            <Reveal delay={0.1}><p className="ms-lead whitespace-pre-line">{p.description}</p></Reveal>
          )}
        </div>

        <div className="flex flex-col gap-8">
          {facts.length > 0 && (
            <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {facts.map((f) => (
                <Card key={f.label} className="flex flex-col gap-4 p-4 sm:p-5">
                  <span className="ms-icon"><f.icon /></span>
                  <div>
                    <div className="ms-display text-lg font-semibold leading-tight sm:text-xl">{f.value}</div>
                    <div className="ms-muted mt-1 text-xs font-medium uppercase tracking-[0.14em]">{f.label}</div>
                  </div>
                </Card>
              ))}
            </Stagger>
          )}

          {specs.length > 0 && (
            <Stagger as="dl" className="grid grid-cols-1 gap-x-10 sm:grid-cols-2" style={{ margin: 0 }}>
              {specs.map(([k, v]) => (
                <StaggerItem key={k} className="flex items-baseline justify-between gap-4 py-3.5 text-sm" style={{ borderBottom: '1px solid var(--ms-card-line)' }}>
                  <dt className="ms-muted">{k}</dt>
                  <dd className="text-right font-semibold" style={{ margin: 0 }}>{v}</dd>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </div>
    </Section>
  );
}
