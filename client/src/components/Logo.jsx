import { Link } from 'react-router-dom';
import logoImg from '../../assets/chrni.png';

// Source artwork is a 671x372 wordmark — keep that aspect ratio so it
// isn't squashed into the old square icon slot.
const LOGO_ASPECT = 671 / 372;

export function LogoMark({ size = 42, ...rest }) {
  return (
    <img
      src={logoImg}
      alt="RNI Network India"
      width={Math.round(size * LOGO_ASPECT)}
      height={size}
      style={{ objectFit: 'contain' }}
      {...rest}
    />
  );
}

export default function Logo({ to = '/', onDark = false, size = 42 }) {
  return (
    <Link to={to} className={`logo ${onDark ? 'logo-on-dark' : ''}`}>
      <span className="logo-mark"><LogoMark size={size} /></span>
    </Link>
  );
}
