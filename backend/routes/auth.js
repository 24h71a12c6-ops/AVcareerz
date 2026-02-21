const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Step 1 - Initial Registration
router.post('/register-step1', authController.registerStep1);

// Step 2 - Complete Registration
router.post('/register-step2/:userId', authController.registerStep2);

// Get user details
router.get('/user/:userId', authController.getUser);

module.exports = router;
