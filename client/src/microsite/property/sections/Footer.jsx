import { MapPin, ChevronDown } from '../../../components/Icons.jsx';
import { Stagger, StaggerItem } from '../motion.jsx';

export default function Footer({ anchorId = 'ms-footer', property: p, data = {} }) {
  const place = [p.locality, p.city].filter(Boolean).join(', ');
  return (
    <footer id={anchorId} className="ms-section ms-tone-dark ms-invert">
      <Stagger className="ms-container flex max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-4">
            <StaggerItem className="ms-display break-words font-semibold" style={{ fontSize: 'clamp(1.8rem, 1.1rem + 3vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.02em', textWrap: 'balance' }}>
              {data.text || p.title}
            </StaggerItem>
            {place && (
              <StaggerItem as="p" className="ms-muted flex items-center gap-2">
                <MapPin style={{ width: 16, height: 16, flexShrink: 0, color: 'var(--ms-secondary)' }} /> {place}
              </StaggerItem>
            )}
          </div>
          <StaggerItem>
            <a href="#ms-hero" className="ms-btn ms-btn-secondary ms-btn-sm">
              Back to top <ChevronDown style={{ transform: 'rotate(180deg)' }} />
            </a>
          </StaggerItem>
        </div>
        <StaggerItem as="hr" className="ms-rule" />
        <StaggerItem as="p" className="ms-muted text-xs tracking-wide">Powered by RNI Real Estates</StaggerItem>
      </Stagger>
    </footer>
  );
}
