import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Notice, PageLoader } from '../../../components/ui.jsx';
import MicrositeRenderer from '../../../microsite/property/MicrositeRenderer.jsx';
import { TEMPLATES } from '../../../microsite/property/templates.js';
import { extractAccentColor } from '../../../microsite/property/colorFromImage.js';

/** A template's navbar is sometimes deliberately branded (its background set
 *  to the same color as theme.primaryColor, e.g. Premium Luxury's navy bar)
 *  and sometimes deliberately neutral (a plain white/cream bar, e.g. Modern
 *  Real Estate). Swapping in the lister's logo color should re-brand the
 *  former but leave the latter's "clean, neutral" look alone — so the navbar
 *  only follows primaryColor when it was already tied to it. */
function withLogoColor(template, logoColor) {
  if (!logoColor) return { theme: template.theme, navbar: template.navbar };
  const navWasBranded = template.navbar.background === template.theme.primaryColor;
  return {
    theme: { ...template.theme, primaryColor: logoColor },
    navbar: navWasBranded ? { ...template.navbar, background: logoColor } : template.navbar,
  };
}

export default function ChooseTemplate() {
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId');
  const projectId = params.get('projectId');
  const isProject = !!projectId;
  const entityId = projectId || propertyId;
  const nav = useNavigate();
  const toast = useToast();

  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState('');
  const [previewId, setPreviewId] = useState(TEMPLATES[0].id);
  const [logoColor, setLogoColor] = useState(null);

  useEffect(() => {
    if (!entityId) { setError(`No ${isProject ? 'project' : 'property'} selected.`); return; }
    api.get(`/microsites/${isProject ? 'project' : 'property'}/${entityId}/preview`)
      .then((r) => setProperty(r.data.data))
      .catch((e) => setError(errMsg(e, `Could not load this ${isProject ? 'project' : 'property'}`)));
  }, [entityId, isProject]);

  useEffect(() => {
    if (!property?.owner_avatar) return;
    let live = true;
    extractAccentColor(property.owner_avatar).then((c) => { if (live) setLogoColor(c); });
    return () => { live = false; };
  }, [property?.owner_avatar]);

  async function useTemplate(template) {
    setCreating(template.id);
    try {
      const branded = withLogoColor(template, logoColor);
      const { data } = await api.post('/microsites', {
        entity_type: isProject ? 'project' : 'property',
        entity_id: entityId,
        template_id: template.id,
        sections: template.sections,
        theme: branded.theme,
        navbar: branded.navbar,
      });
      toast.success('Microsite created — now customize it');
      nav(`/dashboard/microsites/${data.data.microsite.id}/build`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setCreating('');
    }
  }

  if (error) {
    return (
      <div className="stack" style={{ gap: 16 }}>
        <Notice type="err">{error}</Notice>
        <Link to={isProject ? '/dashboard/projects' : '/dashboard/properties'} className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>
          Back to {isProject ? 'My Projects' : 'My Properties'}
        </Link>
      </div>
    );
  }
  if (!property) return <PageLoader label={`Loading ${isProject ? 'project' : 'property'}…`} />;

  const active = TEMPLATES.find((t) => t.id === previewId) || TEMPLATES[0];
  const branded = withLogoColor(active, logoColor);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Create a microsite for "{property.title}"</h2>
        <p className="muted small mt-1">Pick a template — the preview below uses this property's real details.</p>
        {logoColor && (
          <p className="muted small mt-1" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: logoColor, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />
            Matched to your logo's color — change it later in the builder's Theme tab if you'd like.
          </p>
        )}
      </div>

      <div className="pills">
        {TEMPLATES.map((t) => (
          <button key={t.id} className={`pill ${previewId === t.id ? 'on' : ''}`} onClick={() => setPreviewId(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="muted small">{active.description}</p>

      <div className="row" style={{ gap: 10 }}>
        {TEMPLATES.map((t) => (
          <button key={t.id} className="btn btn-primary btn-sm" disabled={!!creating}
                  onClick={() => useTemplate(t)}>
            {creating === t.id ? <><span className="spinner" /> Creating…</> : `Use ${t.label}`}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          <MicrositeRenderer property={property} sections={active.sections} theme={branded.theme} navbar={branded.navbar} />
        </div>
      </div>
    </div>
  );
}
