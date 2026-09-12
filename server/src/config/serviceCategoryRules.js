/**
 * The dynamic core of the Service Provider Verification framework: what a
 * given profession actually requires, looked up here rather than assumed by
 * shared code. Adding a category is a data change, not a logic change.
 *
 * qualificationRequirement:
 *   'required'       — submission/approval is blocked without a verified qualification track
 *   'optional'       — the provider may submit it; it never blocks submission or approval
 *   'not_applicable' — no statutory qualification exists for this category; never asked for
 */
const RULES = {
  architect: {
    label: 'Architect',
    qualificationRequirement: 'required',
    authority: 'Council of Architecture (CoA)',
    registrationLabel: 'CoA registration number',
    docTypes: ['degree_certificate', 'registration_certificate'],
    requiredDocTypes: ['registration_certificate'],
  },
  civil_engineer: {
    label: 'Civil / Structural Engineer',
    qualificationRequirement: 'optional',
    authority: "Local planning authority's approved-signatory panel (CMDA / DTCP)",
    registrationLabel: 'Empanelment / licensed-signatory number',
    docTypes: ['degree_certificate', 'registration_certificate'],
    requiredDocTypes: [],
  },
  contractor: {
    label: 'Contractor',
    qualificationRequirement: 'optional',
    authority: 'PWD / CPWD (government work only) or Labour Dept. (BOCW)',
    registrationLabel: 'Contractor class / licence number',
    docTypes: ['gst_certificate', 'license_certificate'],
    requiredDocTypes: [],
  },
  chartered_accountant: {
    label: 'Chartered Accountant',
    qualificationRequirement: 'required',
    authority: 'Institute of Chartered Accountants of India (ICAI)',
    registrationLabel: 'ICAI membership number',
    docTypes: ['membership_certificate', 'cop_certificate'],
    requiredDocTypes: ['membership_certificate'],
  },
  advocate: {
    label: 'Advocate / Legal Consultant',
    qualificationRequirement: 'required',
    authority: 'State Bar Council / Bar Council of India',
    registrationLabel: 'Bar Council enrollment number',
    docTypes: ['degree_certificate', 'registration_certificate'],
    requiredDocTypes: ['registration_certificate'],
  },
  surveyor: {
    label: 'Surveyor',
    qualificationRequirement: 'optional',
    authority: 'State Revenue Department / local planning authority',
    registrationLabel: 'Licensed surveyor number',
    docTypes: ['registration_certificate'],
    requiredDocTypes: [],
  },
  valuer: {
    label: 'Valuer',
    qualificationRequirement: 'required',
    authority: 'IBBI (Registered Valuer) or empanelling bank',
    registrationLabel: 'Registered Valuer number',
    docTypes: ['registration_certificate', 'license_certificate'],
    requiredDocTypes: ['registration_certificate'],
  },
  pmc: {
    label: 'Project Management Consultant',
    qualificationRequirement: 'not_applicable',
    authority: null,
    registrationLabel: null,
    docTypes: [],
    requiredDocTypes: [],
    note: 'No firm-level licence — verify each named signatory under their own category instead.',
  },
  interior_designer: {
    label: 'Interior Designer',
    qualificationRequirement: 'optional',
    authority: 'Institute of Indian Interior Designers (IIID) — voluntary',
    registrationLabel: 'IIID membership number',
    docTypes: ['membership_certificate'],
    requiredDocTypes: [],
  },
  property_management: {
    label: 'Property Management Company',
    qualificationRequirement: 'not_applicable',
    authority: null,
    registrationLabel: null,
    docTypes: [],
    requiredDocTypes: [],
    note: 'RERA agent registration applies only if this firm also brokers sale/purchase — reviewed manually, not automated.',
  },
  facility_management: {
    label: 'Facility Management Company',
    qualificationRequirement: 'not_applicable',
    authority: null,
    registrationLabel: null,
    docTypes: [],
    requiredDocTypes: [],
  },
  other: {
    label: 'Other',
    qualificationRequirement: 'optional',
    authority: null,
    registrationLabel: null,
    docTypes: ['registration_certificate', 'license_certificate', 'membership_certificate', 'other'],
    requiredDocTypes: [],
  },
};

const CATEGORY_KEYS = Object.keys(RULES);

function getRule(category) {
  return RULES[category] || null;
}

function qualificationRequired(category) {
  return getRule(category)?.qualificationRequirement === 'required';
}

module.exports = { RULES, CATEGORY_KEYS, getRule, qualificationRequired };
