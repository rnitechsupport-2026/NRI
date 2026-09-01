require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { connect } = require('../config/db');

const IMG = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const HOUSE = [
  '1600596542815-ffad4c1539a9', '1600585154340-be6161a56a0c', '1580587771525-78b9dba3b914',
  '1568605114967-8130f3a36994', '1570129477492-45c003edd2be', '1512917774080-9991f1c4c750',
  '1449844908441-8829872d2607', '1564013799919-ab600027ffc6', '1613490493576-7fde63acd811',
  '1605276374104-dee2a0ed3cd6',
];
const INTERIOR = [
  '1560448204-e02f11c3d0e2', '1600607687939-ce8a6c25118c', '1522708323590-d24dbb6b0267',
  '1493809842364-78817add7ffb', '1484154218962-a197022b5858', '1600566753190-17f0baa2a6c3',
  '1600047509807-ba8f99d2cdde', '1502672260266-1c1ef2d93688',
];
const BUILDING = [
  '1545324418-cc1a3fa10c00', '1512918728675-ed5a9ecdebfd', '1592595896551-12b371d546d5',
  '1517646287270-a5a9ca602e5c', '1486406146926-c627a92ad1ab',
];
const LAND = ['1590725140246-20acdee442be', '1500382017468-9049fed747ef', '1466692476868-aef1dfb1e735'];
const COMMERCIAL = ['1497366754035-f200968a6e72', '1497366811353-6870744d04b2', '1441986300917-64674bd600d8'];

const pick = (arr, i) => arr[i % arr.length];
const AVATAR = (n) => `https://i.pravatar.cc/200?img=${n}`;

const TOURS = [
  { url: 'https://my.matterport.com/show/?m=SxQL3iGyoDo&play=1', provider: 'matterport' },
  { url: 'https://my.matterport.com/show/?m=roWxJPibhkY&play=1', provider: 'matterport' },
  { url: 'https://kuula.co/share/collection/7P2Gq?logo=1&info=1&fs=1&vr=1&thumbs=1', provider: 'kuula' },
  { url: 'https://www.youtube-nocookie.com/embed/1La4QzGeaaQ?rel=0&modestbranding=1', provider: 'youtube' },
];

const AMENITIES = [
  'Lift', 'Power Backup', 'Covered Parking', 'Security', 'CCTV', 'Gym',
  'Swimming Pool', "Children's Play Area", 'Clubhouse', 'Park', 'Gas Pipeline',
  'Rain Water Harvesting', 'Intercom', 'Fire Safety', 'Visitor Parking',
];
const someAmenities = (i) => AMENITIES.filter((_, k) => (k + i) % 3 !== 0).slice(0, 8);

const uniqueSlug = (() => {
  const seen = new Map();
  return async (text, model) => {
    const base = slugify(text, { lower: true, strict: true });
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const candidate = n === 1 ? base : `${base}-${n}`;
    const exists = await model.findOne({ slug: candidate }).select('_id').lean();
    if (!exists) return candidate;
    let suffix = 1;
    while (await model.findOne({ slug: `${base}-${n}-${suffix}` }).select('_id').lean()) suffix++;
    return `${base}-${n}-${suffix}`;
  };
})();

