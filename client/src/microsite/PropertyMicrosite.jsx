import './microsite.css';
import { property } from './data/property.js';
import StickyNavigation from './components/StickyNavigation.jsx';
import MobileCTA from './components/MobileCTA.jsx';
import HeroSection from './components/HeroSection.jsx';
import PropertyStory from './components/PropertyStory.jsx';
import ExperienceSection from './components/ExperienceSection.jsx';
import ArchitectureSection from './components/ArchitectureSection.jsx';
import FloorPlanExplorer from './components/FloorPlanExplorer.jsx';
import AmenitiesExperience from './components/AmenitiesExperience.jsx';
import LocationSection from './components/LocationSection.jsx';
import BuilderSection from './components/BuilderSection.jsx';
import PricingSection from './components/PricingSection.jsx';
import VisitCTA from './components/VisitCTA.jsx';

/**
 * A cinematic, section-by-section property brochure — deliberately not the
 * data-dense listing page. Everything renders off the single `property`
 * object in ./data/property.js, so pointing this at a different property
 * later is a data swap, not a rebuild.
 */
export default function PropertyMicrosite() {
  return (
    <div className="ms-root font-body">
      <StickyNavigation propertyName={property.name} />
      <MobileCTA phone={property.phone} />

      <HeroSection property={property} />
      <PropertyStory story={property.story} />
      <ExperienceSection experience={property.experience} />
      <ArchitectureSection architecture={property.architecture} />
      <FloorPlanExplorer floorPlans={property.floorPlans} />
      <AmenitiesExperience amenities={property.amenities} />
      <LocationSection location={property.location} />
      <BuilderSection builderInfo={property.builderInfo} />
      <PricingSection pricing={property.pricing} />
      <VisitCTA property={property} />
    </div>
  );
}
