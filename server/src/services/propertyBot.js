/**
 * Property assistant — summarises a listing and answers questions about it.
 *
 * Grounding rule: the model only ever sees a fact sheet built from our own
 * database row. It is told, explicitly, not to invent anything that isn't in
 * that sheet — so it can't hallucinate a swimming pool onto a plot of land.
 *
 * Works without an API key: `templateSummary()` produces a decent deterministic
 * summary from the same fact sheet, so the feature degrades instead of breaking.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';

// Claude Opus 5's safety classifiers can decline a request (HTTP 200 with
// stop_reason "refusal"). Server-side fallbacks re-serve it on another model in
// the same call, so a false positive on an ordinary listing doesn't break the UI.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

let client = null;
/** Lazily construct the client so the server boots fine without a key. */
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic();
  return client;
}

const hasKey = () => !!process.env.ANTHROPIC_API_KEY;

/* ------------------------------------------------------------ fact sheet */

const money = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2).replace(/\.?0+$/, '')} crore`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, '')} lakh`;
  return `₹${v.toLocaleString('en-IN')}`;
};

const TYPE = {
  apartment: 'Apartment', villa: 'Villa', 'independent-house': 'Independent house',
  plot: 'Plot / land', office: 'Office space', shop: 'Shop / showroom',
  warehouse: 'Warehouse', farmhouse: 'Farm house',
};
const PURPOSE = { sale: 'For sale', rent: 'For rent', pg: 'PG / co-living', lease: 'For lease' };
const ROLE = { owner: 'Owner (direct)', agent: 'Agent', builder: 'Builder', admin: 'Admin' };

const isRental = (p) => ['rent', 'pg', 'lease'].includes(p.purpose);

/**
 * Flatten a property row into a labelled fact sheet.
 * Anything missing is written as "Not specified" rather than omitted — that way
 * the model can see the difference between "no lift" and "we don't know".
 */
function buildFactSheet(p) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  const na = 'Not specified';
  const line = (label, value) => `${label}: ${value === null || value === undefined || value === '' ? na : value}`;

  const priceLine = isRental(p)
    ? `${money(p.price)} per month${p.maintenance ? ` + ${money(p.maintenance)} maintenance` : ''}`
    : `${money(p.price)}${p.price_negotiable ? ' (negotiable)' : ''}`;

  const perUnit = p.built_up_area
    ? `₹${Math.round(p.price / p.built_up_area).toLocaleString('en-IN')} per ${p.area_unit}`
    : na;

  return [
    '## Listing',
    line('Listing ID', `RNI-${String(p.id).padStart(5, '0')}`),
    line('Title', p.title),
    line('Purpose', PURPOSE[p.purpose] || p.purpose),
    line('Property type', TYPE[p.property_type] || p.property_type),
    line('Verified by RNI', p.is_verified ? 'Yes' : 'No — documents not yet checked'),
    line('Listed', p.created_at),
    line('Views so far', p.views),
    '',
    '## Price',
    line('Asking price', priceLine),
    line('Rate', isRental(p) ? na : perUnit),
    '',
    '## Size and layout',
    line('Bedrooms', p.bhk ? `${p.bhk} BHK` : na),
    line('Bathrooms', p.bathrooms),
    line('Balconies', p.balconies),
    line('Built-up area', p.built_up_area ? `${p.built_up_area} ${p.area_unit}` : na),
    line('Carpet area', p.carpet_area ? `${p.carpet_area} ${p.area_unit}` : na),
    line('Floor', p.floor_no ? `${p.floor_no} of ${p.total_floors || '?'}` : na),
    line('Facing', p.facing),
    line('Furnishing', p.furnishing),
    line('Age of property', p.age_years != null ? `${p.age_years} years` : na),
    line('Possession', p.possession),
    '',
    '## Location',
    line('Locality', p.locality),
    line('City', p.city),
    line('State', p.state),
    line('Pincode', p.pincode),
    line('Address', p.address),
    '',
    '## Amenities',
    amenities.length ? amenities.join(', ') : 'None listed',
    '',
    '## Media',
    line('Photos', p.image_count ? `${p.image_count} photos` : 'None'),
    line('3D walkthrough', p.tour_url ? `Yes (${p.tour_provider || 'virtual tour'})` : 'Not available'),
    line('Floor plan', p.floor_plan_url ? 'Available' : 'Not available'),
    '',
    '## Advertiser',
    line('Posted by', ROLE[p.owner_role] || p.owner_role),
    line('Name', p.owner_company || p.owner_name),
    line('RERA registered', p.owner_rera ? `Yes (${p.owner_rera})` : 'Not provided'),
    line('Experience', p.owner_experience != null ? `${p.owner_experience} years` : na),
    line('Verified advertiser', p.owner_verified ? 'Yes' : 'No'),
    '',
    '## Description written by the advertiser',
    p.description || 'None provided',
  ].join('\n');
}

