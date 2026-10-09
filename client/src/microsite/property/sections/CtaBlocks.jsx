import { motion } from 'framer-motion';
import { Phone, Whatsapp, Calendar, Document } from '../../../components/Icons.jsx';
import Section from '../Section.jsx';
import ThemedButton from '../ThemedButton.jsx';
import { Stagger, StaggerItem } from '../motion.jsx';

/** A call to action is one bold panel, not another content section: on a light
 *  page it is a brand-colour slab, on a brand-colour section a glass card. */
function CtaShell({ id, data, settings, icon: Icon, defaultHeading, defaultBody, children }) {
  const tone = settings.tone || 'light';
  const slab = tone !== 'dark';
  return (
    <Section id={id} tone={tone} width="max-w-5xl">
      <Stagger
        className={`${slab ? 'ms-invert' : 'ms-card'} relative flex flex-col items-center gap-5 overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16`}
        style={slab ? {
          borderRadius: 'calc(var(--ms-radius) * 1.5)',
          color: 'var(--ms-on-primary)',
          background: 'radial-gradient(90% 120% at 100% 0%, color-mix(in srgb, var(--ms-secondary) 34%, transparent), transparent 60%), linear-gradient(135deg, var(--ms-primary), color-mix(in srgb, var(--ms-primary) 78%, var(--ms-shade)))',
          boxShadow: '0 50px 90px -50px color-mix(in srgb, var(--ms-primary) 80%, transparent)',
        } : undefined}
      >
        <StaggerItem>
          <motion.span
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--ms-secondary) 22%, transparent)', color: 'var(--ms-secondary)', boxShadow: '0 0 0 10px color-mix(in srgb, var(--ms-secondary) 8%, transparent)' }}
          >
            <Icon style={{ width: 26, height: 26 }} />
          </motion.span>
        </StaggerItem>
        <StaggerItem as="h2" className="ms-h2" style={{ fontSize: 'clamp(1.8rem, 1.2rem + 2.4vw, 3rem)' }}>{data.heading || defaultHeading}</StaggerItem>
        {(data.description || defaultBody) && (
          <StaggerItem as="p" className="max-w-xl text-[16.5px] leading-relaxed" style={{ opacity: 0.82 }}>{data.description || defaultBody}</StaggerItem>
        )}
        <StaggerItem className="mt-2">{children}</StaggerItem>
      </Stagger>
    </Section>
  );
}

export function CallCta({ anchorId = 'ms-call-cta', property: p, data = {}, settings = {} }) {
  if (!p.owner_phone) return null;
  return (
    <CtaShell id={anchorId} data={data} settings={settings} icon={Phone}
              defaultHeading="Have questions?" defaultBody="Call us directly for a quick answer.">
      <ThemedButton href={`tel:${p.owner_phone}`} icon={Phone}>{data.buttonText || 'Call Now'}</ThemedButton>
    </CtaShell>
  );
}

export function WhatsappCta({ anchorId = 'ms-whatsapp-cta', property: p, data = {}, settings = {} }) {
  if (!p.owner_phone) return null;
  const msg = encodeURIComponent(`Hi, I saw "${p.title}" on RNI Realestate and I am interested.`);
  return (
    <CtaShell id={anchorId} data={data} settings={settings} icon={Whatsapp}
              defaultHeading="Chat on WhatsApp" defaultBody="Get a fast reply, right where you already are.">
      <ThemedButton href={`https://wa.me/91${p.owner_phone}?text=${msg}`} icon={Whatsapp}>{data.buttonText || 'Message on WhatsApp'}</ThemedButton>
    </CtaShell>
  );
}

export function SiteVisitCta({ anchorId = 'ms-visit-cta', data = {}, settings = {} }) {
  return (
    <CtaShell id={anchorId} data={data} settings={settings} icon={Calendar}
              defaultHeading="Book a Site Visit" defaultBody="Tell us when works for you — we'll arrange the rest.">
      <ThemedButton href="#ms-enquiry" icon={Calendar}>{data.buttonText || 'Book a Visit'}</ThemedButton>
    </CtaShell>
  );
}

export function BrochureCta({ anchorId = 'ms-brochure-cta', property: p, data = {}, settings = {} }) {
  if (!p.floor_plan_url) return null;
  return (
    <CtaShell id={anchorId} data={data} settings={settings} icon={Document}
              defaultHeading="Want the details on paper?" defaultBody="Download the floor plan to review offline.">
      <ThemedButton href={p.floor_plan_url} icon={Document}>{data.buttonText || 'Download Floor Plan'}</ThemedButton>
    </CtaShell>
  );
}
