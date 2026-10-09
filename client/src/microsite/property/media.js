// Small helpers shared by the sections that pick from a listing's photos and
// by the builder's settings panel, so both agree on what "this property's
// images" means. Everything here reads real listing/microsite data only.

/** Every distinct photo on the listing, cover first. */
export function propertyImages(p) {
  const urls = [p?.cover_image, ...(p?.images || []).map((i) => i?.url)].filter(Boolean);
  return [...new Set(urls)];
}

export const HERO_SLIDE_LIMIT = 3;

/** The hero's background slides: the images picked in the builder if any,
 *  otherwise the listing's own first photos. Never more than HERO_SLIDE_LIMIT. */
export function heroSlides(p, settings = {}) {
  const chosen = Array.isArray(settings.images) ? settings.images.filter(Boolean) : [];
  const urls = chosen.length ? chosen : [settings.backgroundImage, ...propertyImages(p)].filter(Boolean);
  return [...new Set(urls)].slice(0, HERO_SLIDE_LIMIT);
}

export const HOTSPOT_LIMIT = 12;

const clampPct = (n) => Math.min(100, Math.max(0, Number(n) || 0));

/** Image Mapping points as saved by the builder — x/y are percentages of the
 *  image's width/height, so they stay put at any rendered size. */
export function normalizeHotspots(hotspots) {
  if (!Array.isArray(hotspots)) return [];
  return hotspots
    .filter((h) => h && typeof h === 'object')
    .slice(0, HOTSPOT_LIMIT)
    .map((h) => ({ x: clampPct(h.x), y: clampPct(h.y), label: h.label || '', description: h.description || '' }));
}

/** The image an Image Mapping section draws its points on: the one picked in
 *  the builder, else the floor plan, else the cover photo. */
export function imageMapSource(p, data = {}) {
  return data.image || p?.floor_plan_url || propertyImages(p)[0] || '';
}
