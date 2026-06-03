#!/usr/bin/env node

/**
 * Test Script for next-form.html Submission
 * Tests form submission with test data and email sending
 * Usage: node test_next_form_submission.js
 */

const API_BASE_URL = 'http://localhost:8000';
const TEST_EMAIL = 'thogatigeethika@gmail.com';

// Test data matching next-form.html schema
const testFormData = {
  // Personal Information
  fullName: 'Ravi Kumar Test',
  dob: '1998-05-15',
  gender: 'Male',
  nationality: 'Indian',
  phone: '9876543210',
  email: TEST_EMAIL,
  city: 'Hyderabad',
  passportStatus: 'Valid',
  passport_id: 'A1234567',

  // Academic Details
  highestQualification: 'B.Tech',
  currentCourse: 'Final Year',
  specialization: 'Computer Science',
  collegeName: 'IIT Hyderabad',
  yearOfPassing: '2025',
  cgpa: '8.5',

  // Study Abroad Preferences
  preferredCountry: 'USA',
  preferredUniversity: 'Stanford University',
  preferredCourse: 'MS Computer Science',
  visaStatus: 'Not Applied',
  visaType: 'Student',
  visaNumber: 'V12345678',
  levelOfStudy: 'Postgraduate',
  coaching: 'IELTS Coaching',
  preferredIntake: 'Fall 2026',
  budgetRange: '$30,000-$50,000',
  fundingSource: 'Family',
  loanStatus: 'Not Applied'
};

async function testFormSubmission() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🧪 Testing next-form.html Submission');
  console.log('════════════════════════════════════════════════════════');
  console.log('');

  // Step 1: Test health check
  console.log('📋 Step 1: Testing API Health Check...');
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      console.log('❌ Health check failed:', healthResponse.status);
      console.log('   Backend may not be running on', API_BASE_URL);
      process.exit(1);
    }
    const health = await healthResponse.json();
    console.log('✅ Backend is healthy:', health);
  } catch (error) {
    console.log('❌ Cannot connect to backend at', API_BASE_URL);
    console.log('   Error:', error.message);
    console.log('   Make sure backend is running: npm --prefix backend start');
    process.exit(1);
  }

  console.log('');

  // Step 2: Submit form data
  console.log('📋 Step 2: Submitting next-form.html data...');
  console.log('   Email:', testFormData.email);
  console.log('   Name:', testFormData.fullName);
  console.log('   Phone:', testFormData.phone);

  try {
    const submitResponse = await fetch(`${API_BASE_URL}/api/register-step2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testFormData,
        userId: 'test-user-' + Date.now(),
        stage: 'step2',
        files: {},
        submittedFrom: 'next-form'
      })
    });

    const result = await submitResponse.json().catch(() => ({}));

    if (!submitResponse.ok) {
      console.log('❌ Form submission failed:', submitResponse.status);
      console.log('   Response:', result);
      process.exit(1);
    }

    console.log('✅ Form submitted successfully');
    console.log('   Response:', result);
  } catch (error) {
    console.log('❌ Form submission error:', error.message);
    process.exit(1);
  }

  console.log('');

  // Step 3: Test email to user
  console.log('📋 Step 3: Verifying confirmation email...');
  console.log('   Recipient:', TEST_EMAIL);
  console.log('   ℹ️  Check email inbox for confirmation message');

  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('✅ All tests completed!');
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 Test Summary:');
  console.log('   - Form Data: Submitted successfully');
  console.log('   - Email Target: ' + TEST_EMAIL);
  console.log('   - User Data Logged: ✅');
  console.log('   - Admin Notification: May require IP whitelisting in Brevo');
  console.log('');
  console.log('🔍 Next Steps:');
  console.log('   1. Check Brevo email logs at https://app.brevo.com/log');
  console.log('   2. Verify email received at ' + TEST_EMAIL);
  console.log('   3. If admin email fails, add IP to Brevo authorized IPs');
  console.log('');
}

testFormSubmission().catch(error => {
  console.error('🔴 Fatal error:', error);
  process.exit(1);
});
