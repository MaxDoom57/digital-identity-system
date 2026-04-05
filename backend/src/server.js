const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();

// ── Helmet with explicit CSP ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      scriptSrc:      ["'none'"],
      styleSrc:       ["'none'"],
      imgSrc:         ["'none'"],
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      baseUri:        ["'none'"],
      formAction:     ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // not needed for a pure API
}));

// ── CORS — restrict to portal origins ──────────────────────────────────────
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://172.17.25.168:3000',
      'http://172.17.25.168:3002',
      'http://172.17.25.168:3003',
    ];

app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server calls (no origin) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));

// ── Sanitize middleware ─────────────────────────────────────────────────────
app.use(require('./middleware/sanitize'));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         authLimiter, require('./routes/auth'));
app.use('/api/identity',     apiLimiter,  require('./routes/identity'));
app.use('/api/consent',      apiLimiter,  require('./routes/consent'));
app.use('/api/admin',        apiLimiter,  require('./routes/admin'));
app.use('/api/biometric',    apiLimiter,  require('./routes/biometric'));
app.use('/api/evaluation',   apiLimiter,  require('./routes/evaluation'));
app.use('/api/citizen',      apiLimiter,  require('./routes/citizen'));
app.use('/api/registration', apiLimiter,  require('./routes/registration'));
app.use('/api/orgrecords',   apiLimiter,  require('./routes/orgrecords'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ API Server running on port ${PORT}`);
});

module.exports = app;
