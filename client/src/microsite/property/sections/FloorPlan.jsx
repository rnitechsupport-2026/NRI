import { toneStyle, headingFontClass } from '../theme.js';
import ThemedButton from '../ThemedButton.jsx';
import FadeIn from '../FadeIn.jsx';

export default function FloorPlan({ property: p, data = {}, settings = {}, theme }) {
  if (!p.floor_plan_url) return null;
  const tone = settings.tone || 'light';

  return (
    <section id="ms-floorplan" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <div className="mx-auto max-w-4xl text-center">
        <FadeIn>
          <h2 className={`${headingFontClass(theme)} mb-8 text-3xl font-semibold`}>{data.heading || 'Floor Plan'}</h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="overflow-hidden bg-white shadow-sm" style={{ borderRadius: 'var(--ms-radius)', border: '1px solid rgba(127,127,127,0.15)' }}>
            <img src={p.floor_plan_url} alt="Floor plan" className="mx-auto max-h-[520px] w-full object-contain p-4" />
          </div>
          <div className="mt-6">
            <ThemedButton theme={theme} href={p.floor_plan_url}>{data.buttonText || 'View Full Plan'}</ThemedButton>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
