import EnquiryForm from '../../../components/EnquiryForm.jsx';
import { Phone, Shield } from '../../../components/Icons.jsx';
import { Avatar } from '../../../components/ui.jsx';
import { ROLE_LABEL } from '../../../utils/format.js';
import Section, { SectionHeading } from '../Section.jsx';
import { Reveal } from '../motion.jsx';

export default function EnquiryFormSection({ anchorId = 'ms-enquiry', property: p, data = {}, settings = {} }) {
  const tone = settings.tone || 'light';

  return (
    <Section id={anchorId} tone={tone}>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="flex flex-col gap-7 lg:sticky lg:top-28">
          <SectionHeading
            eyebrow="Get in touch"
            title={data.heading || 'Interested?'}
            lead={data.subheading || 'Share your details and get a call back within 24 hours.'}
          />

          {/* who the enquiry goes to — only what the listing actually has */}
          {p.owner_name && (
            <Reveal delay={0.15} className="ms-card flex items-center gap-4 p-4">
              <Avatar src={p.owner_avatar} name={p.owner_name} style={{ width: 54, height: 54, flexShrink: 0 }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.owner_company || p.owner_name}</div>
                <div className="ms-muted flex flex-wrap items-center gap-x-2 text-xs">
                  {ROLE_LABEL[p.owner_role]}
                  {p.owner_verified && <span className="inline-flex items-center gap-1"><Shield style={{ width: 12, height: 12 }} /> Verified</span>}
                </div>
              </div>
              {p.owner_phone && (
                <a href={`tel:${p.owner_phone}`} aria-label={`Call ${p.owner_company || p.owner_name}`} className="ms-icon ms-focus" style={{ textDecoration: 'none' }}>
                  <Phone />
                </a>
              )}
            </Reveal>
          )}
        </div>

        <Reveal delay={0.1}>
          <div className="ms-form-card">
            {p.entity_type === 'project'
              ? <EnquiryForm projectId={p.id} contactPhone={p.owner_phone} title="" compact />
              : <EnquiryForm propertyId={p.id} contactPhone={p.owner_phone} title="" compact />}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
