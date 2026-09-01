import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import PropertyCard from '../PropertyCard.jsx';
import { SkeletonGrid } from '../ui.jsx';
import { Sparkle, ArrowRight } from '../Icons.jsx';

/**
 * Recommendation bot surface. `source` is either a property id ("similar to
 * this") or "me" (personalised from shortlist + enquiry history).
 *
 * Each card carries the reason it was picked — a recommendation you can't
 * explain is just a random listing.
 */
export default function Recommendations({ source, title, subtitle, cols = 'g-3', limit }) {
  const [items, setItems] = useState(null);
  const [basis, setBasis] = useState(null);

  useEffect(() => {
    let live = true;
    setItems(null);
    const url = source === 'me' ? '/bots/recommend/me' : `/bots/recommend/property/${source}`;
    api.get(url)
      .then((r) => {
        if (!live) return;
        // /me returns {basis, items}; /property returns a plain array
        const d = r.data.data;
        setItems(Array.isArray(d) ? d : d.items);
        setBasis(Array.isArray(d) ? null : d.basis);
      })
      .catch(() => live && setItems([]));
    return () => { live = false; };
  }, [source]);

  if (items && items.length === 0) return null;
  const shown = limit && items ? items.slice(0, limit) : items;

  return (
    <section>
      <div className="sec-head">
        <div>
          <span className="eyebrow"><Sparkle style={{ width: 13, height: 13 }} /> Recommended</span>
          <h2>{title}</h2>
          <p>
            {subtitle}
            {basis === 'popular' && ' Shortlist a few properties and this gets personal.'}
          </p>
        </div>
        <Link to="/properties" className="btn btn-outline">Browse all <ArrowRight /></Link>
      </div>

      {items === null ? <SkeletonGrid count={3} cols={cols} /> : (
        <div className={`grid ${cols}`}>
          {shown.map((p) => (
            <div key={p.id} className="rec">
              <PropertyCard property={p} />
              {p.why && <p className="rec-why"><Sparkle /> {p.why}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
