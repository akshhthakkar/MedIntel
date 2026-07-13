const router = require('express').Router();
const reportsController = require('../controllers/reports.controller');
const auth = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/security.middleware');

router.post('/upload', auth, uploadLimiter, upload.single('report'), reportsController.upload);
router.get('/', auth, reportsController.getAll);
router.get('/trends', auth, reportsController.getTrends);
router.get('/compare/:id1/:id2', auth, reportsController.compare);
router.get('/:id', auth, reportsController.getOne);
router.put('/:id', auth, reportsController.update);
router.delete('/:id', auth, reportsController.delete);

module.exports = router;
