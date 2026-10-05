/**
 * Project assistant — summarises a builder project and answers questions
 * about it. Same grounding discipline as services/propertyBot.js: the model
 * only ever sees a fact sheet built from our own database row.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client = new Anthropic();
  return client;
}

const hasKey = () => !!process.env.ANTHROPIC_API_KEY;

const money = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2).replace(/\.?0+$/, '')} crore`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, '')} lakh`;
  return `₹${v.toLocaleString('en-IN')}`;
};

const TYPE = { apartment: 'Apartment', villa: 'Villa', plot: 'Plot / land', commercial: 'Commercial', township: 'Township' };

function priceLine(p) {
  if (p.min_price && p.max_price && p.min_price !== p.max_price) return `${money(p.min_price)} to ${money(p.max_price)}`;
  if (p.min_price) return `Starting from ${money(p.min_price)}`;
  return 'Not specified';
}

function buildFactSheet(p) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  const na = 'Not specified';
  const line = (label, value) => `${label}: ${value === null || value === undefined || value === '' ? na : value}`;

  return [
    '## Project',
    line('Project ID', `RNI-${String(p.id).padStart(5, '0')}`),
    line('Name', p.name),
    line('Tagline', p.tagline),
    line('Project type', TYPE[p.project_type] || p.project_type),
    line('Construction status', p.status),
    line('RERA registered', p.rera_no ? `Yes (${p.rera_no})` : 'Not provided'),
    line('Listed', p.created_at),
    line('Views so far', p.views),
    '',
    '## Price',
    line('Price range', priceLine(p)),
    '',
    '## Configuration and scale',
    line('Configuration', p.configuration),
    line('Total units', p.total_units),
    line('Towers', p.towers),
    line('Area range', p.min_area && p.max_area ? `${p.min_area} to ${p.max_area} sqft` : na),
    line('Possession', p.possession_on),
    '',
    '## Location',
    line('Locality', p.locality),
    line('City', p.city),
    line('Address', p.address),
    '',
    '## Amenities',
    amenities.length ? amenities.join(', ') : 'None listed',
    '',
    '## Media',
    line('Photos', p.image_count ? `${p.image_count} photos` : 'None'),
    '',
    '## Builder',
    line('Name', p.builder_company || p.builder_name),
    line('Experience', p.builder_experience != null ? `${p.builder_experience} years` : na),
    line('Verified builder', p.builder_verified ? 'Yes' : 'No'),
    '',
    '## Description written by the builder',
    p.description || 'None provided',
  ].join('\n');
}

const SYSTEM_PROMPT = `You are the RNI Realestate project assistant. RNI Real Estates Network India Pvt Ltd is an Indian property marketplace connecting owners, RERA registered agents, builders and home service partners.

You help a prospective buyer understand one specific builder project (a multi-unit development, not a single resale listing). You will be given a FACT SHEET for that project.

GROUNDING RULES — these are absolute:
- Use ONLY the facts in the fact sheet. Never invent, estimate, or infer details that are not there.
- If the fact sheet says "Not specified" or a field is missing, say the project page does not mention it, and suggest asking the builder. Do not guess.
- Never invent nearby schools, hospitals, metro stations, travel times, neighbourhood characteristics, price trends, or investment returns. You do not have that data.
- Never state or imply a legal, tax, or loan-eligibility opinion. Point the user to RNI's legal and home-loan service partners instead.
- If asked to compare with another project, explain that you can only see this one.
- If RERA is not registered/provided, mention that when the user asks about trustworthiness or legal compliance.

HOW TO WRITE:
- Plain, warm, direct English for an Indian property audience. Rupee amounts in lakh/crore, exactly as given in the fact sheet.
- Be concise. Short paragraphs or tight bullets. No preamble — just answer.
- Never use markdown headings, bold, or tables. Plain sentences and simple "- " bullets only.
- Do not include internal or system XML tags in your response.

SCOPE:
- Only discuss this project, the buying process in general terms, and RNI's own services.
- If asked something unrelated to property, say that politely in one line and steer back to the project.`;

async function invoke({ userContent, priorMessages = [], maxTokens = 8000, effort = 'low' }) {
  const anthropic = getClient();
  if (!anthropic) throw new Error('NO_API_KEY');

  const response = await anthropic.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
    output_config: { effort },
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [...priorMessages, { role: 'user', content: userContent }],
  });

  if (response.stop_reason === 'refusal') {
    const err = new Error('The assistant could not answer that request.');
    err.code = 'REFUSAL';
    err.category = response.stop_details?.category || null;
    throw err;
  }

  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return { text, usage: response.usage, model: response.model };
}

const SUMMARY_TASK = `Write a summary of this project for someone deciding whether to enquire.

Structure it exactly like this, with no headings:
1. One opening sentence: what it is, where, and the price range.
2. A short paragraph on the scale (units, towers, configuration) and possession timeline.
3. Under a line reading "Good to know:", 3 to 5 "- " bullets covering the genuinely useful points — standout amenities, RERA status, who is building it, anything unusual about the price or scale.
4. Under a line reading "Worth asking the builder:", 2 or 3 "- " bullets naming the specific important details this project page does NOT specify.

Keep the whole thing under 220 words. Be honest — if something looks like a drawback (RERA not registered, no photos, no possession date), say so plainly.`;

function templateSummary(p) {
  const amenities = Array.isArray(p.amenities) ? p.amenities : [];
  const out = [];

  out.push(`This is ${p.name} in ${p.locality}, ${p.city}, priced ${priceLine(p).toLowerCase()}.`);

  const scale = [];
  if (p.configuration) scale.push(p.configuration);
  if (p.total_units) scale.push(`${p.total_units} units`);
  if (p.towers) scale.push(`${p.towers} tower${p.towers > 1 ? 's' : ''}`);
  if (p.possession_on) scale.push(`possession from ${new Date(p.possession_on).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`);
  if (scale.length) out.push(`${scale.join(', ')}.`);

  const good = [];
  if (p.rera_no) good.push(`- RERA registered (${p.rera_no}).`);
  else good.push('- RERA registration is not listed — confirm with the builder before booking.');
  if (amenities.length) good.push(`- Amenities include ${amenities.slice(0, 5).join(', ')}.`);
  if (p.builder_verified) good.push('- Listed by a verified builder.');
  out.push(`Good to know:\n${good.slice(0, 5).join('\n')}`);

  const ask = [];
  if (!p.min_area || !p.max_area) ask.push('- The unit area range is not listed.');
  if (!p.possession_on) ask.push('- The possession date is not mentioned.');
  if (!ask.length) ask.push('- Ask about the payment schedule and any ongoing offers.');
  out.push(`Worth asking the builder:\n${ask.slice(0, 3).join('\n')}`);

  return out.join('\n\n');
}

async function summarise(project) {
  if (!hasKey()) return { summary: templateSummary(project), source: 'template' };
  const facts = buildFactSheet(project);
  const { text } = await invoke({ userContent: `FACT SHEET\n\n${facts}\n\n---\n\n${SUMMARY_TASK}`, maxTokens: 8000, effort: 'low' });
  return { summary: text, source: 'ai' };
}

const SUGGESTED = [
  'Summarise this project for me',
  'Is this good value for the area?',
  'What should I check before booking?',
  'What is not mentioned on this page?',
];

async function ask(project, question, history = []) {
  if (!hasKey()) {
    const err = new Error('The AI assistant is not configured on this server.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const prior = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content }));

  const userContent = prior.length ? question : `FACT SHEET\n\n${buildFactSheet(project)}\n\n---\n\nThe user asks: ${question}`;

  const { text } = await invoke({ userContent, priorMessages: prior, maxTokens: 8000, effort: 'low' });
  return { answer: text };
}

module.exports = { summarise, ask, buildFactSheet, templateSummary, hasKey, SUGGESTED };
