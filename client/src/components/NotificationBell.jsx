import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { timeAgo } from '../utils/format.js';
import { Bell, Sparkle, Trending, Home, Calendar, Star, Info } from './Icons.jsx';

const KIND = {
  followup:      { icon: Sparkle,  cls: 'n-brand',  label: 'Follow-up' },
  'price-drop':  { icon: Trending, cls: 'n-orange', label: 'Price drop' },
  'new-listing': { icon: Home,     cls: 'n-brand',  label: 'New match' },
  visit:         { icon: Calendar, cls: 'n-blue',   label: 'Site visit' },
  feedback:      { icon: Star,     cls: 'n-orange', label: 'Feedback' },
  system:        { icon: Info,     cls: 'n-blue',   label: 'Update' },
};

/**
 * The in-app feed the scheduled bots write to — follow-up, price alert and new
 * listing all surface here, plus visit and feedback events.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = () => api.get('/bots/notifications')
    .then((r) => { setItems(r.data.data); setUnread(r.data.unread); })
    .catch(() => {});

  useEffect(() => {
    load();
    // Cheap polling — a websocket is overkill for a feed that changes hourly.
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api.post('/bots/notifications/read').catch(() => {});
      setUnread(0);
    }
  }

  return (
    <div className="notif" ref={ref}>
      <button className="notif-btn" onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="dropdown notif-panel">
          <div className="notif-head">
            <b>Notifications</b>
            {items.length > 0 && <span className="tiny muted">{items.length}</span>}
          </div>

          {items.length === 0 ? (
            <p className="notif-empty small muted">
              Nothing yet. Price drops on your shortlist and new matches for your
              saved searches will appear here.
            </p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => {
                const meta = KIND[n.kind] || KIND.system;
                const Icon = meta.icon;
                const body = (
                  <>
                    <span className={`notif-ic ${meta.cls}`}><Icon /></span>
                    <span style={{ minWidth: 0 }}>
                      <b>{n.title}</b>
                      {n.body && <em>{n.body}</em>}
                      <span className="tiny muted">{meta.label} · {timeAgo(n.created_at)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={n.id} className={n.read_at ? '' : 'unread'}>
                    {n.link
                      ? <Link to={n.link} className="notif-item" onClick={() => setOpen(false)}>{body}</Link>
                      : <span className="notif-item">{body}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
