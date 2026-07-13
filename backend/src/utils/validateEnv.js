module.exports = function validateEnv() {
  // Hard required — app cannot start without these
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error(`FATAL: Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }

  // AI provider check — need at least one
  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error('FATAL: Set GROQ_API_KEY in backend/.env');
    process.exit(1);
  }

  // Warn if Groq not set (will use Gemini only)
  if (!process.env.GROQ_API_KEY) {
    console.warn('WARNING: GROQ_API_KEY not set — using Gemini only');
  } else {
    console.log('✅ AI Provider: Groq (llama-3.3-70b-versatile)');
  }

  // Optional service warnings
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    console.warn('WARNING: Cloudinary not configured — uploads will fail');
  }
  if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_API_KEY) {
    console.warn('WARNING: ONESIGNAL_APP_ID or ONESIGNAL_API_KEY not set — notifications disabled');
  }
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('WARNING: SENDGRID_API_KEY not set — emails disabled');
  }
};
