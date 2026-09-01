const mongoose = require('mongoose');
const Property = require('../models/Property');
const User = require('../models/User');
const Project = require('../models/Project');
const ServiceOffering = require('../models/ServiceOffering');
const Favorite = require('../models/Favorite');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const Outbox = require('../models/Outbox');
const SavedSearch = require('../models/SavedSearch');
const PriceHistory = require('../models/PriceHistory');

const money = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, '')} Lac`;
  return `₹${v.toLocaleString('en-IN')}`;
};

const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER);
const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

async function notify({ user_id, kind, title, body = null, link = null, property_id = null }) {
  await Notification.create({
    user: user_id,
    kind,
    title,
    body,
    link,
    property: property_id,
  });
}

async function queueMessage({ channel, to, subject = null, body, template = null,
  lead_id = null, property_id = null, created_by = null }) {
  const r = await Outbox.create({
    channel,
    toAddress: to,
    subject,
    body,
    template,
    lead: lead_id,
    property: property_id,
    createdBy: created_by,
  });
  return r._id;
}

function whatsappLink(phone, body) {
  const digits = String(phone).replace(/\D/g, '');
  const withCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCode}?text=${encodeURIComponent(body)}`;
}

async function flushOutbox(limit = 50) {
  const rows = await Outbox.find({ status: 'queued' }).sort({ _id: 1 }).limit(Number(limit)).lean();
  const summary = { sent: 0, skipped: 0, failed: 0 };

  for (const row of rows) {
    try {
      if (row.channel === 'email') {
        if (!smtpConfigured()) {
          await Outbox.findByIdAndUpdate(row._id, { status: 'skipped', error: 'SMTP not configured (set SMTP_HOST / SMTP_USER / SMTP_PASS)' });
          summary.skipped++; continue;
        }
        await sendEmail(row);
        await Outbox.findByIdAndUpdate(row._id, { status: 'sent', sentAt: new Date() });
        summary.sent++;
      } else {
        if (!whatsappConfigured()) {
          await Outbox.findByIdAndUpdate(row._id, { status: 'skipped', error: 'WhatsApp Business API not configured — use the wa.me link instead' });
          summary.skipped++; continue;
        }
        await sendWhatsApp(row);
        await Outbox.findByIdAndUpdate(row._id, { status: 'sent', sentAt: new Date() });
        summary.sent++;
      }
    } catch (e) {
      await Outbox.findByIdAndUpdate(row._id, { status: 'failed', error: String(e.message).slice(0, 290) });
      summary.failed++;
    }
  }
  return summary;
}

async function sendEmail(row) {
  let nodemailer;
  try { nodemailer = require('nodemailer'); }
  catch { throw new Error('nodemailer not installed — run: npm i nodemailer'); }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: row.toAddress,
    subject: row.subject || 'RNI Realestate',
    text: row.body,
  });
}

async function sendWhatsApp(row) {
  const digits = String(row.toAddress).replace(/\D/g, '');
  const to = digits.length === 10 ? `91${digits}` : digits;
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: row.body },
      }),
    }
  );
  if (!res.ok) throw new Error(`WhatsApp API ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

const FOLLOWUP_AFTER_DAYS = 3;
const MAX_FOLLOWUPS = 3;

function followupText(lead) {
  const what = lead.property_title ? `"${lead.property_title}"` : 'the property you enquired about';
  const n = lead.followupCount || 0;
  if (n === 0) {
    return `Hi ${lead.name}, this is ${lead.agent_name || 'RNI Realestate'} following up on ${what}. `
      + `Are you still looking? Happy to arrange a site visit or share similar options.`;
  }
  if (n === 1) {
    return `Hi ${lead.name}, checking in once more about ${what}. `
      + `If the budget or location has changed, tell me and I'll send fresh matches.`;
  }
  return `Hi ${lead.name}, last check from my side on ${what}. `
    + `Reply anytime if you'd like to restart the search — otherwise I won't keep messaging.`;
}

