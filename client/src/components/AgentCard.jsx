import { Link } from 'react-router-dom';
import { ROLE_LABEL } from '../utils/format.js';
import { Shield, MapPin } from './Icons.jsx';
import { Avatar } from './ui.jsx';

export default function AgentCard({ user: u }) {
  return (
    <Link to={`/profile/${u.id}`} className="acard card card-hover">
      <Avatar src={u.avatar_url} name={u.name} size="avatar-lg" className="avatar-ring" />
      <h3>{u.name}</h3>
      {u.company_name && <div className="co">{u.company_name}</div>}

      <div className="row" style={{ gap: 6, marginTop: 7, justifyContent: 'center', flexWrap: 'wrap' }}>
        <span className="badge badge-outline">{ROLE_LABEL[u.role]}</span>
        {!!u.is_verified && (
          <span className="badge badge-green"><Shield style={{ width: 12, height: 12 }} /> Verified</span>
        )}
      </div>

      {u.city && (
        <div className="row small muted" style={{ gap: 5, marginTop: 9, justifyContent: 'center' }}>
          <MapPin style={{ width: 14, height: 14 }} /> {u.locality ? `${u.locality}, ` : ''}{u.city}
        </div>
      )}

      {u.about && <p className="ab">{u.about}</p>}

      <div className="acard-stats">
        <div>
          <b>{u.role === 'builder' ? (u.project_count ?? 0) : (u.property_count ?? 0)}</b>
          <span>{u.role === 'builder' ? 'Projects' : 'Listings'}</span>
        </div>
        <div>
          <b>{u.experience_years ?? '—'}</b>
          <span>Yrs Exp.</span>
        </div>
        <div>
          <b>{u.rera_id ? 'Yes' : 'No'}</b>
          <span>RERA</span>
        </div>
      </div>
    </Link>
  );
}
