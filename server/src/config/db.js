const dns = require('dns');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realestate';

// mongodb+srv:// needs a DNS SRV/TXT lookup before it can connect at all.
// On some Windows setups (VPNs, corporate networks) the OS resolver answers
// fine but Node's own resolver (c-ares) gets its raw query refused by the
// same network's assigned nameserver — surfaces as "querySrv ECONNREFUSED"
// even though the cluster and credentials are perfectly fine. Pointing
// Node's resolver at a public DNS server sidesteps that without touching
// the OS-level network config.
if (MONGODB_URI.startsWith('mongodb+srv://')) {
  try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch { /* best-effort */ }
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB || 'realestate',
      family: 4,
      serverSelectionTimeoutMS: 15000,
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

async function disconnect() {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

module.exports = { connect, disconnect, mongoose };
