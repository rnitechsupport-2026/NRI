// Three presets — each is just an ordered list of sections + a theme + a
// navbar, all consumed by the same MicrositeRenderer/registry as the
// drag-and-drop builder. Picking a template never invents property facts;
// it only chooses layout, order, and color/typography defaults.

function section(sectionType, overrides = {}) {
  return { sectionType, isVisible: true, sectionData: {}, settings: {}, ...overrides };
}

export const PREMIUM_LUXURY = {
  id: 'premium-luxury',
  label: 'Premium Luxury',
  description: 'Large hero, elegant serif type, dark amenities & location bands — for villas and premium apartments.',
  theme: {
    primaryColor: '#0b1b3f',
    secondaryColor: '#e4a11b',
    backgroundColor: '#F5F2EC',
    textColor: '#1a1a1a',
    buttonStyle: 'solid',
    borderRadius: 'sm',
    fontStyle: 'editorial',
    sectionSpacing: 'spacious',
  },
  sections: [
    section('hero', { settings: { height: 'tall', overlay: 0.55 } }),
    section('overview', { settings: { tone: 'light' } }),
    section('highlights', { sectionData: { heading: 'Premium Highlights' }, settings: { tone: 'light' } }),
    section('gallery', { settings: { tone: 'light', columns: 3 } }),
    section('amenities', { settings: { tone: 'dark' } }),
    section('floorPlan', { settings: { tone: 'light' } }),
    section('location', { settings: { tone: 'dark' } }),
    section('enquiryForm', { settings: { tone: 'light' } }),
    section('footer'),
  ],
  navbar: {
    showLogo: false,
    background: '#0b1b3f',
    sticky: true,
    items: [
      { key: 'ms-hero', label: 'Home', visible: true, order: 0 },
      { key: 'ms-overview', label: 'About', visible: true, order: 1 },
      { key: 'ms-amenities', label: 'Amenities', visible: true, order: 2 },
      { key: 'ms-gallery', label: 'Gallery', visible: true, order: 3 },
      { key: 'ms-location', label: 'Location', visible: true, order: 4 },
      { key: 'ms-enquiry', label: 'Contact', visible: true, order: 5 },
    ],
  },
};

export const MODERN_REAL_ESTATE = {
  id: 'modern-real-estate',
  label: 'Modern Real Estate',
  description: 'Clean card-based layout, light background, modern sans type — for apartments and residential projects.',
  theme: {
    primaryColor: '#1d4ed8',
    secondaryColor: '#0ea5e9',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    buttonStyle: 'pill',
    borderRadius: 'lg',
    fontStyle: 'modern',
    sectionSpacing: 'normal',
  },
  sections: [
    section('hero', { settings: { height: 'normal', alignment: 'left', overlay: 0.45 } }),
    section('overview', { sectionData: { heading: 'Quick Property Stats' }, settings: { tone: 'light' } }),
    section('highlights', { sectionData: { heading: 'Why This Property' }, settings: { tone: 'light' } }),
    section('amenities', { settings: { tone: 'light' } }),
    section('gallery', { settings: { tone: 'light', columns: 4 } }),
    section('floorPlan', { settings: { tone: 'light' } }),
    section('location', { settings: { tone: 'light' } }),
    section('enquiryForm', { settings: { tone: 'light' } }),
    section('footer'),
  ],
  navbar: {
    showLogo: false,
    background: '#ffffff',
    sticky: true,
    items: [
      { key: 'ms-hero', label: 'Home', visible: true, order: 0 },
      { key: 'ms-overview', label: 'About', visible: true, order: 1 },
      { key: 'ms-amenities', label: 'Amenities', visible: true, order: 2 },
      { key: 'ms-gallery', label: 'Gallery', visible: true, order: 3 },
      { key: 'ms-location', label: 'Location', visible: true, order: 4 },
      { key: 'ms-enquiry', label: 'Contact', visible: true, order: 5 },
    ],
  },
};

