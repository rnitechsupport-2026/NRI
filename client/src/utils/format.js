import { apiBase } from '../api/client.js';

/** ₹ formatting the way Indian property portals do it: Cr / Lac / K. */
export function money(value) {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${trim(n / 10000000)} Cr`;
  if (n >= 100000) return `₹${trim(n / 100000)} Lac`;
  if (n >= 1000) return `₹${trim(n / 1000)} K`;
  return `₹${n}`;
}

const trim = (n) => {
  const s = n.toFixed(2);
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

/** Full rupee figure with Indian digit grouping. */
export const rupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

/** "₹32,000 / month" for rentals, plain amount for sale. */
export function priceLabel(purpose, price) {
  if (purpose === 'rent' || purpose === 'pg' || purpose === 'lease') {
    return { main: rupees(price), suffix: purpose === 'pg' ? '/ month' : '/ month' };
  }
  return { main: money(price), suffix: '' };
}

export const area = (v, unit = 'sqft') =>
  v ? `${Number(v).toLocaleString('en-IN')} ${unit}` : '—';

/** Bot-aware share link — WhatsApp/Facebook/etc. get a rich preview card
 *  (real photo, price, title); real visitors are bounced straight to the
 *  normal interactive property page (see server property.routes.js /share). */
export const shareUrl = (property) => `${apiBase}/properties/share/${property.slug || property.id}`;

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const then = new Date(String(dateStr).replace(' ', 'T'));
  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  return `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''} ago`;
}

export const shortDate = (d) =>
  d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-IN',
    { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'U';

export const titleCase = (s = '') =>
  s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const PURPOSE_LABEL = { sale: 'For Sale', rent: 'For Rent', pg: 'PG / Co-living', lease: 'For Lease' };

export const TYPE_LABEL = {
  apartment: 'Apartment', villa: 'Villa', 'independent-house': 'Independent House',
  plot: 'Plot / Land', office: 'Office Space', shop: 'Shop / Showroom',
  warehouse: 'Warehouse', farmhouse: 'Farm House',
};

export const ROLE_LABEL = {
  owner: 'Owner', buyer: 'Buyer', agent: 'Agent', builder: 'Builder', service: 'Service Partner',
  admin: 'Admin', employee: 'Employee',
};

export const PORTAL_LABEL = { owner: 'Owner', buyer: 'Buyer', agent: 'Agent', builder: 'Builder', service: 'Service' };

export const LEAD_STATUS = {
  new: { label: 'New', cls: 'badge-blue' },
  contacted: { label: 'Contacted', cls: 'badge-amber' },
  'visit-scheduled': { label: 'Visit Scheduled', cls: 'badge-gold' },
  closed: { label: 'Closed', cls: 'badge-green' },
  lost: { label: 'Lost', cls: 'badge-red' },
};

export const AMENITY_LIST = [
  'Lift', 'Power Backup', 'Covered Parking', 'Security', 'CCTV', 'Gym',
  'Swimming Pool', "Children's Play Area", 'Clubhouse', 'Park', 'Gas Pipeline',
  'Rain Water Harvesting', 'Intercom', 'Fire Safety', 'Visitor Parking',
  'Water Purifier', 'Servant Room', 'Wi-Fi', 'Jogging Track', 'Indoor Games',
];

export const CITIES = ['Chennai', 'Bengaluru', 'Coimbatore', 'Hyderabad', 'Madurai', 'Trichy', 'Salem'];
