import { Shield, Phone } from '../../../components/Icons.jsx';
import { Avatar } from '../../../components/ui.jsx';
import { ROLE_LABEL } from '../../../utils/format.js';
import Section from '../Section.jsx';
import Card from '../Card.jsx';
import ThemedButton from '../ThemedButton.jsx';
import { Stagger } from '../motion.jsx';

export default function OwnerInfo({ anchorId = 'ms-owner', property: p, data = {}, settings = {} }) {
  if (!p.owner_name) return null;
  const tone = settings.tone || 'light';

  return (
    <Section id={anchorId} tone={tone} width="max-w-4xl">
      <Stagger>
        <Card hover={false} className="flex flex-col items-center gap-6 p-7 text-center sm:flex-row sm:p-10 sm:text-left">
          <Avatar src={p.owner_avatar} name={p.owner_name} size="avatar-lg"
                  style={{ width: 96, height: 96, flexShrink: 0, boxShadow: '0 0 0 4px var(--ms-card), 0 0 0 6px var(--ms-accent)' }} />
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
            <span className="ms-eyebrow">{data.heading || 'Listed By'}</span>
            <h2 className="ms-h3">{p.owner_company || p.owner_name}</h2>
            <p className="ms-muted text-sm">
              {ROLE_LABEL[p.owner_role]}
              {p.owner_experience ? ` · ${p.owner_experience} yrs experience` : ''}
            </p>
            {p.owner_verified && <span className="ms-chip"><Shield style={{ width: 13, height: 13 }} /> Verified</span>}
          </div>
          {p.owner_phone && <ThemedButton href={`tel:${p.owner_phone}`} icon={Phone}>Call Now</ThemedButton>}
        </Card>
      </Stagger>
    </Section>
  );
}
