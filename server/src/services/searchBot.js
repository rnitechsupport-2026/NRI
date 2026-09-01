/**
 * Search assistant — turns "3bhk under 1.2 cr in Adyar with parking" into the
 * same filter object the listing page uses.
 *
 * Two parsers:
 *   • Claude with structured outputs, when ANTHROPIC_API_KEY is set. Handles
 *     phrasing the rules miss ("somewhere I can walk to the beach", "cheap").
 *   • A deterministic rule parser otherwise — no key, still useful. It is also
 *     the safety net if the model returns something unusable.
 *
 * Both return the SAME shape, so the route doesn't care which one ran.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const PURPOSES = ['sale', 'rent', 'pg', 'lease'];
const TYPES = ['apartment', 'villa', 'independent-house', 'plot', 'office', 'shop', 'warehouse', 'farmhouse'];
const FURNISHING = ['unfurnished', 'semi-furnished', 'fully-furnished'];
const POSSESSION = ['ready-to-move', 'under-construction'];

const AMENITIES = [
  'Lift', 'Power Backup', 'Covered Parking', 'Security', 'CCTV', 'Gym',
  'Swimming Pool', "Children's Play Area", 'Clubhouse', 'Park', 'Gas Pipeline',
  'Rain Water Harvesting', 'Intercom', 'Fire Safety', 'Visitor Parking',
  'Water Purifier', 'Servant Room', 'Wi-Fi', 'Jogging Track', 'Indoor Games',
];

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic();
  return client;
}
const hasKey = () => !!process.env.ANTHROPIC_API_KEY;

/** The empty filter — every parser returns this shape. */
const blank = () => ({
  purpose: null, property_type: [], city: null, locality: null, bhk: [],
  minPrice: null, maxPrice: null, minArea: null, furnishing: null,
  possession: null, amenities: [], hasTour: false, verifiedOnly: false,
  keywords: null,
});

/* ------------------------------------------------------- rule parser */

const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, single: 1, double: 2 };

