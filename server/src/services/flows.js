/**
 * Conversational flow definitions.
 *
 * Four of the "bots" — lead qualification, site visit, post-visit feedback and
 * the document checklist — are the same thing: ask a short series of questions,
 * one at a time, then write a row. So they share one engine and differ only by
 * script. The client renders the steps as a chat; the server validates and
 * persists the finished answer set.
 *
 * Steps are sent to the client so the wording lives in one place.
 */

const CITIES = ['Chennai', 'Bengaluru', 'Coimbatore', 'Hyderabad', 'Madurai', 'Trichy', 'Salem'];

/** Next 14 days, excluding today if it's already late. */
function visitDates() {
  const out = [];
  const now = new Date();
  const start = now.getHours() >= 18 ? 1 : 0;
  for (let i = start; i < start + 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

const FLOWS = {
  /* ------------------------------------------------ lead qualification */
  qualify: {
    title: 'Tell us what you need',
    intro: "A few quick questions so the right person calls you with the right options. Takes about 30 seconds.",
    submitLabel: 'Send my requirement',
    steps: [
      {
        key: 'pref_purpose', type: 'choice', question: 'What are you looking to do?',
        options: [
          { value: 'sale', label: 'Buy a property' },
          { value: 'rent', label: 'Rent a home' },
          { value: 'pg', label: 'Find a PG' },
          { value: 'lease', label: 'Lease commercial space' },
        ],
      },
      {
        key: 'pref_bhk', type: 'choice', question: 'How many bedrooms?',
        skipIf: { key: 'pref_purpose', in: ['lease'] },
        options: [
          { value: '1', label: '1 BHK' }, { value: '2', label: '2 BHK' },
          { value: '3', label: '3 BHK' }, { value: '4', label: '4 BHK' },
          { value: '5', label: '5+ BHK' }, { value: '', label: 'Not sure yet' },
        ],
      },
      {
        key: 'pref_city', type: 'choice', question: 'Which city?',
        options: CITIES.map((c) => ({ value: c, label: c })),
      },
      {
        key: 'pref_locality', type: 'text', question: 'Any preferred area or locality?',
        placeholder: 'e.g. Adyar, OMR — or leave blank',
        optional: true,
      },
      {
        key: 'budget', type: 'budget', question: 'What budget are you working with?',
        help: 'Rough range is fine — it just helps us filter.',
      },
      {
        key: 'timeline', type: 'choice', question: 'When are you hoping to move or close?',
        options: [
          { value: 'immediate', label: 'Immediately' },
          { value: '1-3-months', label: 'In 1–3 months' },
          { value: '3-6-months', label: 'In 3–6 months' },
          { value: 'just-looking', label: 'Just exploring' },
        ],
      },
      {
        key: 'finance', type: 'choice', question: 'How are you planning to fund it?',
        skipIf: { key: 'pref_purpose', in: ['rent', 'pg'] },
        options: [
          { value: 'loan', label: 'Home loan' },
          { value: 'self', label: 'Own funds' },
          { value: 'not-sure', label: 'Not decided' },
        ],
      },
      { key: 'name', type: 'text', question: 'Your name?', placeholder: 'Full name' },
      { key: 'phone', type: 'phone', question: 'Best number to reach you?', placeholder: '10 digit mobile' },
      { key: 'email', type: 'email', question: 'Email (optional)', placeholder: 'you@example.com', optional: true },
    ],
  },

  /* -------------------------------------------------------- site visit */
  visit: {
    title: 'Book a site visit',
    intro: 'Pick a day and slot that suits you. The advertiser confirms within a few hours.',
    submitLabel: 'Request visit',
    steps: [
      { key: 'visit_on', type: 'choice', question: 'Which day works for you?', options: visitDates },
      {
        key: 'slot', type: 'choice', question: 'What time of day?',
        options: [
          { value: 'morning', label: 'Morning (9 AM – 12 PM)' },
          { value: 'afternoon', label: 'Afternoon (12 – 4 PM)' },
          { value: 'evening', label: 'Evening (4 – 7 PM)' },
        ],
      },
      { key: 'name', type: 'text', question: 'Your name?', placeholder: 'Full name' },
      { key: 'phone', type: 'phone', question: 'Mobile number?', placeholder: '10 digit mobile' },
      {
        key: 'notes', type: 'text', question: 'Anything the advertiser should know?',
        placeholder: 'e.g. bringing family, need parking details', optional: true,
      },
    ],
  },

  /* ---------------------------------------------------------- feedback */
  feedback: {
    title: 'How was the visit?',
    intro: 'Thirty seconds of feedback helps us send you better matches.',
    submitLabel: 'Submit feedback',
    steps: [
      {
        key: 'rating', type: 'choice', question: 'How would you rate the property?',
        options: [
          { value: '5', label: '★★★★★ Excellent' }, { value: '4', label: '★★★★ Good' },
          { value: '3', label: '★★★ Average' }, { value: '2', label: '★★ Poor' },
          { value: '1', label: '★ Very poor' },
        ],
      },
      {
        key: 'interested', type: 'choice', question: 'Are you still interested?',
        options: [
          { value: 'yes', label: 'Yes, want to proceed' },
          { value: 'maybe', label: 'Maybe — still comparing' },
          { value: 'no', label: 'No, not for me' },
        ],
      },
      { key: 'liked', type: 'text', question: 'What worked for you?', placeholder: 'Location, layout, price…', optional: true },
      { key: 'concerns', type: 'text', question: 'Any concerns?', placeholder: "What didn't work", optional: true },
    ],
  },
};

/* ------------------------------------------------------------ documents */

/** Which papers matter depends on what the person is doing. */
const DOC_SETS = {
  sale: [
    ['pan', 'PAN card', 'Mandatory for any registered sale'],
    ['aadhaar', 'Aadhaar / address proof', 'Identity and address verification'],
    ['income', 'Income proof (3 months payslips or ITR)', 'Needed if you are taking a home loan'],
    ['bank', 'Bank statement (6 months)', 'Loan eligibility assessment'],
    ['photo', 'Passport size photographs', 'For the sale deed and registration'],
    ['booking', 'Booking amount receipt', 'Issued once you pay the token amount'],
  ],
  rent: [
    ['pan', 'PAN card', 'Standard KYC'],
    ['aadhaar', 'Aadhaar / address proof', 'Identity verification'],
    ['employment', 'Employment letter or offer letter', 'Most landlords ask for this'],
    ['payslip', 'Last 3 payslips', 'Proof of ability to pay rent'],
    ['photo', 'Passport size photographs', 'For the rental agreement'],
  ],
  pg: [
    ['aadhaar', 'Aadhaar / address proof', 'Identity verification'],
    ['photo', 'Passport size photographs', 'For the register'],
    ['employment', 'College ID or employment letter', 'Confirms student or working status'],
  ],
};
DOC_SETS.lease = DOC_SETS.sale;

/** Documents the seller/advertiser should be able to show a buyer. */
const SELLER_DOCS = [
  ['title', 'Mother deed / title document', 'Traces ownership — insist on seeing this'],
  ['ec', 'Encumbrance Certificate (13–30 years)', 'Shows the property has no loans against it'],
  ['tax', 'Latest property tax receipt', 'Confirms dues are cleared'],
  ['approval', 'Approved building plan', 'Confirms construction is legal'],
  ['oc', 'Occupancy / completion certificate', 'Required for ready apartments'],
  ['noc', 'Society / association NOC', 'Confirms no pending maintenance dues'],
];

const docChecklist = (purpose = 'sale') => ({
  buyer: (DOC_SETS[purpose] || DOC_SETS.sale).map(([key, label, why]) => ({ key, label, why })),
  seller: SELLER_DOCS.map(([key, label, why]) => ({ key, label, why })),
});

/** Resolve any function-valued option lists before sending to the client. */
function getFlow(name) {
  const flow = FLOWS[name];
  if (!flow) return null;
  return {
    ...flow,
    steps: flow.steps.map((s) => ({
      ...s,
      options: typeof s.options === 'function' ? s.options() : s.options,
    })),
  };
}

module.exports = { getFlow, docChecklist, FLOWS, CITIES };
