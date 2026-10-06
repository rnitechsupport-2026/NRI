const Lead = require('../models/Lead');

/** Appends one timestamped activity-log entry to a lead, bumping its
 *  follow-up counters, and optionally updates temperature in the same
 *  write. Shared by lead.routes.js (self-service CRM) and admin.routes.js
 *  (admin/employee CRM) so both surfaces render identical history. */
async function addNote(leadId, { authorId, text, temperature, statusAfter }) {
  const update = {
    $push: {
      notes: {
        text,
        author: authorId,
        temperature: temperature || undefined,
        statusAfter: statusAfter || undefined,
        createdAt: new Date(),
      },
    },
    $inc: { followupCount: 1 },
    $set: { lastFollowupAt: new Date() },
  };
  if (temperature) update.$set.temperature = temperature;

  const doc = await Lead.findByIdAndUpdate(leadId, update, { new: true }).select('notes').lean();
  return doc.notes[doc.notes.length - 1];
}

module.exports = { addNote };
