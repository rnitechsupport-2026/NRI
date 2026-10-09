import { useState } from 'react';
import Section, { SectionHeading } from '../Section.jsx';
import Lightbox, { PhotoTile } from '../Lightbox.jsx';
import { Stagger, StaggerItem } from '../motion.jsx';

const COL_CLASS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' };

export default function Gallery({ anchorId = 'ms-gallery', property: p, data = {}, settings = {} }) {
  const images = (p.images?.length ? p.images.map((i) => i.url) : (p.cover_image ? [p.cover_image] : []));
  const [open, setOpen] = useState(-1);
  if (!images.length) return null;
  const tone = settings.tone || 'light';
  const wanted = COL_CLASS[settings.columns] ? settings.columns : 3;
  // Never leave one photo stranded on a row of its own: a handful of photos
  // use as many columns as they can fill evenly.
  const columns = images.length === 4 && wanted === 3 ? 2 : Math.max(2, Math.min(wanted, images.length));
  const radius = settings.imageRadius === false ? { borderRadius: 0 } : undefined;
  // With enough photos the first one leads, twice the size of the rest.
  const feature = images.length >= 5 && columns >= 3;

  return (
    <Section id={anchorId} tone={tone} width="max-w-7xl">
      <SectionHeading
        eyebrow="In pictures"
        title={data.heading || 'Gallery'}
        lead={`${images.length} ${images.length === 1 ? 'photo' : 'photos'} — select any one to view it full screen.`}
        className="mb-10 sm:mb-14"
      />
      <Stagger gap={0.06} className={`grid grid-cols-2 gap-2.5 sm:gap-3.5 ${COL_CLASS[columns]}`} style={{ gridAutoRows: 'clamp(130px, 21vw, 250px)' }}>
        {images.map((src, i) => (
          <StaggerItem key={src + i} className={feature && i === 0 ? 'col-span-2 row-span-2' : ''}>
            <PhotoTile
              src={src} alt={`${p.title} photo ${i + 1}`} label={settings.showCaptions ? `Photo ${i + 1}` : String(i + 1).padStart(2, '0')}
              onOpen={() => setOpen(i)} className="h-full" style={radius}
            />
          </StaggerItem>
        ))}
      </Stagger>
      <Lightbox images={images} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} title={p.title} />
    </Section>
  );
}
