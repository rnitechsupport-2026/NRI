// Everything the microsite renders comes from this one object, so the exact
// same component tree can be pointed at a different property later — swap
// this file (or fetch it into this shape) and nothing else needs to change.

export const property = {
  name: 'The Grand Oaks',
  label: 'Premium Residences',
  location: 'OMR, Chennai',
  type: '3 & 4 BHK Villas',
  area: '2400 – 3200 Sq.Ft',
  units: '12 Exclusive Villas',
  price: '₹1.85 Cr*',
  possession: '2027',
  builder: 'ABC Developers',
  phone: '+91 XXXXX XXXXX',

  heroImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=2400&q=80',

  story: {
    label: 'The Story',
    heading: 'A home should do more than shelter you.',
    body: 'It should shape your mornings, hold your celebrations, and become part of your story.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
  },

  experience: {
    heading: 'Life, beautifully considered.',
    moments: [
      {
        index: '01',
        title: 'Morning',
        text: 'Wake up to quiet gardens and natural light.',
        image: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1600&q=80',
      },
      {
        index: '02',
        title: 'Work',
        text: 'Dedicated spaces designed for focused living.',
        image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
      },
      {
        index: '03',
        title: 'Evening',
        text: 'Unwind by the pool as the day slows down.',
        image: 'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=1600&q=80',
      },
      {
        index: '04',
        title: 'Weekend',
        text: 'Spaces created for conversations, celebrations and memories.',
        image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80',
      },
    ],
  },

  architecture: {
    heading: 'Designed around light.\nBuilt around life.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
    principles: [
      { index: '01', title: 'Natural Light' },
      { index: '02', title: 'Open Planning' },
      { index: '03', title: 'Indoor / Outdoor Living' },
      { index: '04', title: 'Climate Conscious Design' },
    ],
  },

  floorPlans: {
    heading: 'Every square foot has a purpose.',
    tabs: [
      {
        key: '3bhk',
        label: '3 BHK',
        image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80',
        stats: [
          { label: 'Total Area', value: '2400 Sq.Ft' },
          { label: 'Bedrooms', value: '3' },
          { label: 'Bathrooms', value: '4' },
          { label: 'Parking', value: '2 Cars' },
          { label: 'Garden', value: 'Private' },
        ],
      },
      {
        key: '4bhk',
        label: '4 BHK',
        image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=80',
        stats: [
          { label: 'Total Area', value: '3200 Sq.Ft' },
          { label: 'Bedrooms', value: '4' },
          { label: 'Bathrooms', value: '5' },
          { label: 'Parking', value: '3 Cars' },
          { label: 'Garden', value: 'Private' },
        ],
      },
    ],
  },

  amenities: [
    { key: 'pool', title: 'Swimming Pool', desc: 'A resort-style pool framed by timber decking and quiet water.', image: 'https://images.unsplash.com/photo-1615880484746-a134be9a6ecf?auto=format&fit=crop&w=1600&q=80' },
    { key: 'clubhouse', title: 'Clubhouse', desc: 'A private clubhouse built for gathering, unwinding and celebration.', image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80' },
    { key: 'gardens', title: 'Landscaped Gardens', desc: 'Curated greens that soften every walk between home and gate.', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1600&q=80' },
    { key: 'kids', title: 'Kids Play Area', desc: 'A safe, shaded space designed for imagination to run free.', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80' },
    { key: 'fitness', title: 'Fitness Studio', desc: 'A fully-equipped studio for a life that stays in motion.', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80' },
    { key: 'jogging', title: 'Jogging Track', desc: 'A dedicated track winding through the landscaped grounds.', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1600&q=80' },
    { key: 'security', title: '24/7 Security', desc: 'Round-the-clock trained personnel and monitored access points.', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80' },
    { key: 'ev', title: 'EV Charging', desc: 'Dedicated charging infrastructure for a future-ready lifestyle.', image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=80' },
    { key: 'cctv', title: 'CCTV', desc: 'Comprehensive surveillance across every common area.', image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1600&q=80' },
    { key: 'parking', title: 'Visitor Parking', desc: 'Dedicated, hassle-free parking set aside for your guests.', image: 'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=1600&q=80' },
  ],

  location: {
    heading: 'Connected to everything.\nAway from the ordinary.',
    places: [
      { name: 'OMR IT Corridor', time: '8 min' },
      { name: 'Sholinganallur', time: '12 min' },
      { name: 'Airport', time: '32 min' },
      { name: 'International School', time: '7 min' },
      { name: 'Hospital', time: '10 min' },
      { name: 'Shopping Mall', time: '14 min' },
    ],
  },

  builderInfo: {
    name: 'ABC Developers',
    heading: 'Built by people who think beyond buildings.',
    stats: [
      { value: 15, suffix: '+', label: 'Years Experience' },
      { value: 28, suffix: '', label: 'Projects Delivered' },
      { value: 2.4, suffix: 'M+', label: 'Sq.Ft Delivered', decimals: 1 },
      { value: 98, suffix: '%', label: 'Customer Satisfaction' },
    ],
    projects: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=800&q=80',
    ],
  },

  pricing: [
    { type: '3 BHK', price: '₹1.85 Cr*' },
    { type: '4 BHK', price: '₹2.25 Cr*' },
  ],

  ctaImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=80',
};
