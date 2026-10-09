const PRICE_SUFFIX = { PER_SQFT: ' / sq.ft', PER_CENT: ' / cent', PER_SQM: ' / sq.m' };

const trim = (n) => String(Number(n.toFixed(2)));

/** ₹35,00,000 (full) or ₹35 Lakhs / ₹1.2 Cr (short). */
export const formatPrice = (price, priceType = 'TOTAL', { short = false } = {}) => {
  if (priceType === 'ON_REQUEST' || price === null || price === undefined || price === '') return 'Price on request';
  const value = Number(price);
  let text;
  if (short && value >= 1e7) text = `₹${trim(value / 1e7)} Cr`;
  else if (short && value >= 1e5) text = `₹${trim(value / 1e5)} Lakhs`;
  else text = `₹${value.toLocaleString('en-IN')}`;
  return text + (PRICE_SUFFIX[priceType] || '');
};

export const formatArea = (area, unit) =>
  area === null || area === undefined || area === '' ? '' : `${Number(area).toLocaleString('en-IN')} ${unit || ''}`.trim();

export const propertyTitle = (property) => {
  const number = String(property?.propertyNumber || '');
  if (/^(plot|flat)\b/i.test(number)) return number;
  return `${property?.type === 'FLAT' ? 'Flat' : 'Plot'} ${number}`;
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const timeAgo = (value) => {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};