/** "80 lakh" / "1.2cr" / "50k" / "25,000" / "5000000" → a rupee integer. */
function toRupees(numStr, unit) {
  const n = parseFloat(String(numStr).replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const u = (unit || '').toLowerCase();
  if (/^(cr|crore|crores)$/.test(u)) return Math.round(n * 10000000);
  if (/^(l|lac|lacs|lakh|lakhs)$/.test(u)) return Math.round(n * 100000);
  if (/^k$/.test(u)) return Math.round(n * 1000);
  return Math.round(n);
}

const NUM = '(\\d+(?:[.,]\\d+)?)\\s*(cr|crore|crores|l|lac|lacs|lakh|lakhs|k)?';

/**
 * Deterministic extraction. `cities` and `localities` come from the DB so it
 * only ever matches places we actually have listings in.
 */
function ruleParse(text, cities = [], localities = []) {
  const f = blank();
  const t = ` ${String(text).toLowerCase()} `;

  // ---- purpose
  if (/\b(pg|paying guest|co-?living|hostel)\b/.test(t)) f.purpose = 'pg';
  else if (/\b(lease|leasing)\b/.test(t)) f.purpose = 'lease';
  else if (/\b(rent|rental|rented|tenant|to let|monthly)\b/.test(t)) f.purpose = 'rent';
  else if (/\b(buy|buying|sale|for sale|purchase|invest|investment|own)\b/.test(t)) f.purpose = 'sale';

  // ---- property type
  const typeWords = [
    [/\b(flat|flats|apartment|apartments)\b/, 'apartment'],
    [/\b(villa|villas|bungalow)\b/, 'villa'],
    [/\b(independent house|individual house|row house)\b/, 'independent-house'],
    [/\b(plot|plots|land|site|sites)\b/, 'plot'],
    [/\b(office|offices|workspace|commercial space)\b/, 'office'],
    [/\b(shop|shops|showroom|retail)\b/, 'shop'],
    [/\b(warehouse|godown|storage)\b/, 'warehouse'],
    [/\b(farm ?house|farmland)\b/, 'farmhouse'],
  ];
  typeWords.forEach(([re, val]) => { if (re.test(t) && !f.property_type.includes(val)) f.property_type.push(val); });
  // a bare "house" only counts if nothing more specific matched
  if (!f.property_type.length && /\bhouse\b/.test(t)) f.property_type.push('independent-house');

  // ---- bedrooms: "3bhk", "3 bhk", "2 & 3 bhk", "three bedroom"
  const bhk = new Set();
  for (const m of t.matchAll(/(\d)\s*(?:bhk|bedroom|bed room|br\b)/g)) bhk.add(Number(m[1]));
  for (const m of t.matchAll(/\b(one|two|three|four|five|six)\s*(?:bhk|bedroom|bed)/g)) bhk.add(WORD_NUM[m[1]]);
  // "2 and 3 bhk" / "2, 3 bhk" — pick up the leading numbers before a bhk token
  const multi = t.match(/((?:\d\s*(?:,|and|&|or)\s*)+\d)\s*(?:bhk|bedroom)/);
  if (multi) String(multi[1]).split(/[^\d]+/).filter(Boolean).forEach((n) => bhk.add(Number(n)));
  f.bhk = [...bhk].filter((n) => n > 0 && n <= 10).sort();

  // ---- price
  const between = t.match(new RegExp(`between\\s+${NUM}\\s*(?:and|to|-)\\s*${NUM}`));
  if (between) {
    // "between 50 and 80 lakh" — the unit on the second number applies to both
    f.minPrice = toRupees(between[1], between[2] || between[4]);
    f.maxPrice = toRupees(between[3], between[4]);
  } else {
    const under = t.match(new RegExp(`(?:under|below|less than|max|maximum|upto|up to|within|budget of|budget)\\s+(?:rs\\.?|inr|₹)?\\s*${NUM}`));
    if (under) f.maxPrice = toRupees(under[1], under[2]);
    const over = t.match(new RegExp(`(?:above|over|more than|min|minimum|starting (?:from|at)|at least)\\s+(?:rs\\.?|inr|₹)?\\s*${NUM}`));
    if (over) f.minPrice = toRupees(over[1], over[2]);
  }

  // ---- area: "above 1200 sqft", "min 1500 sq ft"
  const area = t.match(/(\d{3,6})\s*(?:sq\.?\s*ft|sqft|square feet)/);
  if (area) f.minArea = Number(area[1]);

  // ---- city / locality, matched against what we actually have
  const norm = (s) => String(s).toLowerCase().trim();
  const cityHit = cities.find((c) => t.includes(` ${norm(c)} `) || t.includes(` ${norm(c)},`));
  if (cityHit) f.city = cityHit;
  const locHit = localities
    .filter((l) => norm(l).length > 3)
    .sort((a, b) => b.length - a.length)          // prefer the longest match
    .find((l) => t.includes(norm(l)));
  if (locHit) f.locality = locHit;

  // ---- furnishing / possession
  if (/\bfully[- ]?furnished\b/.test(t)) f.furnishing = 'fully-furnished';
  else if (/\bsemi[- ]?furnished\b/.test(t)) f.furnishing = 'semi-furnished';
  else if (/\bunfurnished\b|\bno furniture\b/.test(t)) f.furnishing = 'unfurnished';

  if (/\bready to move\b|\bready-to-move\b|\bimmediate\b|\bmove in\b/.test(t)) f.possession = 'ready-to-move';
  else if (/\bunder construction\b|\bupcoming\b|\bpre[- ]?launch\b/.test(t)) f.possession = 'under-construction';

  // ---- amenities
  const amenityWords = [
    [/\b(parking|car park)\b/, 'Covered Parking'],
    [/\b(gym|fitness)\b/, 'Gym'],
    [/\b(pool|swimming)\b/, 'Swimming Pool'],
    [/\blift\b|\belevator\b/, 'Lift'],
    [/\bsecurity\b|\bgated\b/, 'Security'],
    [/\bcctv\b/, 'CCTV'],
    [/\bclub ?house\b/, 'Clubhouse'],
    [/\bplay ?area\b|\bkids?\b|\bchildren\b/, "Children's Play Area"],
    [/\bpark\b|\bgarden\b/, 'Park'],
    [/\bpower ?backup\b|\bgenerator\b/, 'Power Backup'],
    [/\bwi-?fi\b|\binternet\b/, 'Wi-Fi'],
    [/\bservant\b|\bmaid'?s? room\b/, 'Servant Room'],
  ];
  amenityWords.forEach(([re, val]) => { if (re.test(t) && !f.amenities.includes(val)) f.amenities.push(val); });

  // ---- flags
  if (/\b3d\b|\bvirtual tour\b|\bwalkthrough\b|\bwalk through\b/.test(t)) f.hasTour = true;
  if (/\bverified\b|\bdocument checked\b|\bgenuine\b/.test(t)) f.verifiedOnly = true;

  return f;
}

/* -------------------------------------------------- structured output */

const FILTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['purpose', 'property_type', 'city', 'locality', 'bhk', 'minPrice', 'maxPrice',
    'minArea', 'furnishing', 'possession', 'amenities', 'hasTour', 'verifiedOnly',
    'keywords', 'interpretation'],
  properties: {
    purpose: { anyOf: [{ type: 'string', enum: PURPOSES }, { type: 'null' }] },
    property_type: { type: 'array', items: { type: 'string', enum: TYPES } },
    city: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    locality: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    bhk: { type: 'array', items: { type: 'integer' } },
    minPrice: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    maxPrice: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    minArea: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
    furnishing: { anyOf: [{ type: 'string', enum: FURNISHING }, { type: 'null' }] },
    possession: { anyOf: [{ type: 'string', enum: POSSESSION }, { type: 'null' }] },
    amenities: { type: 'array', items: { type: 'string', enum: AMENITIES } },
    hasTour: { type: 'boolean' },
    verifiedOnly: { type: 'boolean' },
    keywords: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    interpretation: { type: 'string' },
  },
};

const SYSTEM = `You convert a property seeker's plain-English request into search filters for RNI Realestate, an Indian property marketplace.

RULES
- All prices are Indian rupees as a plain integer. "80 lakh" = 8000000. "1.2 cr" = 12000000. "25k rent" = 25000.
- Rentals are priced per month; sale prices are the full amount.
- Only set a field the user actually implied. Leave it null / empty otherwise — do not guess a city or a budget that was never mentioned.
- "cheap" or "affordable" is NOT a number. Leave the price null and mention in the interpretation that you sorted by lowest price instead.
- Use "city" only for a city, and "locality" for an area, suburb or neighbourhood within one.
- "keywords" is for anything meaningful you could not express as a filter (a landmark, a builder name, "sea view"). Otherwise null.
- "interpretation" is ONE short sentence, addressed to the user, saying what you searched for. Plain text, no markdown. Example: "Showing 3 BHK apartments in Adyar under ₹2 crore with covered parking."

Only these amenity values are valid: ${AMENITIES.join(', ')}.`;

/**
 * @returns {{filters: object, interpretation: string, source: 'ai'|'rules'}}
 */
async function parseQuery(text, { cities = [], localities = [] } = {}) {
  const fallback = () => {
    const filters = ruleParse(text, cities, localities);
    return { filters, interpretation: describe(filters), source: 'rules' };
  };

  const anthropic = getClient();
  if (!anthropic) return fallback();

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: FILTER_SCHEMA },
      },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Cities with listings: ${cities.join(', ') || 'unknown'}.
