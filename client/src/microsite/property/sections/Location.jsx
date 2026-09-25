import { MapPin } from '../../../components/Icons.jsx';
import { toneStyle, headingFontClass } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function Location({ property: p, data = {}, settings = {}, theme }) {
  const tone = settings.tone || 'dark';
  const address = [p.address, p.locality, p.city].filter(Boolean).join(', ');
  const mapQuery = `${p.locality}, ${p.city}, ${p.state || 'India'}`;

  return (
    <section id="ms-location" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-3 text-3xl font-semibold`}>{data.heading || 'Location'}</h2>
          <p className="mb-6 flex items-center gap-1.5 opacity-80">
            <MapPin style={{ width: 15, height: 15, color: theme.secondaryColor, flexShrink: 0 }} />
            {address}{p.pincode ? ` ${p.pincode}` : ''}
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="overflow-hidden shadow-lg" style={{ borderRadius: 'var(--ms-radius)', border: '1px solid rgba(127,127,127,0.2)' }}>
            <iframe
              title="Location map"
              width="100%" height="380" style={{ border: 0, display: 'block' }}
              loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
