import { priceLabel, rupees } from '../../../utils/format.js';
import { toneStyle, headingFontClass } from '../theme.js';
import ThemedButton from '../ThemedButton.jsx';
import FadeIn from '../FadeIn.jsx';

export default function Pricing({ property: p, data = {}, settings = {}, theme }) {
  const tone = settings.tone || 'dark';
  const price = priceLabel(p.purpose, p.price);
  const perArea = p.built_up_area ? `${rupees(Math.round(p.price / p.built_up_area))} / ${p.area_unit}` : null;

  return (
    <section id="ms-pricing" className="px-6 text-center" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className="mx-auto max-w-2xl">
        <h2 className={`${headingFontClass(theme)} mb-4 text-3xl font-semibold`}>{data.heading || 'Price'}</h2>
        <div className={`${headingFontClass(theme)} text-5xl font-bold tracking-tight md:text-6xl`} style={{ color: theme.secondaryColor }}>
          {price.main}
        </div>
        <div className="mt-1 text-base opacity-80">{price.suffix}</div>
        <div className="mt-2 text-sm opacity-60">
          {perArea}{p.price_negotiable ? (perArea ? ' · Negotiable' : 'Negotiable') : ''}
        </div>
        <div className="mt-8">
          <ThemedButton theme={theme} href="#ms-enquiry">{data.buttonText || 'Enquire Now'}</ThemedButton>
        </div>
      </FadeIn>
    </section>
  );
}
