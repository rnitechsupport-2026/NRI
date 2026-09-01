import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { priceLabel, area, timeAgo, PURPOSE_LABEL, TYPE_LABEL, ROLE_LABEL } from '../utils/format.js';
import { MapPin, Bed, Bath, Ruler, Heart, Shield, Cube } from './Icons.jsx';
import { Avatar } from './ui.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';

export default function PropertyCard({ property: p, layout = 'grid', showFav = true }) {
  const { isAuthed } = useAuth();
  const toast = useToast();
  const [fav, setFav] = useState(!!p.is_favorite);
  const [busy, setBusy] = useState(false);

  const price = priceLabel(p.purpose, p.price);
  const to = `/property/${p.slug || p.id}`;

  async function toggleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) { toast.info('Please login to shortlist this property'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/properties/${p.id}/favorite`);
      setFav(data.is_favorite);
      toast.success(data.is_favorite ? 'Added to your shortlist' : 'Removed from shortlist');
    } catch {
      toast.error('Could not update your shortlist');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link to={to} className={`pcard card card-hover ${layout === 'list' ? 'hz' : ''}`}>
      <div className="pcard-media">
        <img src={p.cover_image || FALLBACK} alt={p.title} loading="lazy"
             onError={(e) => { e.currentTarget.src = FALLBACK; }} />
        <div className="pcard-tags">
          <span className="badge badge-gold">{PURPOSE_LABEL[p.purpose] || p.purpose}</span>
          {p.tour_url && (
            <span className="badge badge-navy"><Cube style={{ width: 12, height: 12 }} /> 3D</span>
          )}
          {!!p.is_verified && (
            <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified</span>
          )}
        </div>
        {showFav && (
          <button className={`pcard-fav ${fav ? 'on' : ''}`} onClick={toggleFav} disabled={busy}
                  aria-label={fav ? 'Remove from shortlist' : 'Add to shortlist'}>
            <Heart />
          </button>
        )}
        <div className="pcard-price">
          {price.main} {price.suffix && <small>{price.suffix}</small>}
        </div>
      </div>

      <div className="pcard-body">
        <h3>{p.title}</h3>
        <div className="pcard-loc"><MapPin /> {p.locality}, {p.city}</div>

        <div className="pcard-specs">
          {p.bhk ? <div><Bed /> {p.bhk} BHK</div> : <div><Ruler /> {TYPE_LABEL[p.property_type]}</div>}
          {p.bathrooms ? <div><Bath /> {p.bathrooms} Bath</div> : null}
          <div><Ruler /> {area(p.built_up_area, p.area_unit)}</div>
        </div>

        <div className="pcard-foot">
          <Avatar src={p.owner_avatar} name={p.owner_name} />
          <div style={{ minWidth: 0 }}>
            <div className="nm">{p.owner_company || p.owner_name}</div>
            <div className="rl">{ROLE_LABEL[p.owner_role] || p.owner_role}</div>
          </div>
          <span className="spacer" />
          <span className="tiny muted nowrap">{timeAgo(p.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
