require('dotenv').config();
require('./src/utils/validateEnv')(); // Validate required environment variables on startup

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { generalLimiter, mongoSanitize, xss, helmet } = require('./src/middleware/security.middleware');
const schedulerService = require('./src/services/schedulerService');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const medicationsRoutes = require('./src/routes/medications.routes');
const symptomsRoutes = require('./src/routes/symptoms.routes');
const timelineRoutes = require('./src/routes/timeline.routes');
const aiRoutes = require('./src/routes/ai.routes');

const app = express();

// Security Middleware
app.use(helmet());
app.use(xss());
app.use(mongoSanitize());

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://med-intell.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow exact matches
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any *.vercel.app subdomain (preview deployments)
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    // Allow any *.onrender.com subdomain
    if (/^https:\/\/.*\.onrender\.com$/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiter to all API routes
app.use('/api', generalLimiter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/symptoms', symptomsRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/ai', aiRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : message
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    
    // Initialize node-cron schedulers for active medications
    await schedulerService.initializeAllSchedulers();

    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