const USERS = [
  { name: 'Ramesh Kumar', email: 'owner@demo.com', phone: '9840012345', role: 'owner', city: 'Chennai', locality: 'Adyar', about: 'Property owner listing my own flats and land in South Chennai.', avatar: 12 },
  { name: 'Lakshmi Narayanan', email: 'lakshmi.owner@demo.com', phone: '9840012346', role: 'owner', city: 'Coimbatore', locality: 'RS Puram', about: 'Owner of residential units in Coimbatore city.', avatar: 45 },
  { name: 'Arun Prasad', email: 'agent@demo.com', phone: '9840022345', role: 'agent', city: 'Chennai', locality: 'Velachery', company: 'Prasad Property Consultants', rera: 'TN/AGENT/0142/2021', exp: 9, about: 'RERA registered channel partner handling resale & rental across Chennai.', avatar: 33, verified: 1 },
  { name: 'Divya Raghavan', email: 'divya.agent@demo.com', phone: '9840022346', role: 'agent', city: 'Bengaluru', locality: 'Whitefield', company: 'Skyline Realty Partners', rera: 'KA/AGENT/0891/2022', exp: 6, about: 'Specialist in East Bengaluru apartments and gated villas.', avatar: 47, verified: 1 },
  { name: 'Mohammed Faizal', email: 'faizal.agent@demo.com', phone: '9840022347', role: 'agent', city: 'Chennai', locality: 'OMR', company: 'Faizal Estates', rera: 'TN/AGENT/0377/2023', exp: 4, about: 'OMR IT corridor rentals and investment advisory.', avatar: 60 },
  { name: 'RNI Constructions', email: 'builder@demo.com', phone: '9840032345', role: 'builder', city: 'Chennai', locality: 'Guindy', company: 'RNI Constructions Pvt Ltd', rera: 'TN/29/Building/0123/2019', exp: 18, about: 'Premium residential developer with 24 delivered projects across Tamil Nadu.', avatar: 68, verified: 1 },
  { name: 'Sree Anandha Homes', email: 'anandha.builder@demo.com', phone: '9840032346', role: 'builder', city: 'Coimbatore', locality: 'Saravanampatti', company: 'Sree Anandha Homes LLP', rera: 'TN/29/Building/0455/2021', exp: 11, about: 'Affordable and mid-segment apartments in Kongu region.', avatar: 52, verified: 1 },
  { name: 'Nirmal Interiors', email: 'service@demo.com', phone: '9840042345', role: 'service', city: 'Chennai', company: 'Nirmal Interiors & Modular', serviceCategory: 'Interior Design', exp: 8, about: 'Turnkey interiors, modular kitchen and wardrobes.', avatar: 15 },
  { name: 'Sundar Legal Associates', email: 'legal@demo.com', phone: '9840042346', role: 'service', city: 'Chennai', company: 'Sundar Legal Associates', serviceCategory: 'Legal & Documentation', exp: 15, about: 'Title verification, EC check, sale deed drafting and registration support.', avatar: 51 },
  { name: 'Portal Admin', email: 'admin@demo.com', phone: '9840099999', role: 'admin', city: 'Chennai', about: 'Platform administrator.', avatar: 8, verified: 1 },
];

