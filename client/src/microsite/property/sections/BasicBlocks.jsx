import Section from '../Section.jsx';
import { Reveal, Stagger, StaggerItem } from '../motion.jsx';

export function TextBlock({ anchorId, data = {}, settings = {} }) {
  if (!data.text) return null;
  return (
    <Section id={anchorId} tone={settings.tone || 'light'} width="max-w-3xl">
      <Stagger className="flex flex-col gap-5">
        {data.heading && <StaggerItem as="h2" className="ms-h2" style={{ fontSize: 'clamp(1.7rem, 1.2rem + 2vw, 2.6rem)' }}>{data.heading}</StaggerItem>}
        <StaggerItem as="p" className="ms-lead whitespace-pre-line" style={{ maxWidth: 'none' }}>{data.text}</StaggerItem>
      </Stagger>
    </Section>
  );
}

export function ImageBlock({ anchorId, data = {}, settings = {} }) {
  if (!data.image) return null;
  return (
    <Section id={anchorId} tone={settings.tone || 'light'} width="max-w-5xl">
      <Reveal>
        <div className="ms-frame ms-zoomable">
          <div><img src={data.image} alt={data.alt || ''} loading="lazy" className="w-full object-cover" /></div>
        </div>
      </Reveal>
    </Section>
  );
}

export function ImageTextBlock({ anchorId, data = {}, settings = {} }) {
  if (!data.image && !data.text) return null;
  const reverse = settings.imagePosition === 'right';
  return (
    <Section id={anchorId} tone={settings.tone || 'light'}>
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 lg:gap-16">
        {data.image && (
          <Reveal className={reverse ? 'md:order-2' : ''}>
            <div className="ms-frame ms-zoomable">
              <div><img src={data.image} alt={data.alt || ''} loading="lazy" className="w-full object-cover" /></div>
            </div>
          </Reveal>
        )}
        <Stagger className="flex flex-col gap-5">
          {data.heading && <StaggerItem as="h2" className="ms-h2" style={{ fontSize: 'clamp(1.7rem, 1.2rem + 2vw, 2.6rem)' }}>{data.heading}</StaggerItem>}
          {data.text && <StaggerItem as="p" className="ms-lead whitespace-pre-line">{data.text}</StaggerItem>}
        </Stagger>
      </div>
    </Section>
  );
}

export function Divider() {
  return <div className="mx-auto max-w-6xl px-6"><hr style={{ border: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--ms-line), transparent)' }} /></div>;
}

export function Spacer({ settings = {} }) {
  return <div aria-hidden="true" style={{ height: settings.height || 40 }} />;
}
