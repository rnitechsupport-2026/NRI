import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPinned } from 'lucide-react';

import '../../microsite/microsite.css';
import '../plotmap.css';
import { mapService } from '../services';
import MapViewer from '../components/map/MapViewer';
import { Spinner } from '../components/common/Feedback';

const UNAVAILABLE = 'This property map is currently unavailable.';

// Fills whatever size the iframe is (dvh where supported, so mobile browser bars don't clip it).
const FRAME = 'pm-root flex h-screen flex-col bg-white text-slate-900 supports-[height:100dvh]:h-[100dvh]';

function Unavailable() {
  return (
    <div className={`${FRAME} items-center justify-center gap-3 p-6 text-center`}>
      <MapPinned size={36} className="text-slate-300" />
      <p className="text-sm text-slate-500">{UNAVAILABLE}</p>
    </div>
  );
}

/**
 * /embed/map/:propertyId
 *
 * The complete interactive map of one listing, designed to run inside another
 * website's iframe: no site navbar, no dashboard, no login. Everything it needs
 * comes from the URL, and it only ever reads PUBLISHED data from the public API.
 */
export default function EmbeddedMap() {
  const { propertyId } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    mapService
      .public(propertyId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('ready');
        if (result.project?.name) document.title = result.project.name;
      })
      // Unpublished maps, unknown IDs and network errors all look the same to a visitor.
      .catch(() => !cancelled && setStatus('unavailable'));

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (status === 'loading') {
    return (
      <div className={`${FRAME} items-center justify-center`}>
        <Spinner size={28} className="text-indigo-600" />
      </div>
    );
  }
  if (status !== 'ready') return <Unavailable />;

  const { project, floors, properties } = data;

  return (
    <div className={FRAME}>
      <MapViewer
        project={project}
        floors={floors}
        properties={properties}
        className="min-h-0 flex-1 rounded-none border-0"
        heightClass="min-h-0 flex-1"
      />
    </div>
  );
}