async function runFollowupBot({ dryRun = false } = {}) {
  const cutoff = new Date(Date.now() - FOLLOWUP_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const rows = await Lead.find({
    status: { $in: ['new', 'contacted'] },
    followupCount: { $lt: MAX_FOLLOWUPS },
    $or: [
      { lastFollowupAt: { $lt: cutoff } },
      { lastFollowupAt: null, createdAt: { $lt: cutoff } },
    ],
  })
    .populate('property', 'title slug')
    .populate('receiver', 'name id')
    .sort({ temperature: -1, score: -1 })
    .limit(100)
    .lean();

  const drafted = [];
  for (const lead of rows) {
    const body = followupText(lead);
    drafted.push({ lead_id: lead._id, name: lead.name, phone: lead.phone, body });
    if (dryRun) continue;

    await queueMessage({
      channel: 'whatsapp', to: lead.phone, body, template: 'followup',
      lead_id: lead._id, property_id: lead.property, created_by: lead.receiver?._id || lead.receiver,
    });
    if (lead.email) {
      await queueMessage({
        channel: 'email', to: lead.email, subject: 'Still looking for a property?',
        body, template: 'followup', lead_id: lead._id, property_id: lead.property,
        created_by: lead.receiver?._id || lead.receiver,
      });
    }
    await notify({
      user_id: lead.receiver?._id || lead.receiver, kind: 'followup',
      title: `Follow-up due: ${lead.name}`,
      body: `${lead.temperature?.toUpperCase() || 'COLD'} lead, no contact for ${FOLLOWUP_AFTER_DAYS}+ days.`,
      link: '/dashboard/leads', property_id: lead.property,
    });
    await Lead.findByIdAndUpdate(lead._id, { $inc: { followupCount: 1 }, lastFollowupAt: new Date() });
  }
  return { due: rows.length, drafted };
}

async function runPriceAlertBot({ dryRun = false } = {}) {
  const drops = await PriceHistory.aggregate([
    { $sort: { property: 1, createdAt: -1 } },
    {
      $group: {
        _id: '$property',
        latest: { $first: '$$ROOT' },
        prev: { $first: { $arrayElemAt: ['$$ROOT', 1] } },
      },
    },
    {
      $lookup: {
        from: 'properties',
        localField: '_id',
        foreignField: '_id',
        as: 'prop',
      },
    },
    { $unwind: '$prop' },
    {
      $match: {
        'prop.status': 'active',
        'latest.alerted': false,
        $expr: { $lt: ['$latest.price', '$prev.price'] },
      },
    },
    {
      $project: {
        id: '$_id',
        title: '$prop.title',
        slug: '$prop.slug',
        history_id: '$latest._id',
        new_price: '$latest.price',
        old_price: '$prev.price',
      },
    },
  ]);

  const alerts = [];
  for (const d of drops) {
    const saved = Number(d.old_price) - Number(d.new_price);
    const watchers = await Favorite.countDocuments({ property: d.id });

    alerts.push({
      property_id: d.id, title: d.title,
      from: d.old_price, to: d.new_price, saved, watchers,
    });
    if (dryRun) continue;

    const watcherDocs = await Favorite.find({ property: d.id }).select('user').lean();
    for (const w of watcherDocs) {
      await notify({
        user_id: w.user, kind: 'price-drop',
        title: `Price dropped ${money(saved)}`,
        body: `"${d.title}" is now ${money(d.new_price)}, down from ${money(d.old_price)}.`,
        link: `/property/${d.slug || d.id}`, property_id: d.id,
      });
    }
    await PriceHistory.findByIdAndUpdate(d.history_id, { alerted: true });
  }
  return { drops: drops.length, alerts };
}

async function runNewListingBot({ dryRun = false } = {}) {
  const searches = await SavedSearch.find({ alerts: true }).sort({ _id: 1 }).limit(200).lean();
  const { buildFilterFromParams } = require('./filterUtil');

  const hits = [];
  for (const s of searches) {
    const params = typeof s.params === 'string' ? JSON.parse(s.params) : s.params;
    const { filter } = buildFilterFromParams(params);
    filter.createdAt = { $gt: s.lastRunAt || s.createdAt };

    const rows = await Property.find(filter).populate('user', 'name').sort({ createdAt: -1 }).limit(10).lean();

    hits.push({ search: s.label, user_id: s.user, matches: rows.length });
    if (dryRun) continue;

    if (rows.length) {
      await notify({
        user_id: s.user, kind: 'new-listing',
        title: `${rows.length} new match${rows.length === 1 ? '' : 'es'} for "${s.label}"`,
        body: rows.slice(0, 3).map((r) => `${r.title} — ${money(r.price)}`).join(' · '),
        link: `/properties?${new URLSearchParams(params)}`,
        property_id: rows[0]._id,
      });
    }
    await SavedSearch.findByIdAndUpdate(s._id, { lastRunAt: new Date() });
  }
  return { searches: searches.length, hits };
}

module.exports = {
  notify, queueMessage, flushOutbox, whatsappLink,
  runFollowupBot, runPriceAlertBot, runNewListingBot,
  followupText, smtpConfigured, whatsappConfigured, money,
};
