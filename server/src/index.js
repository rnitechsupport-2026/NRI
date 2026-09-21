require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { ZodError } = require('zod');
const { connect } = require('./config/db');
const { HttpError } = require('./utils/helpers');
const { initializeDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 5001;

// Render (and most PaaS hosts) terminate TLS at a proxy in front of us, so the
// request that reaches Express is always plain HTTP even when the site is
// https. Without this, req.protocol reports "http" and any URL we build from
// it (e.g. uploaded image URLs) gets blocked by the browser as mixed content
// on the https page.
app.set('trust proxy', 1);

const corsOrigins = [process.env.CLIENT_URL, 'https://rnibotmodel-1.onrender.com', 'http://localhost:5173'].filter(Boolean);
app.use(cors({ origin: (origin, cb) => {
  if (!origin || corsOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Not allowed by CORS'));
}, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', async (_req, res) => {
  try {
    const mongoose = require('mongoose');
    const state = mongoose.connection.readyState;
    res.json({ status: state === 1 ? 'ok' : 'degraded', db: state === 1 ? 'connected' : 'unreachable' });
  } catch (e) {
    res.status(503).json({ status: 'degraded', db: 'unreachable', error: e.message });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/properties', require('./routes/property.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/services', require('./routes/service.routes'));
app.use('/api/leads', require('./routes/lead.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/agent', require('./routes/agent.routes'));
app.use('/api/builder', require('./routes/builder.routes'));
app.use('/api/service-provider', require('./routes/service-provider.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
app.use('/api/bots', require('./routes/bot.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) fields[issue.path.join('.')] = issue.message;
    return res.status(422).json({ message: err.issues[0]?.message || 'Please check the form', fields });
  }
  const status = err.status || 500;
  if (status >= 500 && !(err instanceof HttpError)) console.error(err);
  res.status(status).json({ message: err.message || 'Something went wrong' });
});

async function start() {
  try {
    await connect();
    console.log('→ MongoDB connected');
  } catch (e) {
    console.error('✖ database unreachable:', e.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n  API ready  →  http://localhost:${PORT}/api`);
    console.log(`  Health     →  http://localhost:${PORT}/api/health\n`);
  });
}

start();




