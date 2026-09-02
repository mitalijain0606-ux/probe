const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

module.exports = router;