Localities with listings: ${localities.slice(0, 40).join(', ') || 'unknown'}.

Request: ${text}`,
      }],
    });

    if (response.stop_reason === 'refusal') return fallback();

    const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const parsed = JSON.parse(raw);
    const { interpretation, ...rest } = parsed;

    // Never trust the model's shape blindly — merge onto the blank template.
    const filters = { ...blank(), ...rest };
    filters.bhk = (filters.bhk || []).filter((n) => Number.isInteger(n) && n > 0 && n <= 10);
    filters.property_type = (filters.property_type || []).filter((t) => TYPES.includes(t));
    filters.amenities = (filters.amenities || []).filter((a) => AMENITIES.includes(a));

    return { filters, interpretation: interpretation || describe(filters), source: 'ai' };
  } catch (e) {
    console.error('[searchBot] falling back to rules:', e.message);
    return fallback();
  }
}

/* -------------------------------------------------------- describe */

const money = (n) => {
  const v = Number(n);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, '')} Lac`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
};

const TYPE_LABEL = {
  apartment: 'apartments', villa: 'villas', 'independent-house': 'independent houses',
  plot: 'plots', office: 'office spaces', shop: 'shops', warehouse: 'warehouses',
  farmhouse: 'farm houses',
};
const PURPOSE_LABEL = { sale: 'for sale', rent: 'for rent', pg: 'PG accommodation', lease: 'for lease' };

