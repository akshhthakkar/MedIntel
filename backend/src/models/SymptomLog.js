const mongoose = require('mongoose');

const SymptomLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  symptom: String,
  symptoms: [{
    name: String,
    severity: {
      type: Number,
      min: 1,
      max: 10
    },
    duration: String,
    notes: String
  }],
  severity: {
    type: Number,
    min: 1,
    max: 10
  },
  painLevel: {
    type: Number,
    min: 0,
    max: 10
  },
  mood: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'very_poor']
  },
  energyLevel: {
    type: Number,
    min: 0,
    max: 10
  },
  sleepQuality: {
    hours: Number,
    quality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    }
  },
  appetite: {
    type: String,
    enum: ['normal', 'increased', 'decreased', 'none']
  },
  vitalSigns: {
    temperature: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    heartRate: Number,
    respiratoryRate: Number,
    oxygenSaturation: Number
  },
  medicationsTaken: [{
    medication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication'
    },
    time: Date
  }],
  notes: String,
  correlatedMedications: [{
    medication: String,
    possibleSideEffect: String,
    confidence: String
  }],
  aiInsights: {
    patterns: [String],
    recommendations: [String],
    urgencyLevel: String,
    generatedAt: Date
  },
  loggedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

SymptomLogSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('SymptomLog', SymptomLogSchema);
