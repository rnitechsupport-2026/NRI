import EnquiryForm from '../components/EnquiryForm.jsx';
import { Crumbs } from '../components/ui.jsx';
import { MapPin, Phone, Mail, Clock, Whatsapp } from '../components/Icons.jsx';

const OFFICES = [
  { city: 'Chennai (Head Office)', addr: 'No. 24, Anna Salai, Guindy, Chennai — 600 032', phone: '+91 44 4000 1234' },
  { city: 'Bengaluru', addr: '3rd Floor, Prestige Tech Park, Marathahalli — 560 103', phone: '+91 80 4000 5678' },
  { city: 'Coimbatore', addr: '18, Avinashi Road, Peelamedu, Coimbatore — 641 004', phone: '+91 422 400 9012' },
];

export default function Contact() {
  return (
    <>
      <div className="pagehead">
        <div className="container">
          <Crumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
          <h1>Talk to our property team</h1>
          <p>Buying, selling, renting or listing — tell us what you need and we&apos;ll route you to the right person.</p>
        </div>
      </div>

      <section className="section-sm">
        <div className="container detail-layout">
          <div className="stack" style={{ gap: 22 }}>
            <div className="grid g-3">
              {[
                { icon: Phone, title: 'Call us', lines: ['+91 44 4000 1234', 'Mon–Sat, 9 AM – 8 PM'] },
                { icon: Mail, title: 'Email us', lines: ['hello@rnirealestate.com', 'Reply within 24 hours'] },
                { icon: Whatsapp, title: 'WhatsApp', lines: ['+91 98400 12345', 'Fastest response'] },
              ].map(({ icon: Icon, title, lines }) => (
                <div key={title} className="card card-p">
                  <div className="ftile-ic" style={{ width: 44, height: 44 }}><Icon /></div>
                  <h4 className="mt-2">{title}</h4>
                  {lines.map((l) => <p key={l} className="small muted">{l}</p>)}
                </div>
              ))}
            </div>

            <div className="card card-p">
              <h3 className="mb-3">Our offices</h3>
              <div className="stack" style={{ gap: 0 }}>
                {OFFICES.map((o, i) => (
                  <div key={o.city} className="row" style={{
                    gap: 16, alignItems: 'flex-start', padding: '16px 0',
                    borderBottom: i < OFFICES.length - 1 ? '1px dashed var(--line)' : 'none',
                  }}>
                    <MapPin style={{ width: 19, height: 19, color: 'var(--gold-600)', flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <div className="strong">{o.city}</div>
                      <p className="small muted">{o.addr}</p>
                      <a className="small gold strong" href={`tel:${o.phone.replace(/\s/g, '')}`}>{o.phone}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <iframe
                title="Head office map" width="100%" height="340"
                style={{ border: 0, display: 'block' }} loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=Guindy,+Chennai,+Tamil+Nadu&output=embed"
              />
            </div>

            <div className="alert alert-info">
              <Clock />
              <span>Office hours: Monday to Saturday, 9:00 AM – 8:00 PM. Sunday site visits by appointment.</span>
            </div>
          </div>

          <aside className="sticky-side">
            <EnquiryForm title="Send us a message" contactPhone="9840012345" />
          </aside>
        </div>
      </section>
    </>
  );
}
