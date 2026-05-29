#!/usr/bin/env node
// Simple test script to trigger admin notification emails so you can verify
// the admin inbox (including info@avcareerz.com) receives them.
require('dotenv').config();
const { sendAdminEmail, sendLeadNotificationEmail } = require('./services/emailService');

async function run() {
  try {
    console.log('Running admin email test...');

    const dummyUser = {
      fullName: 'Test User',
      email: 'test.user+notify@example.com',
      phone: '+919999999999',
      message: 'This is a test notification from send_test_admin_email.js'
    };

    // 1) Send lead notification (admin inbox)
    console.log('Sending lead notification...');
    await sendLeadNotificationEmail({ name: dummyUser.fullName, email: dummyUser.email, phone: dummyUser.phone, message: dummyUser.message, subject: 'TEST: New Lead Notification' });
    console.log('Lead notification attempted (check backend logs and admin inbox).');

    // 2) Send full admin email (detailed submission)
    console.log('Sending admin summary email...');
    await sendAdminEmail(dummyUser, 'TEST: Full Admin Submission');
    console.log('Admin email attempted (check backend logs and admin inbox).');

    console.log('Done. If emails were accepted by Brevo, check the admin inbox (including info@avcareerz.com) and the Brevo dashboard for delivery/bounce details.');
  } catch (err) {
    console.error('Test email error:', err && err.response ? err.response.data || err.response : err);
    process.exitCode = 2;
  }
}

run();
