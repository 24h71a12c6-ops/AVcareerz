const User = require('../models/User');
// const { sendAdminWhatsApp, sendUserWhatsApp } = require('../services/whatsappService');
const { sendConfirmationEmail, sendAdminEmail } = require('../services/emailService');

// Step 1 - Initial Registration
const registerStep1 = async (req, res) => {
  try {
    const { fullName, email, phone, country } = req.body;

    // Validation
    if (!fullName || !email || !phone || !country) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const newUser = await User.create({
      fullName,
      email,
      phone,
      country
    });

    // Send admin notification email instead of WhatsApp
    const adminMessage = {
      fullName,
      email,
      phone,
      country
    };
    await sendAdminEmail(adminMessage);

    res.status(201).json({
      message: 'Step 1 registered successfully',
      userId: newUser.id,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

// Step 2 - Complete Registration
const registerStep2 = async (req, res) => {
  try {
    const { userId } = req.params;
    const { qualification, preferredCountry, budget, workExperience } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user with step 2 details
    const success = await User.update(userId, {
      qualification,
      preferredCountry,
      budget,
      workExperience
    });

    if (!success) {
      throw new Error('Failed to update user details in database');
    }

    // Fetch updated user for notifications
    const updatedUser = await User.findById(userId);

    // Send admin notification email instead of WhatsApp
    const adminCompleteMessage = {
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      country: updatedUser.country,
      qualification: updatedUser.qualification,
      preferredCountry: updatedUser.preferred_country,
      budget: updatedUser.budget,
      workExperience: updatedUser.work_experience
    };
    await sendAdminEmail(adminCompleteMessage);

    // Send confirmation email to user
    await sendConfirmationEmail(updatedUser.email, updatedUser.full_name);

    // Send confirmation email
    await sendConfirmationEmail(updatedUser.email, updatedUser.full_name);

    // Send admin notification email
    // Mapping MySQL row keys to expected object keys for email service if needed,
    // assuming email service expects camelCase keys similar to old model
    const emailUserObj = {
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      country: updatedUser.country,
      qualification: updatedUser.qualification,
      preferredCountry: updatedUser.preferred_country,
      budget: updatedUser.budget,
      workExperience: updatedUser.work_experience
    };
    await sendAdminEmail(emailUserObj);

    res.json({
      message: 'Registration completed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration update failed', details: error.message });
  }
};

// Get user details
const getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

module.exports = {
  registerStep1,
  registerStep2,
  getUser
};
