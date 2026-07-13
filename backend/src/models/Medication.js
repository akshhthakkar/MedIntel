const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Medication name is required'],
    trim: true
  },
  genericName: String,
  dosage: {
    type: String,
    required: [true, 'Dosage is required']
  },
  unit: {
    type: String,
    enum: ['mg', 'ml', 'mcg', 'IU', 'tablet', 'capsule'],
    default: 'mg'
  },
  frequency: {
    type: String,
    enum: ['once_daily', 'twice_daily', 'thrice_daily', 'four_times_daily',
           'every_6_hours', 'every_8_hours', 'every_12_hours',
           'as_needed', 'weekly', 'custom'],
    required: true
  },
  timing: {
    type: String,
    enum: ['before_food', 'after_food', 'with_food', 'empty_stomach', 'anytime'],
    default: 'anytime'
  },
  customSchedule: [{
    time: String,
    label: String
  }],
  reminderTimes: [String],
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: Date,
  prescribedBy: {
    name: String,
    specialization: String
  },
  prescriptionReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalReport'
  },
  sideEffects: [String],
  warnings: [String],
  notes: String,
  interactions: [{
    medication: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    description: String
  }],
  reminderSettings: {
    enabled: { type: Boolean, default: true },
    reminderTimes: [String],
    notifyBefore: { type: Number, default: 15 }
  },
  adherenceLogs: [{
    scheduledTime: Date,
    takenTime: Date,
    date: Date,
    taken: Boolean,
    takenAt: Date,
    status: {
      type: String,
      enum: ['taken', 'missed', 'skipped', 'postponed'],
      default: 'taken'
    },
    notes: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

MedicationSchema.index({ user: 1, isActive: 1 });
MedicationSchema.index({ user: 1, startDate: -1 });

module.exports = mongoose.model('Medication', MedicationSchema);
