/**
 * Origin that serves /embed/map/:propertyId. Set VITE_PUBLIC_APP_URL when the public site
 * lives on a different origin than the dashboard. Leaving it empty uses the origin the
 * dashboard is running on, so no hard-coded domain ever ends up in the generated embed code.
 */
const CONFIGURED_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || '').replace(/\/$/, '');
export const APP_URL = CONFIGURED_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

// The iframe URL carries the listing's ID and nothing else, so the same snippet always
// shows the latest PUBLISHED map.
export const EMBED_URL = (propertyId) => `${APP_URL}/embed/map/${propertyId}`;
export const PUBLIC_PAGE_URL = (propertyIdOrSlug) => `${APP_URL}/property/${propertyIdOrSlug}`;
