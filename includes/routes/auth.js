const express = require('express');
const { healthCheck, register, forgotPassword } = require('../controllers/authController');

const router = express.Router();

router.get('/health', healthCheck);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);

module.exports = router;
