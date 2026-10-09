import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { imageMapSource, normalizeHotspots } from '../media.js';
import Section, { SectionHeading } from '../Section.jsx';
import Card from '../Card.jsx';
import { Reveal, Stagger, EASE } from '../motion.jsx';
import '../../../plotmap/plotmap.css';
import MapViewer from '../../../plotmap/components/map/MapViewer.jsx';

/** The listing's PlotMapper map: its one image with every plot (land) or the
 *  floor-wise flats (apartment), status colours and the detail popup — the
 *  same viewer and published snapshot PlotMapper's public page uses. */
function PlotMapSection({ anchorId, map, data, tone }) {
  const isApartment = map.project.type === 'APARTMENT';
  return (
    <Section id={anchorId} tone={tone}>
      <SectionHeading
        eyebrow="Availability"
        title={data.heading || (isApartment ? 'Floor Plans & Availability' : 'Plot Layout & Availability')}
        lead={data.subheading || (isApartment
          ? 'Choose a floor, then select a flat to see its details and availability.'
          : 'Select a plot to see its details and availability.')}
        className="mb-10 sm:mb-12"
      >
        {map.draft && (
          <span className="ms-chip">Preview of your map draft — visitors see it once the map is published.</span>
        )}
      </SectionHeading>
      <Reveal delay={0.1}>
        <div className="ms-frame">
          <MapViewer project={map.project} floors={map.floors} properties={map.properties} heightClass="h-[70vh] min-h-[340px]" className="!border-0" />
        </div>
      </Reveal>
    </Section>
  );
}

/** One image of the property (floor plan, site layout, a photo) with numbered
 *  points on it — each point and its caption is placed by the lister in the
 *  builder, so nothing here is inferred about the property. Renders nothing
 *  until there's something to show: at least one point, or a chosen image. */
export default function ImageMap({ anchorId = 'ms-image-map', property: p, data = {}, settings = {} }) {
  const [active, setActive] = useState(-1);
  const tone = settings.tone || 'light';
  // A listing with a plot map shows that; the hand-placed points below are
  // for listings (and builder projects) that don't have one.
  if (p.plot_map?.project?.layoutImage) {
    return <PlotMapSection anchorId={anchorId} map={p.plot_map} data={data} tone={tone} />;
  }
  const hotspots = normalizeHotspots(data.hotspots);
  const image = imageMapSource(p, data);
  if (!image || (!hotspots.length && !data.image)) return null;

  return (
    <Section id={anchorId} tone={tone}>
      <SectionHeading
        eyebrow="Explore"
        title={data.heading || 'Explore the Property'}
        lead={(data.subheading || hotspots.length > 0) ? (data.subheading || 'Select a point on the image to see what’s there.') : undefined}
        className="mb-10 sm:mb-12"
      />

      <div className={`grid grid-cols-1 items-start gap-6 ${hotspots.length ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
        <Reveal delay={0.1}>
          <div className="ms-frame">
            <div className="relative" style={{ overflow: 'visible' }}>
              <img src={image} alt={data.heading || `${p.title} — image map`} className="w-full" style={{ borderRadius: 'var(--ms-radius)' }} />
              {hotspots.map((h, i) => {
                const on = i === active;
                // Keep the caption inside the image: open it away from whichever edge the point is near.
                const side = h.x < 30 ? { left: 0 } : h.x > 70 ? { right: 0 } : { left: '50%', x: '-50%' };
                const below = h.y < 35;
                return (
                  <div key={i} className="absolute" style={{ left: `${h.x}%`, top: `${h.y}%`, transform: 'translate(-50%, -50%)', zIndex: on ? 20 : 10 }}>
                    <motion.button
                      type="button" data-hotspot aria-label={h.label || `Point ${i + 1}`} aria-expanded={on}
                      onClick={() => setActive(on ? -1 : i)}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      animate={{ scale: on ? 1.18 : 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className={`ms-focus flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shadow-lg ${on ? '' : 'ms-pin'}`}
                      style={{
                        background: on ? 'var(--ms-primary)' : 'var(--ms-secondary)',
                        color: on ? 'var(--ms-on-primary)' : 'var(--ms-on-secondary)',
                        border: '2px solid var(--ms-paper)',
                      }}
                    >
                      {i + 1}
                    </motion.button>
                    <AnimatePresence>
                      {on && (h.label || h.description) && (
                        <motion.div
                          initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.25, ease: EASE }}
                          className="absolute w-60 max-w-[70vw] p-4 text-left shadow-2xl"
                          style={{
                            ...side, ...(below ? { top: 'calc(100% + 10px)' } : { bottom: 'calc(100% + 10px)' }),
                            background: 'var(--ms-paper)', color: 'var(--ms-ink)', borderRadius: 'var(--ms-radius)',
                          }}
                        >
                          {h.label && <b className="block text-sm">{h.label}</b>}
                          {h.description && <span className="mt-1 block text-xs opacity-70">{h.description}</span>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {hotspots.length > 0 && (
          <Stagger gap={0.06} className="flex flex-col gap-2.5">
            {hotspots.map((h, i) => {
              const on = i === active;
              return (
                <Card key={i} lift={-3} style={on ? { borderColor: 'var(--ms-accent)' } : undefined}>
                  <button
                    type="button"
                    onClick={() => setActive(on ? -1 : i)}
                    onMouseEnter={() => setActive(i)}
                    className="ms-focus flex w-full items-start gap-3 p-3.5 text-left"
                    style={{ background: 'none', border: 0, color: 'inherit' }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300"
                      style={{ background: on ? 'var(--ms-primary)' : 'var(--ms-secondary)', color: on ? 'var(--ms-on-primary)' : 'var(--ms-on-secondary)', outline: on ? '2px solid var(--ms-card-line)' : 'none' }}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <b className="block text-sm">{h.label || `Point ${i + 1}`}</b>
                      {h.description && <span className="ms-muted mt-0.5 block text-xs">{h.description}</span>}
                    </span>
                  </button>
                </Card>
              );
            })}
          </Stagger>
        )}
      </div>
    </Section>
  );
}
