import { useState } from 'react';
import { Expand, ArrowRight } from '../../../components/Icons.jsx';
import Section, { SectionHeading } from '../Section.jsx';
import ThemedButton from '../ThemedButton.jsx';
import Lightbox from '../Lightbox.jsx';
import { Reveal } from '../motion.jsx';

export default function FloorPlan({ anchorId = 'ms-floorplan', property: p, data = {}, settings = {} }) {
  const [open, setOpen] = useState(-1);
  if (!p.floor_plan_url) return null;
  const tone = settings.tone || 'light';

  return (
    <Section id={anchorId} tone={tone} width="max-w-5xl">
      <SectionHeading eyebrow="The layout" title={data.heading || 'Floor Plan'} align="center" className="mb-10 sm:mb-12" />
      <Reveal delay={0.1}>
        <div className="ms-frame">
          {/* drawn on a faint blueprint grid; the whole plan is the button that enlarges it */}
          <button type="button" onClick={() => setOpen(0)} aria-label="Enlarge the floor plan"
                  className="ms-blueprint ms-zoomable ms-focus group relative block w-full" style={{ border: 0, padding: 0 }}>
            <img src={p.floor_plan_url} alt={`${p.title} floor plan`} loading="lazy" className="mx-auto max-h-[560px] w-full object-contain p-4 sm:p-8" />
            <span className="ms-chip absolute bottom-4 right-4" style={{ background: 'var(--ms-primary)', color: 'var(--ms-on-primary)', borderColor: 'transparent' }}>
              <Expand style={{ width: 14, height: 14 }} /> Enlarge
            </span>
          </button>
        </div>
      </Reveal>
      <Reveal delay={0.2} className="mt-8 flex justify-center">
        <ThemedButton variant="secondary" href={p.floor_plan_url} icon={ArrowRight}>{data.buttonText || 'View Full Plan'}</ThemedButton>
      </Reveal>
      <Lightbox images={[p.floor_plan_url]} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} title={`${p.title} floor plan`} />
    </Section>
  );
}
