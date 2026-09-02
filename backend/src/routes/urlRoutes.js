const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const authenticate = require('../middleware/authMiddleware');

// All URL management routes are protected
router.use(authenticate);

router.get('/', urlController.getUrls);
router.post('/', urlController.createUrl);
router.post('/import', urlController.importUrls);
router.get('/:id', urlController.getUrlById);
router.delete('/:id', urlController.deleteUrl);
router.post('/:id/check', urlController.manualCheck);
router.get('/:id/history', urlController.getUrlHistory);

module.exports = router;
