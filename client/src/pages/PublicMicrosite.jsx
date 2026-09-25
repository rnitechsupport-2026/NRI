import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api, { errMsg } from '../api/client.js';
import { Notice, PageLoader } from '../components/ui.jsx';
import PropertyBot from '../components/PropertyBot.jsx';
import MicrositeRenderer from '../microsite/property/MicrositeRenderer.jsx';

export default function PublicMicrosite() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';

  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setState(null); setError('');
    api.get(`/microsites/public/${slug}${preview ? '?preview=1' : ''}`)
      .then((r) => { if (live) setState(r.data.data); })
      .catch((e) => live && setError(errMsg(e, 'This microsite is not available')));
    return () => { live = false; };
  }, [slug, preview]);

  if (error) {
    return (
      <div className="container section">
        <Notice type="err">{error}</Notice>
        <Link to="/" className="btn btn-dark mt-3">Back home</Link>
      </div>
    );
  }
  if (!state) return <PageLoader label="Loading…" />;

  return (
    <>
      {preview && (
        <div style={{ background: '#fbbf24', color: '#1a1a1a', textAlign: 'center', padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
          Preview mode — this microsite is not published yet
        </div>
      )}
      <MicrositeRenderer
        property={state.property}
        sections={state.sections}
        theme={state.microsite.theme}
        navbar={state.microsite.navbar}
      />
      <PropertyBot propertyId={state.property.id} title={state.property.title} price={state.property.price} purpose={state.property.purpose} />
    </>
  );
}
