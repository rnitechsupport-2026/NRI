import { Link } from 'react-router-dom';
import { money, titleCase } from '../utils/format.js';
import { MapPin, Building, Layers, Calendar } from './Icons.jsx';

const FALLBACK = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80';

const STATUS_CLS = { upcoming: 'badge-blue', ongoing: 'badge-amber', completed: 'badge-green' };

export default function ProjectCard({ project: p }) {
  const range = p.min_price && p.max_price
    ? `${money(p.min_price)} – ${money(p.max_price)}`
    : p.min_price ? `From ${money(p.min_price)}` : 'Price on request';

  return (
    <Link to={`/project/${p.slug || p.id}`} className="jcard card card-hover">
      <div className="jcard-media">
        <img src={p.cover_image || FALLBACK} alt={p.name} loading="lazy"
             onError={(e) => { e.currentTarget.src = FALLBACK; }} />
        <div className="pcard-tags">
          <span className={`badge ${STATUS_CLS[p.status] || 'badge-outline'}`}>{titleCase(p.status)}</span>
          {!!p.is_featured && <span className="badge badge-gold">Featured</span>}
        </div>
        <div className="jcard-over">
          <h3>{p.name}</h3>
          <div className="loc"><MapPin /> {p.locality}, {p.city}</div>
        </div>
      </div>

      <div className="jcard-body">
        <div className="jcard-meta">
          <div>
            <span className="tiny muted">Price range</span>
            <b className="gold">{range}</b>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="tiny muted">Configuration</span>
            <b>{p.configuration || titleCase(p.project_type)}</b>
          </div>
        </div>

        <div className="pcard-specs" style={{ marginTop: 0 }}>
          {p.total_units ? <div><Building /> {p.total_units} units</div> : null}
          {p.towers ? <div><Layers /> {p.towers} towers</div> : null}
          {p.possession_on ? (
            <div><Calendar /> {new Date(p.possession_on).getFullYear()}</div>
          ) : null}
        </div>

        {p.rera_no && <div className="tiny muted">RERA: {p.rera_no}</div>}
      </div>
    </Link>
  );
}