const PROPERTIES = [
  { t: '3 BHK Premium Apartment in Adyar with Sea Breeze', p: 'sale', ty: 'apartment', bhk: 3, ba: 3, area: 1650, price: 21500000, city: 'Chennai', loc: 'Adyar', o: 0, feat: 1, img: INTERIOR },
  { t: '2 BHK Semi-Furnished Flat near Thiruvanmiyur Beach', p: 'rent', ty: 'apartment', bhk: 2, ba: 2, area: 1050, price: 32000, city: 'Chennai', loc: 'Thiruvanmiyur', o: 0, img: INTERIOR },
  { t: 'DTCP Approved Residential Plot in Sholinganallur', p: 'sale', ty: 'plot', area: 2400, unit: 'sqft', price: 9600000, city: 'Chennai', loc: 'Sholinganallur', o: 0, img: LAND },
  { t: '4 BHK Luxury Villa with Private Pool — ECR', p: 'sale', ty: 'villa', bhk: 4, ba: 5, area: 3800, price: 68000000, city: 'Chennai', loc: 'East Coast Road', o: 2, feat: 1, img: HOUSE },
  { t: '2 BHK Fully Furnished Flat for IT Professionals — OMR', p: 'rent', ty: 'apartment', bhk: 2, ba: 2, area: 1120, price: 28500, city: 'Chennai', loc: 'OMR Perungudi', o: 4, feat: 1, img: INTERIOR },
  { t: 'Independent House 3 BHK in Anna Nagar West', p: 'sale', ty: 'independent-house', bhk: 3, ba: 3, area: 2200, price: 32000000, city: 'Chennai', loc: 'Anna Nagar', o: 2, img: HOUSE },
  { t: 'Furnished Office Space 4200 sqft — Guindy', p: 'lease', ty: 'office', area: 4200, price: 385000, city: 'Chennai', loc: 'Guindy', o: 2, img: COMMERCIAL },
  { t: 'Retail Shop on Main Road — T Nagar', p: 'rent', ty: 'shop', area: 850, price: 145000, city: 'Chennai', loc: 'T Nagar', o: 4, img: COMMERCIAL },
  { t: '3 BHK Gated Community Flat — Velachery', p: 'sale', ty: 'apartment', bhk: 3, ba: 2, area: 1420, price: 13200000, city: 'Chennai', loc: 'Velachery', o: 2, feat: 1, img: INTERIOR },
  { t: '1 BHK Compact Flat close to Metro — Ashok Nagar', p: 'rent', ty: 'apartment', bhk: 1, ba: 1, area: 620, price: 16500, city: 'Chennai', loc: 'Ashok Nagar', o: 4, img: INTERIOR },
  { t: '3 BHK Lake View Apartment — Whitefield', p: 'sale', ty: 'apartment', bhk: 3, ba: 3, area: 1780, price: 17800000, city: 'Bengaluru', loc: 'Whitefield', o: 3, feat: 1, img: BUILDING },
  { t: '4 BHK Row Villa in Sarjapur Road', p: 'sale', ty: 'villa', bhk: 4, ba: 4, area: 2950, price: 29500000, city: 'Bengaluru', loc: 'Sarjapur Road', o: 3, img: HOUSE },
  { t: '2 BHK Semi Furnished — Electronic City Phase 1', p: 'rent', ty: 'apartment', bhk: 2, ba: 2, area: 1080, price: 24000, city: 'Bengaluru', loc: 'Electronic City', o: 3, img: INTERIOR },
  { t: '2 BHK Budget Flat near Saravanampatti IT Park', p: 'sale', ty: 'apartment', bhk: 2, ba: 2, area: 985, price: 5400000, city: 'Coimbatore', loc: 'Saravanampatti', o: 1, img: INTERIOR },
  { t: 'Farmhouse with 1.2 Acre Land — Thondamuthur', p: 'sale', ty: 'farmhouse', bhk: 3, ba: 3, area: 52272, unit: 'sqft', price: 24000000, city: 'Coimbatore', loc: 'Thondamuthur', o: 1, img: HOUSE },
  { t: '3 BHK Duplex in RS Puram', p: 'sale', ty: 'independent-house', bhk: 3, ba: 3, area: 2050, price: 15500000, city: 'Coimbatore', loc: 'RS Puram', o: 1, feat: 1, img: HOUSE },
  { t: 'Warehouse 12000 sqft on Trichy Highway', p: 'lease', ty: 'warehouse', area: 12000, price: 420000, city: 'Coimbatore', loc: 'Trichy Road', o: 1, img: COMMERCIAL },
  { t: 'Premium 3 BHK Sky Residence — Guindy', p: 'sale', ty: 'apartment', bhk: 3, ba: 3, area: 1890, price: 24500000, city: 'Chennai', loc: 'Guindy', o: 5, feat: 1, img: BUILDING },
  { t: 'PG for Working Women — Sholinganallur (AC Twin Sharing)', p: 'pg', ty: 'apartment', bhk: 1, ba: 1, area: 320, price: 9500, city: 'Chennai', loc: 'Sholinganallur', o: 4, img: INTERIOR },
  { t: 'Corner Plot 3600 sqft — Vandalur Kelambakkam Road', p: 'sale', ty: 'plot', area: 3600, price: 12600000, city: 'Chennai', loc: 'Kelambakkam', o: 0, img: LAND },
];

