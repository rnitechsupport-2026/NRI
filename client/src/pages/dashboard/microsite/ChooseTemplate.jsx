import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { errMsg } from '../../../api/client.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { Notice, PageLoader } from '../../../components/ui.jsx';
import MicrositeRenderer from '../../../microsite/property/MicrositeRenderer.jsx';
import { TEMPLATES } from '../../../microsite/property/templates.js';

export default function ChooseTemplate() {
  const [params] = useSearchParams();
  const propertyId = params.get('propertyId');
  const nav = useNavigate();
  const toast = useToast();

  const [property, setProperty] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState('');
  const [previewId, setPreviewId] = useState(TEMPLATES[0].id);

  useEffect(() => {
    if (!propertyId) { setError('No property selected.'); return; }
    api.get(`/microsites/property/${propertyId}/preview`)
      .then((r) => setProperty(r.data.data))
      .catch((e) => setError(errMsg(e, 'Could not load this property')));
  }, [propertyId]);

  async function useTemplate(template) {
    setCreating(template.id);
    try {
      const { data } = await api.post('/microsites', {
        property_id: propertyId,
        template_id: template.id,
        sections: template.sections,
        theme: template.theme,
        navbar: template.navbar,
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
        <Link to="/dashboard/properties" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>Back to My Properties</Link>
      </div>
    );
  }
  if (!property) return <PageLoader label="Loading property…" />;

  const active = TEMPLATES.find((t) => t.id === previewId) || TEMPLATES[0];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Create a microsite for "{property.title}"</h2>
        <p className="muted small mt-1">Pick a template — the preview below uses this property's real details.</p>
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
          <MicrositeRenderer property={property} sections={active.sections} theme={active.theme} navbar={active.navbar} />
        </div>
      </div>
    </div>
  );
}