export const LEAD_GENERATION = {
  id: 'lead-generation',
  label: 'Lead Generation',
  description: 'Price up front, sticky enquiry CTAs throughout — built to convert visits into enquiries.',
  theme: {
    primaryColor: '#111827',
    secondaryColor: '#f4560d',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    buttonStyle: 'solid',
    borderRadius: 'full',
    fontStyle: 'modern',
    sectionSpacing: 'compact',
  },
  sections: [
    section('hero', { sectionData: { buttonText: 'Get a Call Back' }, settings: { height: 'normal', overlay: 0.55 } }),
    section('pricing', { settings: { tone: 'dark' } }),
    section('overview', { settings: { tone: 'light' } }),
    section('highlights', { sectionData: { heading: 'Why Choose This Property?' }, settings: { tone: 'light' } }),
    section('amenities', { settings: { tone: 'light' } }),
    section('gallery', { settings: { tone: 'light', columns: 3 } }),
    section('floorPlan', { settings: { tone: 'light' } }),
    section('location', { settings: { tone: 'light' } }),
    section('siteVisitCta', { settings: { tone: 'dark' } }),
    section('enquiryForm', { settings: { tone: 'light' } }),
    section('footer'),
  ],
  navbar: {
    showLogo: false,
    background: '#ffffff',
    sticky: true,
    items: [
      { key: 'ms-hero', label: 'Home', visible: true, order: 0 },
      { key: 'ms-overview', label: 'About', visible: true, order: 1 },
      { key: 'ms-amenities', label: 'Amenities', visible: true, order: 2 },
      { key: 'ms-gallery', label: 'Gallery', visible: true, order: 3 },
      { key: 'ms-location', label: 'Location', visible: true, order: 4 },
      { key: 'ms-visit-cta', label: 'Book a Visit', visible: true, order: 5 },
      { key: 'ms-enquiry', label: 'Contact', visible: true, order: 6 },
    ],
  },
};

export const EDITORIAL = {
  id: 'editorial',
  label: 'Editorial',
  description: 'Split-screen hero, asymmetric photo wall, oversized type on a warm ink-and-rust palette — a bolder, magazine-style layout.',
  theme: {
    primaryColor: '#1c1410',
    secondaryColor: '#c65d33',
    backgroundColor: '#faf7f2',
    textColor: '#1c1410',
    buttonStyle: 'solid',
    borderRadius: 'none',
    fontStyle: 'editorial',
    sectionSpacing: 'spacious',
  },
  sections: [
    section('splitHero', {}),
    section('overview', { settings: { tone: 'light' } }),
    section('highlights', { sectionData: { heading: 'Why This Property' }, settings: { tone: 'light' } }),
    section('amenities', { settings: { tone: 'dark' } }),
    section('masonryGallery', { settings: { tone: 'light' } }),
    section('floorPlan', { settings: { tone: 'light' } }),
    section('location', { settings: { tone: 'dark' } }),
    section('pricing', { settings: { tone: 'light' } }),
    section('enquiryForm', { settings: { tone: 'light' } }),
    section('footer'),
  ],
  navbar: {
    showLogo: false,
    background: '#faf7f2',
    sticky: true,
    items: [
      { key: 'ms-hero', label: 'Home', visible: true, order: 0 },
      { key: 'ms-overview', label: 'About', visible: true, order: 1 },
      { key: 'ms-amenities', label: 'Amenities', visible: true, order: 2 },
      { key: 'ms-gallery', label: 'Gallery', visible: true, order: 3 },
      { key: 'ms-location', label: 'Location', visible: true, order: 4 },
      { key: 'ms-enquiry', label: 'Contact', visible: true, order: 5 },
    ],
  },
};

export const TEMPLATES = [PREMIUM_LUXURY, MODERN_REAL_ESTATE, LEAD_GENERATION, EDITORIAL];

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
