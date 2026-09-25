import Hero from './sections/Hero.jsx';
import SplitHero from './sections/SplitHero.jsx';
import Overview from './sections/Overview.jsx';
import Highlights from './sections/Highlights.jsx';
import Gallery from './sections/Gallery.jsx';
import MasonryGallery from './sections/MasonryGallery.jsx';
import Amenities from './sections/Amenities.jsx';
import FloorPlan from './sections/FloorPlan.jsx';
import Location from './sections/Location.jsx';
import OwnerInfo from './sections/OwnerInfo.jsx';
import Pricing from './sections/Pricing.jsx';
import EnquiryFormSection from './sections/EnquiryFormSection.jsx';
import { CallCta, WhatsappCta, SiteVisitCta, BrochureCta } from './sections/CtaBlocks.jsx';
import Testimonials from './sections/Testimonials.jsx';
import Faq from './sections/Faq.jsx';
import { TextBlock, ImageBlock, ImageTextBlock, Divider, Spacer } from './sections/BasicBlocks.jsx';
import Footer from './sections/Footer.jsx';

// sectionType -> { component, label, group } — the single source of truth for
// what a section IS. Templates just pick which of these to include, in what
// order, with what settings; the drag-and-drop builder (Stage 2) reads this
// same map to build its component palette. Nothing here is template-specific.
export const SECTION_REGISTRY = {
  hero: { component: Hero, label: 'Hero', group: 'Property' },
  splitHero: { component: SplitHero, label: 'Split Hero', group: 'Property' },
  overview: { component: Overview, label: 'Property Overview', group: 'Property' },
  highlights: { component: Highlights, label: 'Highlights', group: 'Property' },
  gallery: { component: Gallery, label: 'Gallery', group: 'Property' },
  masonryGallery: { component: MasonryGallery, label: 'Masonry Gallery', group: 'Property' },
  amenities: { component: Amenities, label: 'Amenities', group: 'Property' },
  floorPlan: { component: FloorPlan, label: 'Floor Plan', group: 'Property' },
  location: { component: Location, label: 'Location', group: 'Property' },
  ownerInfo: { component: OwnerInfo, label: 'Builder / Owner Info', group: 'Property' },
  pricing: { component: Pricing, label: 'Price', group: 'Property' },
  enquiryForm: { component: EnquiryFormSection, label: 'Enquiry Form', group: 'Lead Generation' },
  callCta: { component: CallCta, label: 'Call CTA', group: 'Lead Generation' },
  whatsappCta: { component: WhatsappCta, label: 'WhatsApp CTA', group: 'Lead Generation' },
  siteVisitCta: { component: SiteVisitCta, label: 'Book Site Visit', group: 'Lead Generation' },
  brochureCta: { component: BrochureCta, label: 'Download Brochure', group: 'Lead Generation' },
  testimonials: { component: Testimonials, label: 'Testimonials', group: 'Other' },
  faq: { component: Faq, label: 'FAQ', group: 'Other' },
  text: { component: TextBlock, label: 'Text', group: 'Basic' },
  image: { component: ImageBlock, label: 'Image', group: 'Basic' },
  imageText: { component: ImageTextBlock, label: 'Image + Text', group: 'Basic' },
  divider: { component: Divider, label: 'Divider', group: 'Basic' },
  spacer: { component: Spacer, label: 'Spacer', group: 'Basic' },
  footer: { component: Footer, label: 'Footer', group: 'Other' },
};

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY);
