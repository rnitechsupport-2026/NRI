import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { Phone, Whatsapp } from '../Icons.jsx';

/**
 * Call / WhatsApp bot. Pre-writes the opening message so the visitor doesn't
 * have to, then hands off to the phone's own dialler or WhatsApp.
 *
 * Deliberately uses wa.me click-to-chat rather than the WhatsApp Business API:
 * it needs no credentials, no template approval, and it's what Indian agents
 * actually use day to day.
 */
export default function ContactBot({ propertyId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    api.get(`/bots/contact/property/${propertyId}`)
      .then((r) => live && setData(r.data.data))
      .catch(() => {});
    return () => { live = false; };
  }, [propertyId]);

  if (!data) {
    return <div className="bot-loading"><span className="spinner spinner-dark" /><span className="small muted">Loading…</span></div>;
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <a className="btn btn-dark btn-block" href={data.call_link}>
        <Phone /> Call {data.phone}
      </a>

      <div>
        <p className="tiny muted mb-1">Or send a WhatsApp — the message is written for you:</p>
        <div className="stack" style={{ gap: 8 }}>
          {data.templates.map((t) => (
            <a key={t.key} className="btn btn-outline btn-sm btn-block"
               href={t.link} target="_blank" rel="noopener noreferrer">
              <Whatsapp /> {t.label}
            </a>
          ))}
        </div>
      </div>

      <p className="tiny muted">
        Never pay an advance before seeing the property and verifying ownership documents.
      </p>
    </div>
  );
}
