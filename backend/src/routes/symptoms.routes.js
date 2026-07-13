const router = require('express').Router();
const symptomsController = require('../controllers/symptoms.controller');
const auth = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');

const symptomValidation = [
  body('symptoms')
    .optional()
    .isArray({ min: 1 }).withMessage('At least one symptom is required if provided'),
  body('painLevel')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('Pain level must be 0-10'),
  body('mood')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor', 'very_poor'])
    .withMessage('Invalid mood value'),
];

router.post('/', auth, symptomValidation, validate, symptomsController.create);
router.get('/', auth, symptomsController.getAll);
router.get('/trends/pain', auth, symptomsController.getPainTrends);
router.get('/trends/mood', auth, symptomsController.getMoodTrends);
router.get('/:id', auth, symptomsController.getOne);
router.put('/:id', auth, symptomsController.update);
router.delete('/:id', auth, symptomsController.delete);

module.exports = router;
