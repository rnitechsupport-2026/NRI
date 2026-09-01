import { Link } from 'react-router-dom';
import { initials } from '../utils/format.js';
import { Alert, CheckCircle, Info, Inbox, ChevronLeft, ChevronRight } from './Icons.jsx';

/* ----------------------------------------------------------- Avatar */
export function Avatar({ src, name, size = '', className = '', ...rest }) {
  const cls = `avatar ${size} ${className}`.trim();
  if (src) return <img className={cls} src={src} alt={name || ''} loading="lazy" {...rest} />;
  return <div className={cls} {...rest}>{initials(name)}</div>;
}

/* ---------------------------------------------------------- Loading */
export const PageLoader = ({ label = 'Loading…' }) => (
  <div className="page-loading">
    <div className="spinner spinner-dark spinner-lg" />
    <p className="muted small">{label}</p>
  </div>
);

export const SkeletonGrid = ({ count = 8, cols = 'g-4' }) => (
  <div className={`grid ${cols}`}>
    {Array.from({ length: count }).map((_, i) => <div key={i} className="skel skel-card" />)}
  </div>
);

/* ------------------------------------------------------------ Empty */
export function Empty({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="empty card">
      <div className="ic"><Icon /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------ Alert */
export function Notice({ type = 'info', children }) {
  if (!children) return null;
  const Icon = type === 'err' ? Alert : type === 'ok' ? CheckCircle : Info;
  const cls = type === 'err' ? 'alert-err' : type === 'ok' ? 'alert-ok' : 'alert-info';
  return <div className={`alert ${cls}`}><Icon /><span>{children}</span></div>;
}

/* ------------------------------------------------------------- Field */
export function Field({ label, required, error, hint, className = '', children }) {
  return (
    <div className={`field ${className}`.trim()}>
      {label && <label>{label}{required && <span className="req"> *</span>}</label>}
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

/* -------------------------------------------------------- Pagination */
export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const window = [];
  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  for (let i = from; i <= to; i++) window.push(i);

  return (
    <div className="pager">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft style={{ width: 16, height: 16 }} />
      </button>
      {from > 1 && <><button onClick={() => onChange(1)}>1</button><span className="muted">…</span></>}
      {window.map((n) => (
        <button key={n} className={n === page ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>
      ))}
      {to < pages && <><span className="muted">…</span><button onClick={() => onChange(pages)}>{pages}</button></>}
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
        <ChevronRight style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------- Breadcrumbs */
export function Crumbs({ items }) {
  return (
    <nav className="crumbs">
      {items.map((it, i) => (
        <span key={i} className="row" style={{ gap: 8 }}>
          {i > 0 && <ChevronRight />}
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------- Modal */
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- Rating row */
export function Stars({ value = 0 }) {
  const full = Math.round(Number(value));
  return (
    <span className="stars" title={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" style={{ opacity: i < full ? 1 : 0.25 }}>
          <path d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.85z" />
        </svg>
      ))}
    </span>
  );
}