/** Human sentence for the rule parser (the model writes its own). */
function describe(f) {
  const bits = [];
  if (f.bhk.length) bits.push(`${f.bhk.join(' & ')} BHK`);
  bits.push(f.property_type.length ? f.property_type.map((t) => TYPE_LABEL[t]).join(' / ') : 'properties');
  if (f.purpose) bits.push(PURPOSE_LABEL[f.purpose]);
  if (f.locality) bits.push(`in ${f.locality}`);
  if (f.city) bits.push(f.locality ? `, ${f.city}` : `in ${f.city}`);
  if (f.minPrice && f.maxPrice) bits.push(`between ${money(f.minPrice)} and ${money(f.maxPrice)}`);
  else if (f.maxPrice) bits.push(`under ${money(f.maxPrice)}`);
  else if (f.minPrice) bits.push(`above ${money(f.minPrice)}`);
  if (f.minArea) bits.push(`over ${f.minArea} sqft`);
  if (f.furnishing) bits.push(f.furnishing.replace('-', ' '));
  if (f.possession === 'ready-to-move') bits.push('ready to move');
  if (f.possession === 'under-construction') bits.push('under construction');
  if (f.amenities.length) bits.push(`with ${f.amenities.join(', ').toLowerCase()}`);
  if (f.hasTour) bits.push('that have a 3D tour');
  if (f.verifiedOnly) bits.push('verified only');

  const sentence = bits.join(' ').replace(' ,', ',');
  return `Showing ${sentence}.`;
}

/** Filter object → the query-string the listing page understands. */
function toQueryParams(f) {
  const p = {};
  if (f.purpose) p.purpose = f.purpose;
  if (f.property_type?.length) p.type = f.property_type.join(',');
  if (f.city) p.city = f.city;
  if (f.locality) p.locality = f.locality;
  if (f.bhk?.length) p.bhk = f.bhk.join(',');
  if (f.minPrice) p.minPrice = f.minPrice;
  if (f.maxPrice) p.maxPrice = f.maxPrice;
  if (f.minArea) p.minArea = f.minArea;
  if (f.furnishing) p.furnishing = f.furnishing;
  if (f.possession) p.possession = f.possession;
  if (f.amenities?.length) p.amenities = f.amenities.join(',');
  if (f.hasTour) p.hasTour = 'true';
  if (f.verifiedOnly) p.verified = 'true';
  if (f.keywords) p.q = f.keywords;
  return p;
}

/** True when nothing at all was understood — the UI shows a hint instead. */
const isEmpty = (f) => !f.purpose && !f.city && !f.locality && !f.bhk.length
  && !f.property_type.length && !f.minPrice && !f.maxPrice && !f.minArea
  && !f.furnishing && !f.possession && !f.amenities.length && !f.hasTour
  && !f.verifiedOnly && !f.keywords;

const EXAMPLES = [
  '3 BHK apartment in Adyar under 2.5 crore',
  'Flat for rent in OMR below 30k with parking',
  'Ready to move villa in Chennai with swimming pool',
  'Plots in Coimbatore between 30 and 80 lakh',
];

module.exports = { parseQuery, ruleParse, toQueryParams, describe, isEmpty, hasKey, EXAMPLES };
