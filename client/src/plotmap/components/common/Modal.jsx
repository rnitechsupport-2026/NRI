import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

/**
 * variant="center" is a normal dialog. variant="drawer" slides in from the right
 * on desktop and becomes a bottom sheet on mobile.
 */
export default function Modal({ open, onClose, title, children, size = 'md', variant = 'center', footer, container }) {
  // `container`: any element in the document the dialog should open in
  // (defaults to this window's document).
  const doc = container?.ownerDocument || document;

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => e.key === 'Escape' && onClose?.();
    doc.addEventListener('keydown', handleKey);
    const previousOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    return () => {
      doc.removeEventListener('keydown', handleKey);
      doc.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, doc]);

  if (!open) return null;

  const isDrawer = variant === 'drawer';

  return createPortal(
    <div
      className={`pm-root fixed inset-0 z-[120] flex bg-slate-900/50 backdrop-blur-[2px] ${
        isDrawer ? 'items-end justify-end sm:items-stretch' : 'items-end justify-center sm:items-center sm:p-4'
      }`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`flex max-h-[92vh] w-full flex-col bg-white shadow-2xl ${
          isDrawer
            ? 'rounded-t-2xl sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none'
            : `rounded-t-2xl sm:rounded-2xl ${SIZES[size]}`
        }`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    doc.body
  );
}
