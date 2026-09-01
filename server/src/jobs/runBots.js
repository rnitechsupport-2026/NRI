require('dotenv').config();
const { connect } = require('../config/db');
const notify = require('../services/notify');

const dryRun = process.argv.includes('--dry');

(async () => {
  const started = Date.now();
  console.log(`\n▶ bots ${dryRun ? '(dry run)' : ''} — ${new Date().toISOString()}\n`);

  try {
    await connect();

    const followup = await notify.runFollowupBot({ dryRun });
    console.log(`  follow-up    : ${followup.due} lead(s) due`);
    followup.drafted.slice(0, 5).forEach((d) => console.log(`                 → ${d.name} (${d.phone})`));

    const price = await notify.runPriceAlertBot({ dryRun });
    console.log(`  price alert  : ${price.drops} price drop(s)`);
    price.alerts.forEach((a) => console.log(`                 → ${a.title}: ${notify.money(a.from)} → ${notify.money(a.to)} (${a.watchers} watching)`));

    const listing = await notify.runNewListingBot({ dryRun });
    console.log(`  new listing  : ${listing.searches} saved search(es) checked`);
    listing.hits.filter((h) => h.matches).forEach((h) => console.log(`                 → "${h.search}": ${h.matches} new`));

    if (!dryRun) {
      const out = await notify.flushOutbox(200);
      console.log(`  delivery     : ${out.sent} sent, ${out.skipped} skipped, ${out.failed} failed`);
      if (out.skipped && !notify.smtpConfigured()) {
        console.log('                 (email skipped — set SMTP_HOST / SMTP_USER / SMTP_PASS)');
      }
      if (out.skipped && !notify.whatsappConfigured()) {
        console.log('                 (whatsapp skipped — set WHATSAPP_TOKEN / WHATSAPP_PHONE_ID)');
      }
    }

    console.log(`\n✔ done in ${Date.now() - started}ms\n`);
  } catch (e) {
    console.error('✖ bot run failed:', e.message);
    process.exitCode = 1;
  }
})();
