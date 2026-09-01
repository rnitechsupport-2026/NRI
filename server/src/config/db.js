const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realestate';

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
