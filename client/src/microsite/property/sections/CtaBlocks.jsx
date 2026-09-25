import { motion } from 'framer-motion';
import { Phone, Whatsapp, Calendar, Document } from '../../../components/Icons.jsx';
import { toneStyle, headingFontClass } from '../theme.js';
import ThemedButton from '../ThemedButton.jsx';
import FadeIn from '../FadeIn.jsx';

function CtaShell({ id, data, settings, theme, icon: Icon, defaultHeading, defaultBody, children }) {
  const tone = settings.tone || 'light';
  return (
    <section id={id} className="px-6 text-center" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className="mx-auto flex max-w-xl flex-col items-center gap-3">
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: `${theme.secondaryColor}22` }}
        >
          <Icon style={{ width: 26, height: 26, color: theme.secondaryColor }} />
        </motion.span>
        <h2 className={`${headingFontClass(theme)} text-2xl font-semibold`}>{data.heading || defaultHeading}</h2>
        {(data.description || defaultBody) && <p className="opacity-75">{data.description || defaultBody}</p>}
        {children}
      </FadeIn>
    </section>
  );
}

export function CallCta({ property: p, data = {}, settings = {}, theme }) {
  if (!p.owner_phone) return null;
  return (
    <CtaShell id="ms-call-cta" data={data} settings={settings} theme={theme} icon={Phone}
              defaultHeading="Have questions?" defaultBody="Call us directly for a quick answer.">
      <ThemedButton theme={theme} href={`tel:${p.owner_phone}`} icon={Phone}>{data.buttonText || `Call ${p.owner_phone}`}</ThemedButton>
    </CtaShell>
  );
}

export function WhatsappCta({ property: p, data = {}, settings = {}, theme }) {
  if (!p.owner_phone) return null;
  const msg = encodeURIComponent(`Hi, I saw "${p.title}" on RNI Realestate and I am interested.`);
  return (
    <CtaShell id="ms-whatsapp-cta" data={data} settings={settings} theme={theme} icon={Whatsapp}
              defaultHeading="Chat on WhatsApp" defaultBody="Get a fast reply, right where you already are.">
      <ThemedButton theme={theme} href={`https://wa.me/91${p.owner_phone}?text=${msg}`} icon={Whatsapp}>{data.buttonText || 'Message on WhatsApp'}</ThemedButton>
    </CtaShell>
  );
}

export function SiteVisitCta({ data = {}, settings = {}, theme }) {
  return (
    <CtaShell id="ms-visit-cta" data={data} settings={settings} theme={theme} icon={Calendar}
              defaultHeading="Book a Site Visit" defaultBody="Tell us when works for you — we'll arrange the rest.">
      <ThemedButton theme={theme} href="#ms-enquiry" icon={Calendar}>{data.buttonText || 'Book a Visit'}</ThemedButton>
    </CtaShell>
  );
}

export function BrochureCta({ property: p, data = {}, settings = {}, theme }) {
  if (!p.floor_plan_url) return null;
  return (
    <CtaShell id="ms-brochure-cta" data={data} settings={settings} theme={theme} icon={Document}
              defaultHeading="Want the details on paper?" defaultBody="Download the floor plan to review offline.">
      <ThemedButton theme={theme} href={p.floor_plan_url} icon={Document}>{data.buttonText || 'Download Floor Plan'}</ThemedButton>
    </CtaShell>
  );
}
