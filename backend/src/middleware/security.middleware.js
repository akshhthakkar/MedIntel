const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const helmet = require('helmet');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : 100,
  message: { success: false, error: 'Too many requests. Try again later.' }
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 20,
  message: { success: false, error: 'Too many upload requests. Try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 10,
  message: { success: false, error: 'Too many auth attempts. Try again later.' }
});

module.exports = {
  generalLimiter,
  uploadLimiter,
  authLimiter,
  mongoSanitize,
  xss,
  helmet
};
