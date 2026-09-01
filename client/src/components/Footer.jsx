import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { MapPin, Phone, Mail, Facebook, Instagram, Linkedin, Youtube, Whatsapp } from './Icons.jsx';

const COLS = [
  {
    title: 'Explore',
    links: [
      { to: '/properties?purpose=sale', label: 'Properties for Sale' },
      { to: '/properties?purpose=rent', label: 'Properties for Rent' },
      { to: '/properties?type=plot', label: 'Plots & Land' },
      { to: '/properties?type=office,shop,warehouse', label: 'Commercial' },
      { to: '/projects', label: 'New Projects' },
    ],
  },
  {
    title: 'For Partners',
    links: [
      { to: '/register?role=owner', label: 'Post as Owner' },
      { to: '/register?role=agent', label: 'Join as Agent' },
      { to: '/register?role=builder', label: 'Join as Builder' },
      { to: '/register?role=service', label: 'Become a Partner' },
      { to: '/agents', label: 'Find an Agent' },
    ],
  },
  {
    title: 'Services',
    links: [
      { to: '/services?category=Interior%20Design', label: 'Home Interiors' },
      { to: '/services?category=Legal%20%26%20Documentation', label: 'Legal & Docs' },
      { to: '/services?category=Home%20Loan', label: 'Home Loans' },
      { to: '/services?category=Packers%20%26%20Movers', label: 'Packers & Movers' },
      { to: '/services?category=Vaastu', label: 'Vaastu' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo onDark size={46} />
            <p className="about">
              <b style={{ color: '#fff' }}>Connecting fortuners of India.</b><br />
              RNI Real Estates Network India Pvt Ltd connects owners, RERA registered agents,
              reputed builders and home service partners — verified listings, transparent pricing
              and zero hidden brokerage.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook"><Facebook /></a>
              <a href="#" aria-label="Instagram"><Instagram /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin /></a>
              <a href="#" aria-label="YouTube"><Youtube /></a>
              <a href="#" aria-label="WhatsApp"><Whatsapp /></a>
            </div>
          </div>

          {COLS.map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              {c.links.map((l) => <Link key={l.to + l.label} to={l.to}>{l.label}</Link>)}
            </div>
          ))}

          <div>
            <h4>Contact</h4>
            <ul className="footer-contact">
              <li><MapPin /> <span>No. 24, Anna Salai, Guindy,<br />Chennai — 600 032</span></li>
              <li><Phone /> <a href="tel:+914440001234" style={{ padding: 0 }}>+91 44 4000 1234</a></li>
              <li><Mail /> <a href="mailto:hello@rnirealestate.com" style={{ padding: 0 }}>hello@rnirealestate.com</a></li>
            </ul>
            <Link to="/contact" className="btn btn-sm btn-primary mt-2">Talk to us</Link>
          </div>
        </div>

        <div className="footer-bot">
          <span>© {new Date().getFullYear()} RNI Real Estates Network India Pvt Ltd. All rights reserved.</span>
          <div className="row" style={{ gap: 20 }}>
            <Link to="/about" style={{ padding: 0 }}>About</Link>
            <Link to="/contact" style={{ padding: 0 }}>Contact</Link>
            <a href="#" style={{ padding: 0 }}>Privacy Policy</a>
            <a href="#" style={{ padding: 0 }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
