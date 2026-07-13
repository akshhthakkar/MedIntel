const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'report_ready',
      'abnormal_result',
      'medication_reminder',
      'medication_missed',
      'daily_checkin',
      'weekly_summary'
    ],
    required: true
  },
  heading: { type: String, required: true },
  message: { type: String, required: true },
  url: { type: String, default: null },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
