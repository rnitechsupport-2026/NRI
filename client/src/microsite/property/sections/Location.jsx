import { MapPin, ArrowRight } from '../../../components/Icons.jsx';
import Section, { SectionHeading } from '../Section.jsx';
import ThemedButton from '../ThemedButton.jsx';
import { Reveal, Stagger, StaggerItem } from '../motion.jsx';

export default function Location({ anchorId = 'ms-location', property: p, data = {}, settings = {} }) {
  const tone = settings.tone || 'dark';
  const address = [p.address, p.locality, p.city].filter(Boolean).join(', ');
  const mapQuery = `${p.locality}, ${p.city}, ${p.state || 'India'}`;
  const places = [p.locality, p.city, p.state, p.pincode].filter(Boolean);

  return (
    <Section id={anchorId} tone={tone}>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
        <div className="flex flex-col gap-7">
          <SectionHeading eyebrow="Where it is" title={data.heading || 'Location'} />
          <Reveal delay={0.1} className="flex items-start gap-3">
            <span className="ms-icon"><MapPin /></span>
            <p className="pt-2.5 text-[15.5px] leading-relaxed">{address}{p.pincode ? ` ${p.pincode}` : ''}</p>
          </Reveal>
          {places.length > 0 && (
            <Stagger gap={0.05} className="flex flex-wrap gap-2">
              {places.map((place) => <StaggerItem key={place} as="span" className="ms-chip">{place}</StaggerItem>)}
            </Stagger>
          )}
          <Reveal delay={0.2}>
            <ThemedButton href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} icon={ArrowRight}>
              Open in Google Maps
            </ThemedButton>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          {/* the map sits slightly muted until it is hovered or focused */}
          <div className="ms-frame ms-map-embed">
            <div>
              <iframe
                title={`Map of ${mapQuery}`}
                width="100%" height="420" style={{ border: 0, display: 'block' }}
                loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
