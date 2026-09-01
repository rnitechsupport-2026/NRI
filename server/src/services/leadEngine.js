const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Lead = require('../models/Lead');
const SiteVisit = require('../models/SiteVisit');

const TIMELINE_POINTS = {
  immediate: 30,
  '1-3-months': 20,
  '3-6-months': 8,
  'just-looking': 0,
};
const FINANCE_POINTS = { self: 12, loan: 8, 'not-sure': 2 };

function scoreLead(lead, { property = null, priorEnquiries = 0, hasVisit = false } = {}) {
  let score = 0;
  const reasons = [];
  const add = (points, why) => { score += points; reasons.push(`${points >= 0 ? '+' : ''}${points} ${why}`); };

  if (lead.timeline) {
    const p = TIMELINE_POINTS[lead.timeline] ?? 0;
    if (p) add(p, `timeline: ${lead.timeline.replace(/-/g, ' ')}`);
    else reasons.push('+0 just looking');
  }
  if (lead.finance) add(FINANCE_POINTS[lead.finance] ?? 0, `finance: ${lead.finance}`);
  if (hasVisit) add(25, 'site visit booked');

  if (lead.budgetMax && property?.price) {
    const ratio = Number(lead.budgetMax) / Number(property.price);
    if (ratio >= 0.95) add(20, 'budget covers the asking price');
    else if (ratio >= 0.8) add(12, 'budget within 20% of asking');
    else add(-5, 'budget well below asking price');
  } else if (lead.budgetMax) {
    add(8, 'shared a budget');
  }

  if (priorEnquiries >= 2) add(12, `${priorEnquiries} earlier enquiries`);
  else if (priorEnquiries === 1) add(6, 'enquired before');
  if (lead.sender) add(8, 'registered account');
  if (lead.email) add(4, 'gave an email');
  if (lead.message && String(lead.message).trim().length > 40) add(6, 'wrote a detailed message');

  score = Math.max(0, Math.min(100, Math.round(score)));
  const temperature = score >= 60 ? 'hot' : score >= 30 ? 'warm' : 'cold';
  return { score, temperature, reasons };
}

async function assignLead(lead, { property = null } = {}) {
  const receiver = await User.findById(lead.receiver).select('role city').lean();

  if (receiver && ['agent', 'builder', 'owner'].includes(receiver.role)) {
    return {
      assigned_to: receiver._id,
      reason: receiver.role === 'owner'
        ? 'Owner-listed — the owner keeps their own lead'
        : `Advertiser is the ${receiver.role}`,
    };
  }

  const city = property?.city || lead.prefCity || receiver?.city;
  if (!city) return { assigned_to: null, reason: 'No city to route on' };

  const openCounts = await Lead.aggregate([
    { $match: { assignedTo: { $ne: null }, status: { $in: ['new', 'contacted', 'visit-scheduled'] } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(openCounts.map((c) => [String(c._id), c.count]));

  const candidates = await User.find({ role: 'agent', status: 'active', city })
    .select('name isVerified')
    .limit(10)
    .lean();

  candidates.sort((a, b) => {
    if (a.isVerified !== b.isVerified) return b.isVerified ? 1 : -1;
    return (countMap[a._id] || 0) - (countMap[b._id] || 0);
  });

  if (!candidates.length) return { assigned_to: null, reason: `No agent covers ${city}` };
  const a = candidates[0];
  return {
    assigned_to: a._id,
    reason: `${a.name} — ${city} specialist, ${countMap[a._id] || 0} open lead${(countMap[a._id] || 0) === 1 ? '' : 's'}`,
  };
}

async function processLead(leadId) {
  const lead = await Lead.findById(leadId).lean();
  if (!lead) return null;

  const property = lead.property
    ? await Property.findById(lead.property).select('price city locality').lean()
    : null;

  const priorEnquiries = await Lead.countDocuments({ phone: lead.phone, _id: { $ne: lead._id } });
  const visits = await SiteVisit.countDocuments({ phone: lead.phone });

  const { score, temperature, reasons } = scoreLead(lead, {
    property, priorEnquiries: Number(priorEnquiries), hasVisit: Number(visits) > 0,
  });

  let assigned_to = lead.assignedTo;
  let assign_reason = lead.assignReason;
  if (!assigned_to) {
    const a = await assignLead(lead, { property });
    assigned_to = a.assigned_to;
    assign_reason = a.reason;
  }

  await Lead.findByIdAndUpdate(leadId, {
    score, temperature, scoreReasons: reasons, assignedTo: assigned_to, assignReason: assign_reason,
  });

  return { score, temperature, reasons, assigned_to, assign_reason };
}

module.exports = { scoreLead, assignLead, processLead };
