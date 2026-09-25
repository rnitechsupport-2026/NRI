import {
  Check, Elevator, Bolt, Car, Shield, Camera, Dumbbell, Waves, Ball, Building, Tree, Flame,
  Droplet, Phone, FireSafety, Filter, Bed, Wifi, Run, Dice,
} from '../../components/Icons.jsx';

// One icon + one generic, category-true blurb per amenity from AMENITY_LIST
// (utils/format.js). The blurb describes what the amenity type generally
// offers — never a claim about this specific property beyond "it has this".
export const AMENITY_META = {
  'Lift': { icon: Elevator, blurb: 'Quick, step-free access to every floor.' },
  'Power Backup': { icon: Bolt, blurb: 'Uninterrupted power during outages.' },
  'Covered Parking': { icon: Car, blurb: 'A dedicated, sheltered spot for your vehicle.' },
  'Security': { icon: Shield, blurb: 'Round-the-clock on-site security staff.' },
  'CCTV': { icon: Camera, blurb: 'Surveillance coverage across common areas.' },
  'Gym': { icon: Dumbbell, blurb: 'An on-site fitness space, no membership needed.' },
  'Swimming Pool': { icon: Waves, blurb: 'A shared pool for residents to unwind.' },
  "Children's Play Area": { icon: Ball, blurb: 'A safe outdoor space for kids to play.' },
  'Clubhouse': { icon: Building, blurb: 'A shared space for events and get-togethers.' },
  'Park': { icon: Tree, blurb: 'Landscaped green space right on the premises.' },
  'Gas Pipeline': { icon: Flame, blurb: 'Piped gas connection — no cylinder hassle.' },
  'Rain Water Harvesting': { icon: Droplet, blurb: 'Sustainable water management built in.' },
  'Intercom': { icon: Phone, blurb: 'Direct in-building communication with security.' },
  'Fire Safety': { icon: FireSafety, blurb: 'Fire detection and safety systems in place.' },
  'Visitor Parking': { icon: Car, blurb: 'Dedicated parking set aside for your guests.' },
  'Water Purifier': { icon: Filter, blurb: 'Treated drinking water on tap.' },
  'Servant Room': { icon: Bed, blurb: 'A separate room for domestic help.' },
  'Wi-Fi': { icon: Wifi, blurb: 'Connected common areas out of the box.' },
  'Jogging Track': { icon: Run, blurb: 'A dedicated track for your daily run.' },
  'Indoor Games': { icon: Dice, blurb: 'An indoor space for games and recreation.' },
};

export function amenityMeta(name) {
  return AMENITY_META[name] || { icon: Check, blurb: 'Included with this property.' };
}
