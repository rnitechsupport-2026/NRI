import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatArea, formatPrice, propertyTitle } from '../../utils/format';

const MARGIN = 8;
const GAP = 10;

/**
 * Hover card that sits above the hovered polygon (or below if there is no room)
 * and never leaves the browser window.
 * anchor: { x, top, bottom } in viewport (client) pixels.
 */
export default function PropertyPopup({ property, anchor, touch, onViewDetails, showPrice = true, showStatus = true, showDetails = true, container }) {
  const ref = useRef(null);
  const doc = container?.ownerDocument || document;
  const win = doc.defaultView || window;
  const [position, setPosition] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    let top = anchor.top - h - GAP;
    if (top < MARGIN) top = anchor.bottom + GAP;
    if (top + h > win.innerHeight - MARGIN) top = Math.max(MARGIN, win.innerHeight - h - MARGIN);
    const left = Math.min(Math.max(anchor.x - w / 2, MARGIN), win.innerWidth - w - MARGIN);
    setPosition({ left, top });
  }, [anchor?.x, anchor?.top, anchor?.bottom, property?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!property || !anchor) return null;

  // A flat's mapping carries its own floor name, so the card can say which floor it is on.
  const details = [property.floorName, property.bhk, formatArea(property.area, property.areaUnit), property.dimensions, property.facing && `${property.facing} Facing`].filter(Boolean);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className={`pm-root fixed z-[110] w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-xl ${touch ? '' : 'pointer-events-none'}`}
      style={{ left: position.left, top: position.top }}
    >
      <h4 className="text-base font-bold text-slate-900">{propertyTitle(property)}</h4>
      {property.name && <p className="text-sm text-slate-500">{property.name}</p>}
      <div className="mt-1 space-y-0.5 text-sm text-slate-600">
        {details.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {showPrice && <p className="mt-2 text-base font-bold text-slate-900">{formatPrice(property.price, property.priceType, { short: true })}</p>}
      {showStatus && (
        <div className="mt-2">
          <StatusBadge status={property.status} />
        </div>
      )}
      
    </div>,
    doc.body
  );
}
