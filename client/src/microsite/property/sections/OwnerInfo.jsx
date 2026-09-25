import { Shield, Phone } from '../../../components/Icons.jsx';
import { Avatar } from '../../../components/ui.jsx';
import { ROLE_LABEL } from '../../../utils/format.js';
import { toneStyle, headingFontClass } from '../theme.js';
import ThemedButton from '../ThemedButton.jsx';
import FadeIn from '../FadeIn.jsx';

export default function OwnerInfo({ property: p, data = {}, settings = {}, theme }) {
  if (!p.owner_name) return null;
  const tone = settings.tone || 'light';

  return (
    <section id="ms-owner" className="px-6" style={{ ...toneStyle(theme, tone), paddingTop: 'var(--ms-pad-y)', paddingBottom: 'var(--ms-pad-y)' }}>
      <FadeIn className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className={`${headingFontClass(theme)} text-3xl font-semibold`}>{data.heading || 'Listed By'}</h2>
        <Avatar src={p.owner_avatar} name={p.owner_name} size="avatar-lg"
                style={{ width: 68, height: 68, boxShadow: `0 0 0 4px ${theme.secondaryColor}33` }} />
        <div>
          <div className="text-lg font-semibold">{p.owner_company || p.owner_name}</div>
          <div className="text-sm opacity-70">
            {ROLE_LABEL[p.owner_role]}
            {p.owner_experience ? ` · ${p.owner_experience} yrs experience` : ''}
          </div>
          {p.owner_verified && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(127,127,127,0.12)' }}>
              <Shield style={{ width: 12, height: 12 }} /> Verified
            </span>
          )}
        </div>
        {p.owner_phone && (
          <ThemedButton theme={theme} href={`tel:${p.owner_phone}`} icon={Phone}>{p.owner_phone}</ThemedButton>
        )}
      </FadeIn>
    </section>
  );
}
