const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: true
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  phone: String,
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  allergies: [String],
  chronicConditions: [String],
  healthConditions: [String],
  preferredLanguage: {
    type: String,
    enum: ['English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu',
           'Spanish', 'French', 'Arabic', 'Bengali', 'Urdu', 'German', 'Mandarin'],
    default: 'English'
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    medicationReminders: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },

    // Daily check-in reminder
    dailyCheckIn:        { type: Boolean, default: false },
    checkInTime:         { type: String,  default: '09:00' },

    // Weekly health summary
    weeklySummary:       { type: Boolean, default: true },
    weeklySummaryDay:    {
      type:    String,
      enum:    ['sunday','monday','tuesday','wednesday',
                'thursday','friday','saturday'],
      default: 'sunday'
    }
  },
  role: {
    type: String,
    enum: ['patient', 'admin'],
    default: 'patient'
  },
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate and hash password reset token
UserSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire to 10 minutes from now
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Generate verification token
UserSchema.methods.getVerificationToken = function() {
  const token = crypto.randomBytes(20).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
    
  return token;
};

UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Strip secure fields from JSON output
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