/* --------------------------------------------------------- system prompt */

/**
 * Stable across every request and every property — so it sits at the front of
 * the prompt and gets a cache breakpoint. The per-property fact sheet is volatile
 * and goes into the user turn, after the cached prefix.
 */
const SYSTEM_PROMPT = `You are the RNI Realestate property assistant. RNI Real Estates Network India Pvt Ltd is an Indian property marketplace connecting owners, RERA registered agents, builders and home service partners.

You help a prospective buyer or tenant understand one specific property listing. You will be given a FACT SHEET for that listing.

GROUNDING RULES — these are absolute:
- Use ONLY the facts in the fact sheet. Never invent, estimate, or infer details that are not there.
- If the fact sheet says "Not specified" or a field is missing, say the listing does not mention it, and suggest asking the advertiser. Do not guess.
- Never invent nearby schools, hospitals, metro stations, travel times, neighbourhood characteristics, price trends, or investment returns. You do not have that data.
- Never state or imply a legal, tax, or loan-eligibility opinion. Point the user to RNI's legal and home-loan service partners instead.
- If asked to compare with another property, explain that you can only see this one listing.
- If "Verified by RNI" is No, mention that documents have not been checked yet when the user asks about trustworthiness.

HOW TO WRITE:
- Plain, warm, direct English for an Indian property audience. Rupee amounts in lakh/crore, exactly as given in the fact sheet.
- Be concise. Short paragraphs or tight bullets. No preamble like "Based on the fact sheet" — just answer.
- Never use markdown headings, bold, or tables. Plain sentences and simple "- " bullets only.
- Lead with the answer, then the supporting detail.
- Do not include internal or system XML tags in your response.

SCOPE:
- Only discuss this listing, the buying/renting process in general terms, and RNI's own services.
- If asked something unrelated to property, say that politely in one line and steer back to the listing.`;

/* ------------------------------------------------------- shared invoker */

/**
 * One place that talks to the API, so summary and chat share refusal handling,
 * caching, and fallback config.
 */
async function invoke({ userContent, priorMessages = [], maxTokens = 8000, effort = 'low' }) {
  const anthropic = getClient();
  if (!anthropic) throw new Error('NO_API_KEY');

  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    output_config: { effort },
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [...priorMessages, { role: 'user', content: userContent }],
  });

  if (response.stop_reason === 'refusal') {
    const err = new Error('The assistant could not answer that request.');
    err.code = 'REFUSAL';
    err.category = response.stop_details?.category || null;
    throw err;
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return { text, usage: response.usage, model: response.model };
}

/* ------------------------------------------------------------- summary */

const SUMMARY_TASK = `Write a summary of this listing for someone deciding whether to book a site visit.

Structure it exactly like this, with no headings:
1. One opening sentence: what it is, where, and the price.
2. A short paragraph on the layout and condition.
3. Under a line reading "Good to know:", 3 to 5 "- " bullets covering the genuinely useful points — standout amenities, verification status, whether a 3D tour exists, who is advertising it, anything unusual about the price or size.
4. Under a line reading "Worth asking the advertiser:", 2 or 3 "- " bullets naming the specific important details this listing does NOT specify.

Keep the whole thing under 220 words. Be honest — if something looks like a drawback (unverified, no photos, high maintenance, old property), say so plainly.`;

