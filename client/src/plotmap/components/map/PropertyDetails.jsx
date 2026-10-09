import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail, Phone, User } from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatArea, formatPrice, propertyTitle } from '../../utils/format';
import { getStatus } from '../../utils/statusConfig';

// Images may be plain URLs (public snapshot) or { url } objects (admin data).
const imageSrc = (image) => (typeof image === 'string' ? image : image?.url);

export default function PropertyDetails({ property, project, floors = [], open, onClose, showPrice = true, showStatus = true, fullPageHref, container }) {
  const [activeImage, setActiveImage] = useState(0);
  if (!property) return null;

  const images = (property.images || []).map(imageSrc).filter(Boolean);
  const floor = floors.find((f) => String(f._id) === String(property.floorId));
  const phone = property.contactPhone || project.contactPhone;
  const email = project.contactEmail;
  const subject = encodeURIComponent(`Enquiry: ${propertyTitle(property)} - ${project.name}`);
  const enquiryHref = email ? `mailto:${email}?subject=${subject}` : phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : null;

  const fields = [
    (floor || property.floorName) && ['Floor', floor?.floorName || property.floorName],
    property.flatType && ['Type', property.flatType],
    property.bhk && ['Configuration', property.bhk],
    formatArea(property.area, property.areaUnit) && ['Area', formatArea(property.area, property.areaUnit)],
    property.dimensions && ['Measurements', property.dimensions],
    property.facing && ['Facing', property.facing],
    showPrice && ['Price', formatPrice(property.price, property.priceType)],
    showStatus && ['Status', getStatus(property.status).label],
  ].filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title={propertyTitle(property)} size="lg" container={container}>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center gap-3">
          {property.name && <p className="text-slate-600">{property.name}</p>}
          {showStatus && <StatusBadge status={property.status} size="lg" />}
        </div>

        {images.length > 0 && (
          <div>
            <img
              src={images[Math.min(activeImage, images.length - 1)]}
              alt={propertyTitle(property)}
              loading="lazy"
              className="aspect-[16/10] w-full rounded-xl bg-slate-100 object-cover"
            />
            {images.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-14 w-20 flex-none overflow-hidden rounded-lg border-2 ${
                      index === activeImage ? 'border-indigo-600' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        {property.description && <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{property.description}</p>}

        {(property.contactName || phone || email) && (
          <div className="space-y-1.5 rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-semibold text-slate-900">Contact</p>
            {property.contactName && (
              <p className="flex items-center gap-2 text-slate-600">
                <User size={14} /> {property.contactName}
              </p>
            )}
            {phone && (
              <p className="flex items-center gap-2 text-slate-600">
                <Phone size={14} /> {phone}
              </p>
            )}
            {email && (
              <p className="flex items-center gap-2 text-slate-600">
                <Mail size={14} /> {email}
              </p>
            )}
          </div>
        )}

        {fullPageHref && (
          <Link to={fullPageHref} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
            View full details <ArrowRight size={14} />
          </Link>
        )}

        {(enquiryHref || phone) && (
          <div className="flex flex-col gap-2 sm:flex-row">
            {enquiryHref && (
              <a href={enquiryHref} className="pm-btn-primary flex-1 py-2.5">
                <Mail size={16} /> Enquire now
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="pm-btn-secondary flex-1 py-2.5">
                <Phone size={16} /> Call
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
