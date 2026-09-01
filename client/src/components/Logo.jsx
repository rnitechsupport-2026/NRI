import { Link } from 'react-router-dom';
import logoImg from '../../assets/rni-lgo.png';

export function LogoMark({ size = 42, ...rest }) {
  return (
    <img
      src={logoImg}
      alt="RNI Network India"
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 4 }}
      {...rest}
    />
  );
}

export default function Logo({ to = '/', onDark = false, size = 42, showTagline = true }) {
  return (
    <Link to={to} className={`logo ${onDark ? 'logo-on-dark' : ''}`}>
      <span className="logo-mark"><LogoMark size={size} /></span>
      <span className="logo-text">
        RNI
        {showTagline && <small>Real Estates · Network India</small>}
      </span>
    </Link>
  );
}