/** Deterministic summary used when no API key is configured. */
function templateSummary(p) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  const out = [];

  const what = p.bhk ? `${p.bhk} BHK ${(TYPE[p.property_type] || '').toLowerCase()}` : (TYPE[p.property_type] || 'property').toLowerCase();
  const price = isRental(p)
    ? `${money(p.price)} per month`
    : money(p.price);
  out.push(`This is a ${what} in ${p.locality}, ${p.city}, ${isRental(p) ? 'available at' : 'priced at'} ${price}${p.price_negotiable && !isRental(p) ? ' (negotiable)' : ''}.`);

  const layout = [];
  if (p.built_up_area) layout.push(`It measures ${Number(p.built_up_area).toLocaleString('en-IN')} ${p.area_unit} built-up`);
  if (p.bathrooms) layout.push(`${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}`);
  if (p.furnishing) layout.push(`${p.furnishing.replace('-', ' ')}`);
  if (p.floor_no) layout.push(`on floor ${p.floor_no}${p.total_floors ? ` of ${p.total_floors}` : ''}`);
  if (p.possession) layout.push(p.possession === 'ready-to-move' ? 'and is ready to move in' : 'and is still under construction');
  if (layout.length) out.push(`${layout.join(', ')}.`);

  const good = [];
  if (p.is_verified) good.push('- Documents have been verified by RNI.');
  else good.push('- Not yet document-verified — ask the advertiser for ownership papers.');
  if (p.tour_url) good.push('- A 3D walkthrough is available, so you can tour it before visiting.');
  if (amenities.length) good.push(`- Amenities include ${amenities.slice(0, 5).join(', ')}.`);
  if (p.built_up_area && !isRental(p)) {
    good.push(`- Works out to about ₹${Math.round(p.price / p.built_up_area).toLocaleString('en-IN')} per ${p.area_unit}.`);
  }
  if (p.owner_role === 'owner') good.push('- Listed directly by the owner, so there is no brokerage.');
  if (p.maintenance) good.push(`- Maintenance is ${money(p.maintenance)} per month on top of the rent.`);
  out.push(`Good to know:\n${good.slice(0, 5).join('\n')}`);

  const ask = [];
  if (!p.carpet_area) ask.push('- The carpet area is not listed.');
  if (p.age_years == null) ask.push('- The age of the property is not mentioned.');
  if (!p.facing) ask.push('- The facing direction is not mentioned.');
  if (!p.pincode) ask.push('- The exact address and pincode are not published.');
  if (!ask.length) ask.push('- Ask about the exact possession date and any pending dues.');
  out.push(`Worth asking the advertiser:\n${ask.slice(0, 3).join('\n')}`);

  return out.join('\n\n');
}

/** @returns {{summary: string, source: 'ai'|'template'}} */
async function summarise(property) {
  const facts = buildFactSheet(property);
  if (!hasKey()) return { summary: templateSummary(property), source: 'template' };

  const { text } = await invoke({
    userContent: `FACT SHEET\n\n${facts}\n\n---\n\n${SUMMARY_TASK}`,
    maxTokens: 8000,
    effort: 'low',
  });
  return { summary: text, source: 'ai' };
}

/* ---------------------------------------------------------------- chat */

const SUGGESTED = [
  'Summarise this property for me',
  'Is this good value for the area?',
  'What should I check before visiting?',
  'What is not mentioned in this listing?',
];

/**
 * Answer a follow-up question. `history` is the prior turns from the client —
 * we re-send the fact sheet on the first turn only, since it stays in history.
 */
async function ask(property, question, history = []) {
  if (!hasKey()) {
    const err = new Error('The AI assistant is not configured on this server.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const prior = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  const userContent = prior.length
    ? question
    : `FACT SHEET\n\n${buildFactSheet(property)}\n\n---\n\nThe user asks: ${question}`;

  const { text } = await invoke({
    userContent,
    priorMessages: prior,
    maxTokens: 8000,
    effort: 'low',
  });
  return { answer: text };
}

module.exports = { summarise, ask, buildFactSheet, templateSummary, hasKey, SUGGESTED };
