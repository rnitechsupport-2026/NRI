import { toneStyle, headingFontClass } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export function TextBlock({ data = {}, settings = {}, theme }) {
  if (!data.text) return null;
  const tone = settings.tone || 'light';
  return (
    <section className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className="mx-auto max-w-3xl">
        {data.heading && <h2 className={`${headingFontClass(theme)} mb-4 text-2xl font-semibold`}>{data.heading}</h2>}
        <p className="whitespace-pre-line text-[15px] leading-relaxed opacity-90">{data.text}</p>
      </FadeIn>
    </section>
  );
}

export function ImageBlock({ data = {}, settings = {}, theme }) {
  if (!data.image) return null;
  const tone = settings.tone || 'light';
  return (
    <section className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className="mx-auto max-w-4xl overflow-hidden shadow-sm" style={{ borderRadius: 'var(--ms-radius)' }}>
        <img src={data.image} alt={data.alt || ''} className="w-full object-cover" />
      </FadeIn>
    </section>
  );
}

export function ImageTextBlock({ data = {}, settings = {}, theme }) {
  if (!data.image && !data.text) return null;
  const tone = settings.tone || 'light';
  const reverse = settings.imagePosition === 'right';
  return (
    <section className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className={`mx-auto grid max-w-5xl grid-cols-1 items-center gap-8 md:grid-cols-2 ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
        {data.image && (
          <div className="overflow-hidden shadow-sm" style={{ borderRadius: 'var(--ms-radius)' }}>
            <img src={data.image} alt={data.alt || ''} className="w-full object-cover" />
          </div>
        )}
        <div>
          {data.heading && <h3 className={`${headingFontClass(theme)} mb-3 text-2xl font-semibold`}>{data.heading}</h3>}
          {data.text && <p className="whitespace-pre-line text-[15px] leading-relaxed opacity-90">{data.text}</p>}
        </div>
      </FadeIn>
    </section>
  );
}

export function Divider() {
  return <div className="mx-auto max-w-5xl px-6"><hr style={{ border: 'none', borderTop: '1px solid rgba(127,127,127,0.2)' }} /></div>;
}

export function Spacer({ settings = {} }) {
  return <div style={{ height: settings.height || 40 }} />;
}
