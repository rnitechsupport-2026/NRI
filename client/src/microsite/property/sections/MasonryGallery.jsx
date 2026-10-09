import { useState } from 'react';
import Section, { SectionHeading } from '../Section.jsx';
import Lightbox, { PhotoTile } from '../Lightbox.jsx';
import { Stagger, StaggerItem } from '../motion.jsx';

// Deterministic tall/short rhythm instead of a uniform grid — every 1st and
// 4th tile (of every 6) spans two rows, giving the wall an asymmetric,
// magazine-spread feel rather than a plain photo grid.
const SPAN_PATTERN = ['row-span-2', '', '', 'row-span-2', '', ''];

export default function MasonryGallery({ anchorId = 'ms-gallery', property: p, data = {}, settings = {} }) {
  const images = (p.images?.length ? p.images.map((i) => i.url) : (p.cover_image ? [p.cover_image] : []));
  const [open, setOpen] = useState(-1);
  if (!images.length) return null;
  const tone = settings.tone || 'light';
  const radius = settings.imageRadius === false ? { borderRadius: 0 } : undefined;

  return (
    <Section id={anchorId} tone={tone} width="max-w-7xl">
      <SectionHeading
        eyebrow="In pictures"
        title={data.heading || 'Gallery'}
        lead={`${images.length} ${images.length === 1 ? 'photo' : 'photos'} — select any one to view it full screen.`}
        className="mb-10 sm:mb-14"
      />
      <Stagger gap={0.06} className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5" style={{ gridAutoRows: 'clamp(130px, 17vw, 210px)' }}>
        {images.map((src, i) => (
          <StaggerItem key={src + i} className={SPAN_PATTERN[i % SPAN_PATTERN.length]}>
            <PhotoTile src={src} alt={`${p.title} photo ${i + 1}`} label={String(i + 1).padStart(2, '0')} onOpen={() => setOpen(i)} className="h-full" style={radius} />
          </StaggerItem>
        ))}
      </Stagger>
      <Lightbox images={images} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} title={p.title} />
    </Section>
  );
}
