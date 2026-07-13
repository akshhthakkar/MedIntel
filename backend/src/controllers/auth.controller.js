const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const MedicalReport = require('../models/MedicalReport');
const Medication = require('../models/Medication');
const SymptomLog = require('../models/SymptomLog');
const { deleteFromCloudinary } = require('../middleware/upload.middleware');
const sendEmail = require('../utils/sendEmail');
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, dateOfBirth, gender, phone } = req.body;

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
    }
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      dateOfBirth,
      gender,
      phone
    });

    // No email verification required - user is verified by default

    // Send onboarding welcome email
    const onboardingSubject = 'Welcome to MedIntel - Your Health AI Companion!';
    const onboardingMessage = `Hello ${user.name},\n\nWelcome to MedIntel! We are thrilled to partner with you on your healthcare journey.\n\nHere are a few quick ways to get started:\n1. Upload your first Medical Report: Go to the Upload section to parse a blood test or prescription.\n2. Add your Medications: Set up your pill schedules under the Medications tab for automatic tracking and interaction checks.\n3. Log your Symptoms: Record how you feel daily to identify patterns and trends.\n4. Generate a Doctor Summary: When visiting your provider, print a clinical note summarizing your recent health data from the Timeline tab.\n\nWe keep all your personal health information fully secure and encrypted.\n\nTo your health,\nThe MedIntel Team`;

    const onboardingHtml = `
<div style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #eef2f6; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
    <h2 style="color: #1A3C6E; margin: 0; font-size: 26px; font-weight: 800; tracking-tight: -0.02em;">MedIntel</h2>
    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0; font-weight: 500;">Understand Today. Healthier Tomorrow.</p>
  </div>

  <div style="color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
    <p style="margin-top: 0;">Hello <strong>${user.name}</strong>,</p>
    <p>Welcome to <strong>MedIntel</strong>! We are thrilled to partner with you on your healthcare journey. Our platform uses advanced clinical intelligence to translate complex laboratory sheets, radiology reports, and medical documents into plain, patient-friendly insights.</p>
    
    <p style="font-weight: 700; color: #1e293b; margin-top: 24px; margin-bottom: 12px;">Here is how to get started with your companion dashboard:</p>
    
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9; margin-bottom: 24px;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 8px; line-height: 1;">📄</span>
        <strong style="color: #0f172a; font-size: 14px;">Upload & Analyze Reports</strong>
        <div style="color: #64748b; font-size: 12px; margin-top: 2px; margin-left: 28px;">Upload blood counts, lipids, urine tests, or radiology scans to generate instant plain-language summaries and abnormal parameter indicators.</div>
      </div>
      <div style="margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 8px; line-height: 1;">💊</span>
        <strong style="color: #0f172a; font-size: 14px;">Track Daily Medications</strong>
        <div style="color: #64748b; font-size: 12px; margin-top: 2px; margin-left: 28px;">Input your medication schedule. Our clinical rules engine checks for potential interactions and flags overlapping prescriptions.</div>
      </div>
      <div style="margin-bottom: 16px;">
        <span style="font-size: 18px; margin-right: 8px; line-height: 1;">🩺</span>
        <strong style="color: #0f172a; font-size: 14px;">Log Health Symptoms</strong>
        <div style="color: #64748b; font-size: 12px; margin-top: 2px; margin-left: 28px;">Keep a daily record of how you feel to identify trends and see correlations in your vitals over time.</div>
      </div>
      <div>
        <span style="font-size: 18px; margin-right: 8px; line-height: 1;">🗒️</span>
        <strong style="color: #0f172a; font-size: 14px;">Generate Clinical Summaries</strong>
        <div style="color: #64748b; font-size: 12px; margin-top: 2px; margin-left: 28px;">Export structured summary reports of your symptoms and vitals to share directly with your physician during visits.</div>
      </div>
    </div>

    <p style="font-size: 13px; color: #64748b; background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
      🔒 <strong>Data Security & Privacy:</strong> We hold all your medical records and clinical details strictly encrypted, secure, and private. Your data belongs to you.
    </p>
  </div>

  <div style="text-align: center; margin-bottom: 30px;">
    <a href="https://med-intell.vercel.app/login" style="background-color: #1A3C6E; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(26, 60, 110, 0.1), 0 2px 4px -1px rgba(26, 60, 110, 0.06);">Access Your Dashboard</a>
  </div>

  <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
    <p style="margin: 0;">To your health,</p>
    <p style="font-weight: 700; color: #475569; margin: 4px 0 0 0;">The MedIntel Team</p>
  </div>
</div>
`;

    try {
      await sendEmail({
        email: user.email,
        subject: onboardingSubject,
        message: onboardingMessage,
        html: onboardingHtml
      });
    } catch (err) {
      console.error('Onboarding email send failed:', err);
    }

    const token = generateToken(user._id);

    // Register user with OneSignal
    try {
      const axios = require('axios');
      await axios.post(
        `https://onesignal.com/api/v1/apps/${process.env.ONESIGNAL_APP_ID}/users`,
        {
          identity: {
            external_id: user._id.toString()
          },
          properties: {
            tags: {
              email: user.email,
              name: user.name,
              language: user.language || 'English'
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
          }
        }
      );
      console.log(`[OneSignal] User ${user._id} registered (Signup)`);
    } catch (osErr) {
      console.warn('[OneSignal] User signup registration failed:', osErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to MedIntel!',
      data: { user, token }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if user is locked out
    if (user.isLocked) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        error: `Account is temporarily locked due to excessive failed attempts. Please try again in ${remainingMinutes} minutes.`
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
        await user.save({ validateBeforeSave: false });
        return res.status(403).json({
          success: false,
          error: 'Maximum login attempts exceeded. Account locked for 15 minutes.'
        });
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    // Update user identity with OneSignal
    try {
      const axios = require('axios');
      await axios.post(
        `https://onesignal.com/api/v1/apps/${process.env.ONESIGNAL_APP_ID}/users`,
        {
          identity: {
            external_id: user._id.toString()
          },
          properties: {
            tags: {
              email: user.email,
              name: user.name,
              language: user.language || 'English'
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
          }
        }
      );
      console.log(`[OneSignal] User ${user._id} identified (Login)`);
    } catch (osErr) {
      console.warn('[OneSignal] User login registration failed:', osErr.message);
    }

    res.json({
      success: true,
      data: { user, token }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
};

const { rescheduleUserCheckIn } = require('../services/schedulerService');

exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'name', 'phone', 'dateOfBirth', 'gender', 'bloodGroup',
      'allergies', 'chronicConditions', 'healthConditions',
      'emergencyContact', 'preferredLanguage', 'notificationPreferences'
    ];
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        // Mongoose enum validation fails if you pass "" for an enum.
        // If gender/bloodGroup is an empty string, we should unset it instead.
        if ((key === 'gender' || key === 'bloodGroup') && req.body[key] === '') {
          updates[key] = undefined; // This will unset or ignore the empty string
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    // Reschedule check-in if notification preferences changed
    if (req.body.notificationPreferences) {
      rescheduleUserCheckIn(user);
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update profile' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Please provide both current and new password' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, error: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find all medical reports for this user
    const reports = await MedicalReport.find({ user: userId });

    // 2. Delete all associated Cloudinary files
    for (const report of reports) {
      if (report.originalFile && report.originalFile.publicId) {
        try {
          await deleteFromCloudinary(report.originalFile.publicId);
        } catch (err) {
          console.error(`Failed to delete Cloudinary file ${report.originalFile.publicId}:`, err.message);
        }
      }
    }

    // 3. Delete all reports, medications, and symptoms from MongoDB
    await MedicalReport.deleteMany({ user: userId });
    await Medication.deleteMany({ user: userId });
    await SymptomLog.deleteMany({ user: userId });

    // 4. Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account and all associated data permanently deleted' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, error: 'There is no user with that email' });
    }

    const resetToken = user.getResetPasswordToken();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save({ validateBeforeSave: false });

    // In a real app with a frontend deployed separately, we'd use the frontend URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the link to reset your password:\n\n${resetUrl}`;

    console.log(`\n🔑 [PASSWORD RESET URL] (For Dev/Testing): ${resetUrl}\n`);

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token - MedIntel',
        message
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, error: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    if (!req.body.password || req.body.password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: { user, token }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    // Get hashed token
    const verificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      verificationToken
    });

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid verification token' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // Since this might be clicked from an email client, redirecting to frontend is better
    // but building an API first
    res.status(200).json({
      success: true,
      message: 'Email successfully verified'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};
