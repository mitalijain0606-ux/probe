const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/stats', dashboardController.getStats);

module.exports = router;
