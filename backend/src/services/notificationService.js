'use strict';

const axios = require('axios');
const Notification = require('../models/Notification');

// ── OneSignal config ─────────────────────────────────────
const OS_APP_ID = process.env.ONESIGNAL_APP_ID;
const OS_API_KEY = process.env.ONESIGNAL_API_KEY;
const OS_BASE = 'https://onesignal.com/api/v1';
const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

if (!OS_APP_ID || !OS_API_KEY) {
  console.warn(
    '[OneSignal] WARNING: ONESIGNAL_APP_ID or ' +
    'ONESIGNAL_API_KEY not set in backend/.env. ' +
    'Notifications will be disabled.'
  );
}

// ── Core send function ───────────────────────────────────
/**
 * Send a notification to a single user via OneSignal.
 * Uses external_id (set to MongoDB userId) to target user.
 * 
 * @param {string} userId - MongoDB user _id string
 * @param {string} heading - Notification title
 * @param {string} message - Notification body text
 * @param {object} data - Extra data payload (optional)
 * @param {string} url - Click URL (optional)
 */
async function sendNotification(userId, heading, message, data = {}, url = null) {
  if (!OS_APP_ID || !OS_API_KEY) {
    console.warn('[OneSignal] Skipping — keys not configured');
    return null;
  }

  // 1. Save to MongoDB first
  try {
    await Notification.create({
      user:    userId,
      type:    data.type || 'report_ready',
      heading,
      message,
      url:     url || null,
      data,
      read:    false
    });
  } catch (dbErr) {
    console.error('[Notification] DB save failed:', dbErr.message);
  }

  // 2. Send push via OneSignal
  try {
    const payload = {
      app_id: OS_APP_ID,
      headings: { en: heading },
      contents: { en: message },
      include_aliases: {
        external_id: [userId.toString()]
      },
      target_channel: 'push',
      data: {
        userId: userId.toString(),
        appUrl: APP_URL,
        ...data
      },
      ...(url && { url })
    };

    const response = await axios.post(
      `${OS_BASE}/notifications`,
      payload,
      {
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Basic ${OS_API_KEY}`
        }
      }
    );

    console.log(
      `[OneSignal] ✅ Sent "${heading}" to user ${userId}` +
      ` — notification id: ${response.data.id}`
    );

    return response.data;

  } catch (err) {
    const errData = err.response?.data;
    if (errData?.errors?.includes('All included players are not subscribed')) {
      console.warn(
        `[OneSignal] User ${userId} not subscribed yet — notification skipped`
      );
      return null;
    }
    console.error(
      '[OneSignal] ❌ Failed to send notification:',
      errData || err.message
    );
    return null;
  }
}

// ── Notification functions (1 per notification type) ─────

/**
 * Sent after a report finishes AI analysis.
 */
async function sendReportReadyNotification(
  userId, email, reportId, reportType, abnormalCount
) {
  const heading = '📋 Your report is ready';
  const message = abnormalCount > 0
    ? `${reportType} analysed — ${abnormalCount} value${abnormalCount > 1 ? 's' : ''} need attention`
    : `${reportType} analysed — all values look normal`;

  return sendNotification(
    userId,
    heading,
    message,
    { type: 'report_ready', reportId: reportId.toString(), reportType },
    `${APP_URL}/reports/${reportId}`
  );
}

/**
 * Sent once per abnormal test result found in a report.
 */
async function sendAbnormalResultNotification(
  userId, email, testName, value, reportId
) {
  return sendNotification(
    userId,
    '⚠️ Abnormal result detected',
    `${testName}: ${value} is outside the normal range`,
    { type: 'abnormal_result', reportId: reportId.toString(), testName },
    `${APP_URL}/reports/${reportId}`
  );
}

/**
 * Sent when a medication reminder time fires.
 */
async function sendMedicationReminder(
  userId, email, medicationName, dosage, unit, timing
) {
  return sendNotification(
    userId,
    '💊 Medication reminder',
    `Time to take ${medicationName} — ${dosage}${unit} ${timing || ''}`.trim(),
    { type: 'medication_reminder', medicationName },
    `${APP_URL}/medications`
  );
}

/**
 * Sent 1 hour after a reminder if the medication was not
 * marked as taken.
 */
async function sendMedicationMissed(
  userId, email, medicationName
) {
  return sendNotification(
    userId,
    '⏰ Missed medication',
    `You missed your ${medicationName} dose`,
    { type: 'medication_missed', medicationName },
    `${APP_URL}/medications`
  );
}

/**
 * Sent on the daily check-in reminder schedule.
 */
async function sendDailyCheckInReminder(userId, email, userName) {
  return sendNotification(
    userId,
    '👋 Daily health check-in',
    `Hi ${userName || 'there'} — how are you feeling today?`,
    { type: 'daily_checkin' },
    `${APP_URL}/symptoms`
  );
}

/**
 * Sent as a weekly email summary (via SendGrid, not OneSignal).
 * OneSignal doesn't replace email — keep using SendGrid for this.
 * This function is kept as a stub so schedulerService.js
 * doesn't break. The actual email is sent by sendEmail().
 */
async function sendWeeklyHealthSummary(userId, email, userName, summaryData) {
  // Weekly summary is email-only — handled by SendGrid in schedulerService.js
  // OneSignal sends a push to prompt the user to check their email
  return sendNotification(
    userId,
    '📊 Your weekly health summary',
    'Your weekly report is ready — check your email for details',
    { type: 'weekly_summary' },
    `${APP_URL}/dashboard`
  );
}

// ── Export ───────────────────────────────────────────────
module.exports = {
  sendNotification,
  sendReportReadyNotification,
  sendAbnormalResultNotification,
  sendMedicationReminder,
  sendMedicationMissed,
  sendDailyCheckInReminder,
  sendWeeklyHealthSummary
};