const PROJECTS = [
  { n: 'RNI Grand Vista', b: 5, city: 'Chennai', loc: 'Perungudi, OMR', ty: 'apartment', cfg: '2, 3 & 4 BHK', min: 9800000, max: 21500000, aMin: 1080, aMax: 2140, units: 386, towers: 4, st: 'ongoing', rera: 'TN/29/Building/0123/2019', feat: 1, tag: 'Sky homes on the IT corridor', poss: '2027-06-30' },
  { n: 'RNI Palm Meadows', b: 5, city: 'Chennai', loc: 'ECR, Uthandi', ty: 'villa', cfg: '4 & 5 BHK Villas', min: 42000000, max: 78000000, aMin: 3200, aMax: 5400, units: 64, towers: 0, st: 'ongoing', rera: 'TN/29/Building/0198/2021', feat: 1, tag: 'Limited edition beachside villas', poss: '2026-12-31' },
  { n: 'RNI Signature Towers', b: 5, city: 'Chennai', loc: 'Guindy', ty: 'apartment', cfg: '3 & 4 BHK', min: 22000000, max: 38000000, aMin: 1780, aMax: 2860, units: 148, towers: 2, st: 'completed', rera: 'TN/29/Building/0077/2018', feat: 1, tag: 'Ready to move luxury residences', poss: '2024-03-31' },
  { n: 'RNI Business Park', b: 5, city: 'Chennai', loc: 'Sholinganallur', ty: 'commercial', cfg: 'Office suites 800 - 12000 sqft', min: 8500000, max: 120000000, aMin: 800, aMax: 12000, units: 92, towers: 1, st: 'upcoming', rera: 'TN/29/Building/0311/2024', tag: 'Grade-A office spaces', poss: '2028-09-30' },
  { n: 'Anandha Green County', b: 6, city: 'Coimbatore', loc: 'Saravanampatti', ty: 'apartment', cfg: '2 & 3 BHK', min: 4900000, max: 8600000, aMin: 940, aMax: 1520, units: 240, towers: 3, st: 'ongoing', rera: 'TN/29/Building/0455/2021', feat: 1, tag: 'Smart homes near IT park', poss: '2027-03-31' },
  { n: 'Anandha Nakshatra Township', b: 6, city: 'Coimbatore', loc: 'Kovaipudur', ty: 'township', cfg: 'Plots & Villas', min: 3200000, max: 19000000, aMin: 1200, aMax: 3400, units: 410, towers: 0, st: 'upcoming', rera: 'TN/29/Building/0512/2024', tag: 'Integrated hill-view township', poss: '2029-06-30' },
];

const SERVICES = [
  { u: 7, t: 'Turnkey Home Interiors — 2/3 BHK Packages', cat: 'Interior Design', from: 450000, unit: 'per home', city: 'Chennai', img: '1600607687939-ce8a6c25118c', d: 'End-to-end interiors: modular kitchen, wardrobes, false ceiling, painting and lighting with 10-year warranty.' },
  { u: 7, t: 'Modular Kitchen Design & Installation', cat: 'Interior Design', from: 185000, unit: 'starting', city: 'Chennai', img: '1484154218962-a197022b5858', d: 'German hardware, acrylic/laminate finishes, 3D design preview before you pay.' },
  { u: 8, t: 'Property Title Verification & EC Check', cat: 'Legal & Documentation', from: 12000, unit: 'per property', city: 'Chennai', img: '1450101499163-c8848c66ca85', d: '30-year title trace, encumbrance certificate review and legal opinion letter within 5 working days.' },
  { u: 8, t: 'Sale Deed Drafting + Registration Assistance', cat: 'Legal & Documentation', from: 18000, unit: 'per deed', city: 'Chennai', img: '1589829545856-d10d557cf95f', d: 'Drafting, stamp duty computation, sub-registrar appointment and on-site registration support.' },
  { u: 7, t: 'Home Painting & Waterproofing', cat: 'Home Services', from: 28000, unit: 'starting', city: 'Chennai', img: '1562259949-e8e7689d7828', d: 'Asian Paints certified applicators, terrace waterproofing with 7-year warranty.' },
  { u: 8, t: 'Home Loan Advisory — Best Rate Match', cat: 'Home Loan', from: 0, unit: 'free consultation', city: 'Chennai', img: '1554224155-6726b3ff858f', d: 'Compare 18+ banks and NBFCs, eligibility check, doorstep documentation and sanction follow-up.' },
  { u: 7, t: 'Packers & Movers — Local and Intercity', cat: 'Packers & Movers', from: 9500, unit: 'starting', city: 'Chennai', img: '1600518464441-9154a4dea21b', d: 'Insured door-to-door shifting with dedicated supervisor and GPS tracked vehicle.' },
  { u: 8, t: 'Vaastu Consultation for Home & Plot', cat: 'Vaastu', from: 7500, unit: 'per visit', city: 'Chennai', img: '1600585154526-990dced4db0d', d: 'On-site vaastu audit with non-demolition remedies and written report.' },
];

