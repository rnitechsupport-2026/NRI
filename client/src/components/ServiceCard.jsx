import { Link } from 'react-router-dom';
import { rupees } from '../utils/format.js';
import { Stars, Avatar } from './ui.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80';

export default function ServiceCard({ service: s }) {
  return (
    <Link to={`/service/${s.slug || s.id}`} className="scard card card-hover">
      <div className="scard-media">
        <img src={s.cover_image || FALLBACK} alt={s.title} loading="lazy"
             onError={(e) => { e.currentTarget.src = FALLBACK; }} />
        <span className="badge badge-navy scard-cat">{s.category}</span>
      </div>
      <div className="scard-body">
        <h3>{s.title}</h3>
        <p className="d">{s.description}</p>

        <div className="row" style={{ gap: 8 }}>
          <Stars value={s.rating} />
          <span className="tiny muted">{Number(s.rating).toFixed(1)}</span>
        </div>

        <div className="scard-foot">
          <div className="row" style={{ gap: 8 }}>
            <Avatar src={s.provider_avatar} name={s.provider_name}
                    className="" style={{ width: 30, height: 30 }} />
            <div>
              <div className="tiny strong">{s.provider_company || s.provider_name}</div>
              <div className="tiny muted">{s.city}</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tiny muted">{s.price_from > 0 ? 'From' : ''}</div>
            <div className="strong gold">
              {s.price_from > 0 ? rupees(s.price_from) : 'Free'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
