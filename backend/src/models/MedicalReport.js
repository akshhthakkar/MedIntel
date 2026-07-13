const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
  parameter: String,
  testName: String,
  value: String,
  unit: String,
  normalRange: String,
  status: {
    type: String,
    enum: ['Normal', 'Borderline', 'Abnormal', 'normal', 'high', 'low', 'critical'],
    default: 'Normal'
  },
  explanation: { type: String, default: '' },
  symptoms: { type: [String], default: [] },
  remedies: { type: [String], default: [] }
}, { _id: false });

const MedicalReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['blood_test', 'urine_test', 'x_ray', 'mri', 'ct_scan', 'ecg',
           'prescription', 'discharge_summary', 'CBC', 'LFT', 'Lipid Panel',
           'Kidney Function Test', 'Thyroid Profile', 'Diabetes Panel', 'other'],
    default: 'other'
  },
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  hospital: {
    name: String,
    location: String
  },
  doctor: {
    name: String,
    specialization: String
  },
  originalFile: {
    filename: String,
    path: String,
    publicId: String,
    mimetype: String,
    size: Number
  },
  fileType: {
    type: String,
    enum: ['pdf', 'image']
  },
  extractedText: String,
  rawText: String,
  language: {
    type: String,
    default: 'English'
  },
  extractedData: {
    testResults: [TestResultSchema],
    diagnoses: [String],
    medications: [{
      name: String,
      genericName: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    observations: [String],
    recommendations: [String],
    
    // Imaging fields
    bodyRegion: String,
    findings: [String],
    impression: [String],
    abnormalities: [String],
    
    // ECG fields
    heartRate: String,
    rhythm: String,
    prInterval: String,
    qrsDuration: String,
    qtInterval: String,
    qtcInterval: String,
    
    // Discharge summary fields
    procedures: [String],
    followUpInstructions: [String],
    carePlan: String
  },
  aiAnalysis: {
    simplifiedExplanation: String,
    keyFindings: [String],
    concerningValues: [String],
    positiveIndicators: [String],
    suggestedPrecautions: [String],
    overallSummary: String,
    urgencyLevel: {
      type: String,
      enum: ['routine', 'soon', 'urgent'],
      default: 'routine'
    },
    language: { type: String, default: 'English' },
    generatedAt: Date
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed'],
    default: 'done'
  },
  tags: [String],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

MedicalReportSchema.index({ user: 1, date: -1 });
MedicalReportSchema.index({ user: 1, reportType: 1 });

module.exports = mongoose.model('MedicalReport', MedicalReportSchema);
