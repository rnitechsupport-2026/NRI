require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connect } = require('../config/db');

async function initializeDatabase() {
  await connect();
  console.log(`→ connected to MongoDB`);

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('→ schema.sql noted (MongoDB creates collections automatically)');
  console.log('✔ init complete');
}

initializeDatabase()
  .catch((e) => { console.error('✖ init failed:', e.message); process.exitCode = 1; });

module.exports = { initializeDatabase };
