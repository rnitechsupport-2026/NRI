import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import PropertyCard from '../../components/PropertyCard.jsx';
import { Empty, PageLoader } from '../../components/ui.jsx';
import { Heart, Search } from '../../components/Icons.jsx';

export default function Favorites() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/properties/favorites/mine')
      .then((r) => setRows(r.data.data)).catch(() => setRows([]));
  }, []);

  if (rows === null) return <PageLoader label="Loading your shortlist…" />;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <h2>Shortlist</h2>
        <p className="muted small mt-1">{rows.length} propert{rows.length === 1 ? 'y' : 'ies'} saved</p>
      </div>

      {rows.length === 0 ? (
        <Empty icon={Heart} title="Nothing shortlisted yet"
               action={<Link to="/properties" className="btn btn-primary"><Search /> Browse properties</Link>}>
          Tap the heart on any listing to save it here and compare later.
        </Empty>
      ) : (
        <div className="grid g-3">
          {rows.map((p) => <PropertyCard key={p.id} property={{ ...p, is_favorite: true }} />)}
        </div>
      )}
    </div>
  );
}
