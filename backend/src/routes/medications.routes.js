const router = require('express').Router();
const medsController = require('../controllers/medications.controller');
const auth = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const medicationValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Medication name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('dosage')
    .notEmpty().withMessage('Dosage is required'),
  body('frequency')
    .notEmpty().withMessage('Frequency is required')
    .isIn([
      'once_daily', 'twice_daily', 'thrice_daily',
      'four_times_daily', 'every_6_hours', 'every_8_hours',
      'every_12_hours', 'as_needed', 'weekly', 'custom'
    ]).withMessage('Invalid frequency value'),
  body('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid date'),
];

router.post('/', auth, medicationValidation, validate, medsController.create);
router.get('/', auth, medsController.getAll);
router.get('/active', auth, medsController.getActive);
router.get('/schedule', auth, medsController.getSchedule);
router.get('/interactions/check', auth, medsController.checkInteractions);
router.get('/:id', auth, medsController.getOne);
router.put('/:id', auth, medsController.update);
router.post('/:id/log', auth, medsController.logAdherence);
router.post('/:id/taken', auth, medsController.logAdherence);
router.delete('/:id', auth, medsController.delete);

module.exports = router;
