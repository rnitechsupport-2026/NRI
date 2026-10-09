import Hero from './sections/Hero.jsx';
import SplitHero from './sections/SplitHero.jsx';
import Overview from './sections/Overview.jsx';
import Highlights from './sections/Highlights.jsx';
import ImageMap from './sections/ImageMap.jsx';
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

// sectionType -> { component, label, group, anchor } — the single source of
// truth for what a section IS. Templates just pick which of these to include,
// in what order, with what settings; the drag-and-drop builder reads this
// same map to build its component palette. Nothing here is template-specific.
//
// `anchor` is the id the section is reachable at (#ms-gallery …) — what navbar
// links and buttons point to. Two types may share one (either hero is
// "ms-hero"); MicrositeRenderer hands out the id, so a page never ends up
// with the same id twice.
export const SECTION_REGISTRY = {
  hero: { component: Hero, label: 'Hero', group: 'Property', anchor: 'ms-hero' },
  splitHero: { component: SplitHero, label: 'Split Hero', group: 'Property', anchor: 'ms-hero' },
  overview: { component: Overview, label: 'Property Overview', group: 'Property', anchor: 'ms-overview' },
  highlights: { component: Highlights, label: 'Highlights', group: 'Property', anchor: 'ms-highlights' },
  imageMap: { component: ImageMap, label: 'Image Mapping', group: 'Property', anchor: 'ms-image-map' },
  gallery: { component: Gallery, label: 'Gallery', group: 'Property', anchor: 'ms-gallery' },
  masonryGallery: { component: MasonryGallery, label: 'Masonry Gallery', group: 'Property', anchor: 'ms-gallery' },
  amenities: { component: Amenities, label: 'Amenities', group: 'Property', anchor: 'ms-amenities' },
  floorPlan: { component: FloorPlan, label: 'Floor Plan', group: 'Property', anchor: 'ms-floorplan' },
  location: { component: Location, label: 'Location', group: 'Property', anchor: 'ms-location' },
  ownerInfo: { component: OwnerInfo, label: 'Builder / Owner Info', group: 'Property', anchor: 'ms-owner' },
  pricing: { component: Pricing, label: 'Price', group: 'Property', anchor: 'ms-pricing' },
  enquiryForm: { component: EnquiryFormSection, label: 'Enquiry Form', group: 'Lead Generation', anchor: 'ms-enquiry' },
  callCta: { component: CallCta, label: 'Call CTA', group: 'Lead Generation', anchor: 'ms-call-cta' },
  whatsappCta: { component: WhatsappCta, label: 'WhatsApp CTA', group: 'Lead Generation', anchor: 'ms-whatsapp-cta' },
  siteVisitCta: { component: SiteVisitCta, label: 'Book Site Visit', group: 'Lead Generation', anchor: 'ms-visit-cta' },
  brochureCta: { component: BrochureCta, label: 'Download Brochure', group: 'Lead Generation', anchor: 'ms-brochure-cta' },
  testimonials: { component: Testimonials, label: 'Testimonials', group: 'Other', anchor: 'ms-testimonials' },
  faq: { component: Faq, label: 'FAQ', group: 'Other', anchor: 'ms-faq' },
  text: { component: TextBlock, label: 'Text', group: 'Basic', anchor: 'ms-text' },
  image: { component: ImageBlock, label: 'Image', group: 'Basic', anchor: 'ms-image' },
  imageText: { component: ImageTextBlock, label: 'Image + Text', group: 'Basic', anchor: 'ms-image-text' },
  divider: { component: Divider, label: 'Divider', group: 'Basic' },
  spacer: { component: Spacer, label: 'Spacer', group: 'Basic' },
  footer: { component: Footer, label: 'Footer', group: 'Other', anchor: 'ms-footer' },
};

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY);
