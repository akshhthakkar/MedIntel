const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email address required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email address required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email address required')
    .normalizeEmail(),
];

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', authController.logout);
router.get('/me', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);
router.delete('/profile', auth, authController.deleteProfile);
router.put('/password', auth, authController.updatePassword);

router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.put('/reset-password/:token', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