async function seed() {
  console.log('→ seeding…');
  await connect();
  const hash = await bcrypt.hash('Test@123', 10);

  const User = require('../models/User');
  const Property = require('../models/Property');
  const PropertyImage = require('../models/PropertyImage');
  const Project = require('../models/Project');
  const ProjectImage = require('../models/ProjectImage');
  const ServiceOffering = require('../models/ServiceOffering');
  const Lead = require('../models/Lead');
  const PriceHistory = require('../models/PriceHistory');

  await User.deleteMany({});
  await Property.deleteMany({});
  await Project.deleteMany({});
  await ServiceOffering.deleteMany({});
  await Lead.deleteMany({});

  const userIds = [];
  for (const u of USERS) {
    const user = await User.create({
      name: u.name,
      email: u.email,
      phone: u.phone,
      passwordHash: hash,
      role: u.role,
      companyName: u.company || null,
      reraId: u.rera || null,
      serviceCategory: u.serviceCategory || null,
      experienceYears: u.exp || null,
      city: u.city || null,
      locality: u.locality || null,
      about: u.about || null,
      avatarUrl: AVATAR(u.avatar),
      isVerified: u.verified || 0,
      status: 'active',
    });
    userIds.push(user._id);
  }
  console.log(`  users: ${userIds.length}`);

  let propCount = 0;
  for (let i = 0; i < PROPERTIES.length; i++) {
    const p = PROPERTIES[i];
    const gallery = [pick(p.img, i), pick(p.img, i + 1), pick(p.img, i + 2), pick(INTERIOR, i + 3)];
    const cover = IMG(gallery[0]);
    const slug = await uniqueSlug(p.t, Property);

    const property = await Property.create({
      user: userIds[p.o],
      title: p.t,
      slug,
      description: `${p.t}. Well maintained ${p.ty.replace('-', ' ')} located in ${p.loc}, ${p.city}. ` +
        `Excellent connectivity to schools, hospitals, supermarkets and IT corridors. ` +
        `Clear title, all documents available for verification. Immediate site visit possible.`,
      purpose: p.p,
      propertyType: p.ty,
      bhk: p.bhk || null,
      bathrooms: p.ba || null,
      balconies: p.bhk ? Math.max(1, p.bhk - 1) : null,
      furnishing: i % 3 === 0 ? 'fully-furnished' : i % 3 === 1 ? 'semi-furnished' : 'unfurnished',
      facing: ['East', 'North', 'North-East', 'West', 'South'][i % 5],
      floorNo: p.ty === 'plot' || p.ty === 'farmhouse' ? null : (i % 12) + 1,
      totalFloors: p.ty === 'plot' || p.ty === 'farmhouse' ? null : 14,
      ageYears: (i % 9),
      possession: i % 4 === 0 ? 'under-construction' : 'ready-to-move',
      builtUpArea: p.area,
      carpetArea: Math.round(p.area * 0.82),
      areaUnit: p.unit || 'sqft',
      price: p.price,
      priceNegotiable: i % 3 === 0 ? true : false,
      maintenance: p.p === 'rent' ? 2500 + i * 100 : null,
      address: `${10 + i}, ${p.loc} Main Road`,
      locality: p.loc,
      city: p.city,
      state: p.city === 'Bengaluru' ? 'Karnataka' : 'Tamil Nadu',
      pincode: p.city === 'Chennai' ? '600041' : p.city === 'Bengaluru' ? '560066' : '641035',
      amenities: someAmenities(i),
      coverImage: cover,
      tourUrl: i % 2 === 0 ? TOURS[(i / 2) % TOURS.length].url : null,
      tourProvider: i % 2 === 0 ? TOURS[(i / 2) % TOURS.length].provider : null,
      floorPlanUrl: i % 3 === 0 ? IMG('1503174971373-b1f69850bded') : null,
      isFeatured: p.feat || 0,
      isVerified: i % 2 === 0 ? true : false,
      status: 'active',
      views: 40 + i * 37,
    });

    await PropertyImage.insertMany(gallery.map((url, g) => ({ property: property._id, url: IMG(url), sortOrder: g })));
    propCount++;
  }
  console.log(`  properties: ${propCount}`);

  const projectIds = [];
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const gallery = [pick(BUILDING, i), pick(BUILDING, i + 1), pick(INTERIOR, i), pick(HOUSE, i)];
    const slug = await uniqueSlug(p.n, Project);

    const project = await Project.create({
      builder: userIds[p.b],
      name: p.n,
      slug,
      tagline: p.tag,
      description: `${p.n} by ${USERS[p.b].company || USERS[p.b].name} is a ${p.st} ${p.ty} development at ${p.loc}, ${p.city}. ` +
        `Offering ${p.cfg} across ${p.units} units with world-class amenities, ` +
        `RERA approved and designed for modern family living.`,
      projectType: p.ty,
      configuration: p.cfg,
      minPrice: p.min,
      maxPrice: p.max,
      minArea: p.aMin,
      maxArea: p.aMax,
      totalUnits: p.units,
      towers: p.towers || null,
      locality: p.loc,
      city: p.city,
      address: `${p.loc}, ${p.city}`,
      reraNo: p.rera,
      possessionOn: new Date(p.poss),
      amenities: AMENITIES.slice(0, 12),
      coverImage: IMG(gallery[0]),
      status: p.st,
      isFeatured: p.feat || 0,
      views: 120 + i * 64,
    });

    projectIds.push(project._id);
    await ProjectImage.insertMany(gallery.map((url, g) => ({ project: project._id, url: IMG(url), sortOrder: g })));
  }
  console.log(`  projects: ${projectIds.length}`);

  const serviceIds = [];
  for (const s of SERVICES) {
    const service = await ServiceOffering.create({
      user: userIds[s.u],
      title: s.t,
      slug: await uniqueSlug(s.t, ServiceOffering),
      category: s.cat,
      description: s.d,
      priceFrom: s.from,
      priceUnit: s.unit,
      city: s.city,
      coverImage: IMG(s.img),
      rating: 4.3 + (s.from % 5) / 10,
      status: 'active',
    });
    serviceIds.push(service._id);
  }
  console.log(`  services: ${serviceIds.length}`);

  const props = await Property.find({}).limit(10).select('_id user').lean();
  const names = ['Karthik S', 'Priya M', 'Vignesh R', 'Anitha Devi', 'Suresh Babu', 'Meena K', 'Rahul Nair', 'Deepa V'];
  let leadCount = 0;
  for (let i = 0; i < props.length; i++) {
    for (let k = 0; k < (i % 3) + 1; k++) {
      await Lead.create({
        receiver: props[i].user,
        property: props[i]._id,
        name: names[(i + k) % names.length],
        email: `lead${i}${k}@example.com`,
        phone: `98${(400000000 + i * 137 + k).toString().slice(0, 9)}`,
        message: 'Interested in this property. Please share more photos and arrange a site visit this weekend.',
        source: 'property',
        status: ['new', 'contacted', 'visit-scheduled', 'closed'][(i + k) % 4],
      });
      leadCount++;
    }
  }
  for (let i = 0; i < projectIds.length; i++) {
    await Lead.create({
      receiver: PROJECTS[i].b === 5 ? userIds[5] : userIds[6],
      project: projectIds[i],
      name: names[i % names.length],
      email: `proj${i}@example.com`,
      phone: `9500${(100000 + i).toString().slice(0, 6)}`,
      message: 'Please share the brochure, price sheet and available units.',
      source: 'project',
      status: ['new', 'contacted'][i % 2],
    });
    leadCount++;
  }

  for (const p of await Property.find({}).select('_id price').lean()) {
    await PriceHistory.create({ property: p._id, price: p.price, alerted: true });
  }

  console.log(`  leads: ${leadCount}`);
  console.log('\n✔ seed complete. Demo logins (password: Test@123)');
  console.log('   owner@demo.com    → Owner dashboard');
  console.log('   agent@demo.com    → Agent dashboard');
  console.log('   builder@demo.com  → Builder dashboard');
  console.log('   service@demo.com  → Services dashboard');
  console.log('   admin@demo.com    → Admin dashboard');
}

seed()
  .catch((e) => { console.error('✖ seed failed:', e); process.exitCode = 1; })
  .finally(async () => { await mongoose.disconnect(); });
