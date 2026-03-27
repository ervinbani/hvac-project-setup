const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const tenantRoutes = require('./routes/tenant.routes');
const usersRoutes = require('./routes/users.routes');
const customersRoutes = require('./routes/customers.routes');
const servicesRoutes = require('./routes/services.routes');
const jobsRoutes = require('./routes/jobs.routes');
const recurringRulesRoutes = require('./routes/recurringRules.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const messagesRoutes = require('./routes/messages.routes');
const automationsRoutes = require('./routes/automations.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// HIGH-3: Restrict CORS to known origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// Limit request body size
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

if (process.env.NODE_ENV !== 'test') {
  // LOW-1: skip logging query strings to avoid leaking filter values
  app.use(morgan(':method :url :status :response-time ms'));
}

// HIGH-4: Rate limit auth endpoints (login + register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// CRIT-2: Stricter limit on registration to slow abuse
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many registration attempts, please try again later.' },
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
});

if (process.env.NODE_ENV !== 'test') {
  app.use('/api/', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', registerLimiter);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'Brillo API' } });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/recurring', recurringRulesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// LOW-2: Don't reflect the raw URL back
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
