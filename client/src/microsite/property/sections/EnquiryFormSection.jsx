import EnquiryForm from '../../../components/EnquiryForm.jsx';
import { toneStyle, headingFontClass } from '../theme.js';
import FadeIn from '../FadeIn.jsx';

export default function EnquiryFormSection({ property: p, data = {}, settings = {}, theme }) {
  const tone = settings.tone || 'light';

  return (
    <section id="ms-enquiry" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className="mx-auto max-w-lg">
        <h2 className={`${headingFontClass(theme)} mb-2 text-center text-3xl font-semibold`}>{data.heading || 'Interested?'}</h2>
        <p className="mb-8 text-center text-sm opacity-70">{data.subheading || 'Share your details and get a call back within 24 hours.'}</p>
        <div className="bg-white p-1 shadow-xl" style={{ borderRadius: 'var(--ms-radius)' }}>
          <EnquiryForm propertyId={p.id} contactPhone={p.owner_phone} title="" />
        </div>
      </FadeIn>
    </section>
  );
}
